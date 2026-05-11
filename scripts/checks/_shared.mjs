/* @HEADER
 * @version 0.7.97 | 2026-05-05
 * @purpose Re-export facade so existing scripts keep a single import path while actual implementations live in scripts/lib/.
 * @sidecar _shared.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// --- scripts/lib/fs-helpers.mjs ---
export {
  toPosix,
  walk,
  fileExists,
  readText,
  writeText,
  ensureWriteIfChanged,
  ROOT,
  IGNORE,
  resolveMainRepoRoot,
} from '../lib/fs-helpers.mjs';

// --- scripts/lib/cli-helpers.mjs ---
export { parseArgs } from '../lib/cli-helpers.mjs';

// --- scripts/lib/output.mjs ---
export { now, todayIsoDateUTC, result } from '../lib/output.mjs';

// --- scripts/lib/scope-helpers.mjs ---
export { resolveScope } from '../lib/scope-helpers.mjs';

// --- scripts/lib/trace-helpers.mjs ---
export { parseBddRef, collectWorkItems } from '../lib/trace-helpers.mjs';

// --- scripts/lib/repo-meta.mjs ---
export {
  repoFileIdPrefix,
  allowedFileIdPrefixes,
  repoVersion,
  headerStampVersion,
  REPO_FILEID_PREFIX,
} from '../lib/repo-meta.mjs';

// --- scripts/lib/header.mjs ---
export {
  HEADER_START,
  CHANGELOG_BEGIN,
  CHANGELOG_END,
  FILEINFO_BEGIN,
  FILEINFO_END,
  HEADER_END,
  LEGACY_HEADER_START,
  LEGACY_HEADER_END,
  CHANGELOG_SECTIONS,
  FILEINFO_FIELDS,
  EDIT_POLICY_VALUES,
  STEWARD_VALUES,
  HEX_LAYER_VALUES,
  PORT_TYPE_VALUES,
  ADAPTER_TYPE_VALUES,
  HEADER_EXEMPT_FILES,
  isHeaderExempt,
  commentStyle,
  sidecarPath,
  isSidecarHeader,
  isMeaningfulFile,
  collectRepoFiles,
  collectTrackedFiles,
  collectChangedTrackedFiles,
  changedRepoFiles,
  changedFilesSinceRef,
  shebangPrefix,
  markdownFrontmatterPrefix,
  splitCanonicalPreamble,
  structuredHeaderCountForStyle,
  legacyHeaderCountForStyle,
  removeHeaderBlocks,
  extractInlineHeader,
  hasStructuredInlineHeader,
  hasLegacyTemplateHeader,
  stripCommentSyntax,
  parseStructuredHeaderText,
  inferLayer,
  inferModulePackage,
  inferPublic,
  inferApi,
  inferHexLayer,
  inferBoundedContext,
  defaultPurpose,
  defaultHeaderData,
  renderHeaderCore,
  wrapHeader,
  renderInlineHeader,
  renderSidecarHeader,
  injectInlineHeader,
  mergeExistingSemanticData,
  validateHeader,
  // Slim header (ADR-0009)
  SLIM_HEADER_MARKER,
  SLIM_INLINE_FIELDS,
  hasSlimHeader,
  removeSlimHeaderBlocks,
  parseSlimHeader,
  renderSlimHeaderCore,
  wrapSlimHeader,
  renderSlimInlineHeader,
  injectSlimHeader,
  renderSparseSidecar,
  SIDECAR_YAML_FIELDS,
  SIDECAR_NARRATIVE_FIELDS,
  FILEINFO_TO_YAML_MAP,
  NARRATIVE_TO_YAML_MAP,
  NARRATIVE_LIST_TO_YAML_MAP,
  yamlQuote,
  parseSparseSidecar,
} from '../lib/header.mjs';
