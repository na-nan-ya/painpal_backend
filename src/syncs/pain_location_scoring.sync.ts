import { actions, Sync } from "@engine";
import { PainLocationScoring, Requesting, UserAuthentication } from "@concepts";

/**
 * Catches an incoming request to add a region to a map, validates the session,
 * and triggers the addRegion action.
 * 
 * Note: This sync is used when PainLocationScoring.addRegion is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleAddRegionRequest: Sync = (
  { request, session, user, sessionState, map, regionName },
) => ({
  when: actions(
    [Requesting.request, { path: "/region/add", session }, { request }],
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
    // Note: map and regionName should be extracted from request.body in the Requesting concept
  },
  then: actions(
    [PainLocationScoring.addRegion, { user, map, regionName }],
  ),
});

/**
 * When addRegion is successful, this sync responds to the original request with the region ID.
 */
export const HandleAddRegionResponse: Sync = ({ request, region }) => ({
  when: actions(
    [Requesting.request, { path: "/region/add" }, { request }],
    [PainLocationScoring.addRegion, {}, { region }],
  ),
  then: actions(
    [Requesting.respond, { request, region }],
  ),
});

/**
 * If addRegion fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleAddRegionErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/region/add" }, { request }],
    [PainLocationScoring.addRegion, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to score a region, validates the session,
 * and triggers the scoreRegion action.
 * 
 * Note: This sync is used when PainLocationScoring.scoreRegion is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleScoreRegionRequest: Sync = (
  { request, session, user, sessionState, region, score },
) => ({
  when: actions(
    [Requesting.request, { path: "/region/score", session }, { request }],
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
    // Note: region and score should be extracted from request.body in the Requesting concept
  },
  then: actions(
    [PainLocationScoring.scoreRegion, { user, region, score }],
  ),
});

/**
 * When scoreRegion is successful, this sync responds to the original request.
 */
export const HandleScoreRegionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/region/score" }, { request }],
    [PainLocationScoring.scoreRegion, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, result: {} }],
  ),
});

/**
 * If scoreRegion fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleScoreRegionErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/region/score" }, { request }],
    [PainLocationScoring.scoreRegion, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to delete a region, validates the session,
 * and triggers the deleteRegion action.
 * 
 * Note: This sync is used when PainLocationScoring.deleteRegion is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleDeleteRegionRequest: Sync = (
  { request, session, user, sessionState, region },
) => ({
  when: actions(
    [Requesting.request, { path: "/region/delete", session }, { request }],
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
    // Note: region should be extracted from request.body in the Requesting concept
  },
  then: actions(
    [PainLocationScoring.deleteRegion, { user, region }],
  ),
});

/**
 * When deleteRegion is successful, this sync responds to the original request.
 */
export const HandleDeleteRegionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/region/delete" }, { request }],
    [PainLocationScoring.deleteRegion, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, result: {} }],
  ),
});

/**
 * If deleteRegion fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleDeleteRegionErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/region/delete" }, { request }],
    [PainLocationScoring.deleteRegion, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Note: _getRegion and _getRegionsForMap are query methods (starting with `_`)
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
