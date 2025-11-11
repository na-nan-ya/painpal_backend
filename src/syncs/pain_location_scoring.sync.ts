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
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
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
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
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
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
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
 * Catches an incoming request to get a specific region, validates the session,
 * and triggers the _getRegion query.
 * 
 * Note: This sync is used when PainLocationScoring._getRegion is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleGetRegionRequest: Sync = (
  { request, session, user, sessionState, region },
) => ({
  when: actions(
    [Requesting.request, { path: "/region/get", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
    // Note: region should be extracted from request.body in the Requesting concept
  },
  then: actions(
    [PainLocationScoring._getRegion, { user, region }],
  ),
});

/**
 * When _getRegion is successful, this sync returns the region data
 * in response to the original request.
 */
export const HandleGetRegionResponse: Sync = ({ request, regions }) => ({
  when: actions(
    [Requesting.request, { path: "/region/get" }, { request }],
    [PainLocationScoring._getRegion, {}, { regions }],
  ),
  then: actions(
    [Requesting.respond, { request, regions }],
  ),
});

/**
 * If _getRegion fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleGetRegionErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/region/get" }, { request }],
    [PainLocationScoring._getRegion, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to get all regions for a map, validates the session,
 * and triggers the _getRegionsForMap query.
 * 
 * Note: This sync is used when PainLocationScoring._getRegionsForMap is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleGetRegionsForMapRequest: Sync = (
  { request, session, user, sessionState, map },
) => ({
  when: actions(
    [Requesting.request, { path: "/regions/map", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
    // Note: map should be extracted from request.body in the Requesting concept
  },
  then: actions(
    [PainLocationScoring._getRegionsForMap, { user, map }],
  ),
});

/**
 * When _getRegionsForMap is successful, this sync returns the regions data
 * in response to the original request.
 */
export const HandleGetRegionsForMapResponse: Sync = ({ request, regions }) => ({
  when: actions(
    [Requesting.request, { path: "/regions/map" }, { request }],
    [PainLocationScoring._getRegionsForMap, {}, { regions }],
  ),
  then: actions(
    [Requesting.respond, { request, regions }],
  ),
});

/**
 * If _getRegionsForMap fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleGetRegionsForMapErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/regions/map" }, { request }],
    [PainLocationScoring._getRegionsForMap, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

