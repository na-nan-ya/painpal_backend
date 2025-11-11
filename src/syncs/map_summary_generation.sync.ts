import { actions, Sync } from "@engine";
import { MapSummaryGeneration, Requesting, UserAuthentication } from "@concepts";

/**
 * Note: _getSummary and _getUserSummaries are query methods (starting with `_`)
 * that are included in passthrough routes, meaning they are exposed directly
 * via the Requesting concept's passthrough mechanism, not through syncs.
 * 
 * Query methods (starting with `_`) are NOT instrumented as actions and
 * cannot be used in sync `then: actions()` clauses. They can only be used
 * with `frames.query()` in `where` clauses for internal queries.
 * 
 * Since these methods are in the passthrough inclusions list, they are
 * handled directly by the Requesting concept and do not need sync handlers.
 */
