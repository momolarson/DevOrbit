/**
 * Facts document schema. Bump SCHEMA_VERSION on any breaking change.
 * Adding fields is fine; renaming or removing them is not, because past
 * weeks' facts files outlive the code that wrote them.
 *
 * Top level:
 *   schemaVersion, generatedAt, window { since, until, label }, user { login, name }
 *   summary        headline numbers, all derived from the arrays below
 *   prs            PRs I authored, touched in the window
 *   reviewed       PRs by others I reviewed or commented on in the window
 *   comments       { given: [], received: [] } with bodies, for later classification
 *   commits        commits I authored in the window, from PRs and commit search
 *   collaborators  { reviewedMe: {login: n}, iReviewed: {login: n} }
 *   detection      the AI-assistance rule used, verbatim
 *   warnings       non-fatal problems during fetch
 */
export const SCHEMA_VERSION = 1
