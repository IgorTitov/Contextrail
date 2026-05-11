/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for the same-module import resolver used by capabilities-sync to follow JSDoc import-type references within a module's boundary.
 * @sidecar import-resolver.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for scripts/checks/lib/import-resolver.mjs.
 *
 * The resolver follows `import('relative/path').TypeName` references that
 * appear inside a port file's JSDoc @typedef blocks, parses the target file
 * within the same `modules/<name>/` boundary, pulls in the matching typedef
 * (transitively, capped at depth 5), and rewrites the type strings so the
 * verbose `import('...').TypeName` form collapses to the bare typedef name
 * in the merged output.
 *
 * Cross-module references and missing typedefs raise errors with clear,
 * file-anchored messages so the failure cannot be silently swallowed.
 *
 * SpecRefs: TPL-183
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveImportTypedefs } from '../../scripts/checks/lib/import-resolver.mjs';

/**
 * Build a tiny in-memory FS that the resolver reads from. Keys are POSIX
 * absolute paths; values are the file contents. Resolution rules mirror the
 * real Node behaviour for relative imports under `modules/<name>/`.
 */
function makeFs(map) {
  return {
    readFile(absPath) {
      const norm = absPath.replace(/\\/g, '/');
      if (!Object.prototype.hasOwnProperty.call(map, norm)) {
        const err = new Error(`ENOENT: no such file: ${norm}`);
        err.code = 'ENOENT';
        throw err;
      }
      return map[norm];
    },
    fileExists(absPath) {
      const norm = absPath.replace(/\\/g, '/');
      return Object.prototype.hasOwnProperty.call(map, norm);
    },
  };
}

describe('resolveImportTypedefs: single same-module import', () => {
  it('resolves a typedef referenced via import() from a sibling domain file', () => {
    const portPath = '/repo/modules/notifications/ports/notification-port.mjs';
    const domainPath = '/repo/modules/notifications/domain/notification.mjs';
    const fs = makeFs({
      [portPath]: `
        /**
         * @typedef {object} NotificationPort
         * @property {(n: import('../domain/notification.mjs').Notification) => void} show
         */
      `,
      [domainPath]: `
        /**
         * @typedef {{ id: string, message: string }} Notification
         */
      `,
    });

    const portTypedefs = {
      NotificationPort: {
        kind: 'interface',
        methods: {
          show: {
            params: [
              {
                name: 'n',
                type: "import('../domain/notification.mjs').Notification",
              },
            ],
            returns: 'void',
          },
        },
      },
    };

    const result = resolveImportTypedefs({
      portFile: portPath,
      moduleRoot: '/repo/modules/notifications',
      typedefs: portTypedefs,
      fs,
    });

    // Original port typedef survives.
    assert.ok(result.typedefs.NotificationPort);
    // Domain typedef is pulled in.
    assert.ok(result.typedefs.Notification, 'Notification typedef pulled in');
    assert.equal(result.typedefs.Notification.kind, 'record');
    // Type string was rewritten to the bare name.
    assert.equal(result.typedefs.NotificationPort.methods.show.params[0].type, 'Notification');
  });
});

describe('resolveImportTypedefs: transitive chain', () => {
  it('follows references across multiple same-module files up to depth 5', () => {
    const portPath = '/repo/modules/notifications/ports/notification-port.mjs';
    const domainPath = '/repo/modules/notifications/domain/notification.mjs';
    const levelPath = '/repo/modules/notifications/domain/level.mjs';
    const fs = makeFs({
      [portPath]: '',
      [domainPath]: `
        /**
         * @typedef {object} Notification
         * @property {string} id
         * @property {import('./level.mjs').NotificationLevel} level
         */
      `,
      [levelPath]: `
        /**
         * @typedef {'info' | 'success' | 'error'} NotificationLevel
         */
      `,
    });

    const portTypedefs = {
      NotificationPort: {
        kind: 'interface',
        methods: {
          show: {
            params: [
              {
                name: 'n',
                type: "import('../domain/notification.mjs').Notification",
              },
            ],
            returns: 'void',
          },
        },
      },
    };

    const result = resolveImportTypedefs({
      portFile: portPath,
      moduleRoot: '/repo/modules/notifications',
      typedefs: portTypedefs,
      fs,
    });

    assert.ok(result.typedefs.Notification);
    assert.ok(result.typedefs.NotificationLevel, 'transitive NotificationLevel pulled in');
    // The transitive field type should also be rewritten.
    assert.equal(result.typedefs.Notification.fields.level.type, 'NotificationLevel');
  });
});

describe('resolveImportTypedefs: cross-module import is forbidden', () => {
  it('throws a clear error when import escapes modules/<name>/', () => {
    const portPath = '/repo/modules/notifications/ports/notification-port.mjs';
    const fs = makeFs({
      [portPath]: '',
      '/repo/modules/other/domain/foo.mjs': `
        /** @typedef {{ a: number }} Foo */
      `,
    });

    const portTypedefs = {
      NotificationPort: {
        kind: 'interface',
        methods: {
          show: {
            params: [
              {
                name: 'n',
                type: "import('../../other/domain/foo.mjs').Foo",
              },
            ],
            returns: 'void',
          },
        },
      },
    };

    assert.throws(
      () =>
        resolveImportTypedefs({
          portFile: portPath,
          moduleRoot: '/repo/modules/notifications',
          typedefs: portTypedefs,
          fs,
        }),
      /cross-module|outside module boundary/i,
    );
  });
});

describe('resolveImportTypedefs: missing typedef in target file', () => {
  it('throws when the imported file exists but the typedef name is not declared', () => {
    const portPath = '/repo/modules/notifications/ports/notification-port.mjs';
    const domainPath = '/repo/modules/notifications/domain/notification.mjs';
    const fs = makeFs({
      [portPath]: '',
      [domainPath]: `
        /** @typedef {{ a: number }} SomethingElse */
      `,
    });

    const portTypedefs = {
      NotificationPort: {
        kind: 'interface',
        methods: {
          show: {
            params: [
              {
                name: 'n',
                type: "import('../domain/notification.mjs').Notification",
              },
            ],
            returns: 'void',
          },
        },
      },
    };

    assert.throws(
      () =>
        resolveImportTypedefs({
          portFile: portPath,
          moduleRoot: '/repo/modules/notifications',
          typedefs: portTypedefs,
          fs,
        }),
      /Notification.*not (?:found|declared)/i,
    );
  });
});

describe('resolveImportTypedefs: cycle and depth cap', () => {
  it('terminates on a cycle without infinite recursion', () => {
    const portPath = '/repo/modules/notifications/ports/notification-port.mjs';
    const aPath = '/repo/modules/notifications/domain/a.mjs';
    const bPath = '/repo/modules/notifications/domain/b.mjs';
    const fs = makeFs({
      [portPath]: '',
      [aPath]: `
        /**
         * @typedef {object} A
         * @property {import('./b.mjs').B} b
         */
      `,
      [bPath]: `
        /**
         * @typedef {object} B
         * @property {import('./a.mjs').A} a
         */
      `,
    });

    const portTypedefs = {
      NotificationPort: {
        kind: 'interface',
        methods: {
          show: {
            params: [{ name: 'a', type: "import('../domain/a.mjs').A" }],
            returns: 'void',
          },
        },
      },
    };

    // Should not infinite-loop. Both A and B should be pulled in once.
    const result = resolveImportTypedefs({
      portFile: portPath,
      moduleRoot: '/repo/modules/notifications',
      typedefs: portTypedefs,
      fs,
    });
    assert.ok(result.typedefs.A);
    assert.ok(result.typedefs.B);
  });
});
