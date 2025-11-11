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
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
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
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
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
 * Catches an incoming request to get the current map, validates the session,
 * and triggers the _getCurrentMap query.
 * 
 * Note: This sync is used when BodyMapGeneration._getCurrentMap is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleGetCurrentMapRequest: Sync = (
  { request, session, user, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/map/current", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
  },
  then: actions(
    [BodyMapGeneration._getCurrentMap, { user }],
  ),
});

/**
 * When _getCurrentMap is successful, this sync returns the map data
 * in response to the original request.
 */
export const HandleGetCurrentMapResponse: Sync = ({ request, map }) => ({
  when: actions(
    [Requesting.request, { path: "/map/current" }, { request }],
    [BodyMapGeneration._getCurrentMap, {}, { map }],
  ),
  then: actions(
    [Requesting.respond, { request, map }],
  ),
});

/**
 * If _getCurrentMap fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleGetCurrentMapErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/map/current" }, { request }],
    [BodyMapGeneration._getCurrentMap, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to get saved maps, validates the session,
 * and triggers the _getSavedMaps query.
 * 
 * Note: This sync is used when BodyMapGeneration._getSavedMaps is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleGetSavedMapsRequest: Sync = (
  { request, session, user, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/maps/saved", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
  },
  then: actions(
    [BodyMapGeneration._getSavedMaps, { user }],
  ),
});

/**
 * When _getSavedMaps is successful, this sync returns the maps data
 * in response to the original request.
 */
export const HandleGetSavedMapsResponse: Sync = ({ request, maps }) => ({
  when: actions(
    [Requesting.request, { path: "/maps/saved" }, { request }],
    [BodyMapGeneration._getSavedMaps, {}, { maps }],
  ),
  then: actions(
    [Requesting.respond, { request, maps }],
  ),
});

/**
 * If _getSavedMaps fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleGetSavedMapsErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/maps/saved" }, { request }],
    [BodyMapGeneration._getSavedMaps, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

