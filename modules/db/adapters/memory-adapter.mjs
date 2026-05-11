/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory adapter for the db module.
 * @sidecar memory-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx db
 * @public false
 * @edit careful
 */

/**
 * In-memory database adapter.
 * Implements DatabasePort using a simple Map-backed table store.
 * Useful for testing and prototyping — no external dependencies.
 *
 * Supports a minimal SQL subset:
 *   - CREATE TABLE IF NOT EXISTS <table> (<col> <type>, ...)
 *   - INSERT INTO <table> (<cols>) VALUES (<vals>)
 *   - SELECT <cols|*> FROM <table> [WHERE <col> = ?] [ORDER BY <col> ASC|DESC] [LIMIT n]
 *   - UPDATE <table> SET <col> = ? [WHERE <col> = ?]
 *   - DELETE FROM <table> [WHERE <col> = ?]
 *
 * @returns {import('../ports/database-port.mjs').DatabasePort}
 */
export function createMemoryDatabaseAdapter() {
  /** @type {Map<string, { columns: string[], rows: Array<Record<string, unknown>> }>} */
  const tables = new Map();

  /**
   * @param {string} sql
   * @param {unknown[]} [params]
   * @returns {import('../ports/database-port.mjs').QueryResult}
   */
  function exec(sql, params = []) {
    const trimmed = sql.trim();

    // CREATE TABLE
    const createMatch = trimmed.match(/^CREATE TABLE IF NOT EXISTS (\w+)\s*\((.+)\)$/i);
    if (createMatch) {
      const tableName = createMatch[1];
      if (!tables.has(tableName)) {
        const cols = createMatch[2].split(',').map((c) => c.trim().split(/\s+/)[0]);
        tables.set(tableName, { columns: cols, rows: [] });
      }
      return { rows: [], rowCount: 0 };
    }

    // INSERT INTO
    const insertMatch = trimmed.match(/^INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const table = tables.get(tableName);
      if (!table) return { rows: [], rowCount: 0 };
      const cols = insertMatch[2].split(',').map((c) => c.trim());
      const row = {};
      cols.forEach((col, i) => {
        row[col] = params[i] !== undefined ? params[i] : null;
      });
      table.rows.push(row);
      return { rows: [], rowCount: 1 };
    }

    // SELECT
    const selectMatch = trimmed.match(/^SELECT (.+?) FROM (\w+)(.*)$/i);
    if (selectMatch) {
      const colStr = selectMatch[1].trim();
      const tableName = selectMatch[2];
      const rest = selectMatch[3].trim();
      const table = tables.get(tableName);
      if (!table) return { rows: [], rowCount: 0 };

      let rows = [...table.rows];

      // WHERE
      const whereMatch = rest.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch) {
        const whereCol = whereMatch[1];
        const whereVal = params[0];
        rows = rows.filter((r) => r[whereCol] === whereVal);
      }

      // ORDER BY
      const orderMatch = rest.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
      if (orderMatch) {
        const orderCol = orderMatch[1];
        const dir = (orderMatch[2] || 'ASC').toUpperCase();
        rows.sort((a, b) => {
          if (a[orderCol] < b[orderCol]) return dir === 'ASC' ? -1 : 1;
          if (a[orderCol] > b[orderCol]) return dir === 'ASC' ? 1 : -1;
          return 0;
        });
      }

      // LIMIT
      const limitMatch = rest.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        rows = rows.slice(0, parseInt(limitMatch[1], 10));
      }

      // Project columns
      if (colStr !== '*') {
        const selectedCols = colStr.split(',').map((c) => c.trim());
        rows = rows.map((r) => {
          const projected = {};
          for (const c of selectedCols) {
            projected[c] = r[c];
          }
          return projected;
        });
      }

      return { rows, rowCount: rows.length };
    }

    // UPDATE
    const updateMatch = trimmed.match(/^UPDATE (\w+)\s+SET\s+(\w+)\s*=\s*\?(.*)$/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setCol = updateMatch[2];
      const rest = updateMatch[3].trim();
      const table = tables.get(tableName);
      if (!table) return { rows: [], rowCount: 0 };

      const setVal = params[0];
      let affected = 0;

      const whereMatch = rest.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      for (const row of table.rows) {
        if (whereMatch) {
          const whereCol = whereMatch[1];
          const whereVal = params[1];
          if (row[whereCol] !== whereVal) continue;
        }
        row[setCol] = setVal;
        affected++;
      }
      return { rows: [], rowCount: affected };
    }

    // DELETE FROM
    const deleteMatch = trimmed.match(/^DELETE FROM (\w+)(.*)$/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const rest = deleteMatch[2].trim();
      const table = tables.get(tableName);
      if (!table) return { rows: [], rowCount: 0 };

      const whereMatch = rest.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch) {
        const whereCol = whereMatch[1];
        const whereVal = params[0];
        const before = table.rows.length;
        table.rows = table.rows.filter((r) => r[whereCol] !== whereVal);
        return { rows: [], rowCount: before - table.rows.length };
      }
      const count = table.rows.length;
      table.rows = [];
      return { rows: [], rowCount: count };
    }

    return { rows: [], rowCount: 0 };
  }

  return {
    query(sql, params = []) {
      return exec(sql, params);
    },

    execute(sql, params = []) {
      return exec(sql, params);
    },

    transaction(fn) {
      // Simple synchronous transaction — no rollback in memory adapter
      fn({
        query: (sql, params) => exec(sql, params),
        execute: (sql, params) => exec(sql, params),
      });
    },

    close() {
      tables.clear();
    },
  };
}
