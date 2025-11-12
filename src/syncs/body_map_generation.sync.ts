import { actions, Sync } from "@engine";
import { BodyMapGeneration, Requesting, UserAuthentication } from "@concepts";

/**
 * Catches an incoming request to save the current map, validates the session,
 * and triggers the saveMap action.
 * 
 * Note: This sync is used when BodyMapGeneration.saveMap is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleSaveMapRequest: Sync = (
  { request, session, user, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/map/save", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.queryAsync(
      UserAuthentication._getSession as unknown as (
        args: { session: unknown },
      ) => Promise<Array<{ session: unknown }>>,
      { session },
      { sessionState },
    );
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => {
        const sess = $[sessionState] as { active?: boolean } | undefined;
        return sess && sess.active;
      })
      .map(($) => {
        const sess = $[sessionState] as { userId: unknown } | undefined;
        return { ...$, [user]: sess?.userId };
      });
  },
  then: actions(
    [BodyMapGeneration.saveMap, { user }],
  ),
});

/**
 * When saveMap is successful, this sync responds to the original request.
 */
export const HandleSaveMapResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/map/save" }, { request }],
    [BodyMapGeneration.saveMap, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, result: {} }],
  ),
});

/**
 * If saveMap fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleSaveMapErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/map/save" }, { request }],
    [BodyMapGeneration.saveMap, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to clear the current map, validates the session,
 * and triggers the clearMap action.
 * 
 * Note: This sync is used when BodyMapGeneration.clearMap is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleClearMapRequest: Sync = (
  { request, session, user, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/map/clear", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.queryAsync(
      UserAuthentication._getSession as unknown as (
        args: { session: unknown },
      ) => Promise<Array<{ session: unknown }>>,
      { session },
      { sessionState },
    );
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => {
        const sess = $[sessionState] as { active?: boolean } | undefined;
        return sess && sess.active;
      })
      .map(($) => {
        const sess = $[sessionState] as { userId: unknown } | undefined;
        return { ...$, [user]: sess?.userId };
      });
  },
  then: actions(
    [BodyMapGeneration.clearMap, { user }],
  ),
});

/**
 * When clearMap is successful, this sync responds to the original request.
 */
export const HandleClearMapResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/map/clear" }, { request }],
    [BodyMapGeneration.clearMap, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, result: {} }],
  ),
});

/**
 * If clearMap fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleClearMapErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/map/clear" }, { request }],
    [BodyMapGeneration.clearMap, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Note: _getCurrentMap and _getSavedMaps are query methods (starting with `_`)
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
