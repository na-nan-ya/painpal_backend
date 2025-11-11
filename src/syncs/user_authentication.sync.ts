import { actions, Sync } from "@engine";
import { Requesting, UserAuthentication } from "@concepts";

/**
 * Catches an incoming request to register a new user.
 * 
 * Note: Registration does not require session validation as it creates new users.
 * This sync is used when UserAuthentication.register is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleRegisterRequest: Sync = (
  { request, username, password },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/register" }, { request }],
  ),
  then: actions(
    [UserAuthentication.register, { username, password }],
  ),
});

/**
 * When register is successful, this sync responds to the original request with the user ID.
 */
export const HandleRegisterResponse: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/register" }, { request }],
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [Requesting.respond, { request, user }],
  ),
});

/**
 * If register fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleRegisterErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/register" }, { request }],
    [UserAuthentication.register, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to login a user.
 * 
 * Note: Login does not require session validation as it creates new sessions.
 * This sync is used when UserAuthentication.login is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleLoginRequest: Sync = (
  { request, username, password },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
  ),
  then: actions(
    [UserAuthentication.login, { username, password }],
  ),
});

/**
 * When login is successful, this sync responds to the original request with the session ID.
 * If login fails (invalid credentials), it responds with session: null.
 */
export const HandleLoginResponse: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
    [UserAuthentication.login, {}, { session }],
  ),
  then: actions(
    [Requesting.respond, { request, session }],
  ),
});

/**
 * If login fails with an error, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleLoginErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request }],
    [UserAuthentication.login, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to logout a user.
 * 
 * Note: This sync validates that the session exists and is active before logging out.
 * This sync is used when UserAuthentication.logout is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleLogoutRequest: Sync = (
  { request, session, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session exists and is active before proceeding.
    return frames.filter(($) => {
      const sess = $[sessionState] as { active?: boolean } | undefined;
      return sess && sess.active;
    });
  },
  then: actions(
    [UserAuthentication.logout, { session }],
  ),
});

/**
 * When logout is successful, this sync responds to the original request.
 */
export const HandleLogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout" }, { request }],
    [UserAuthentication.logout, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, result: {} }],
  ),
});

/**
 * If logout fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleLogoutErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout" }, { request }],
    [UserAuthentication.logout, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to get user maps, validates the session,
 * and triggers the getUserMaps action.
 * 
 * Note: This sync is used when UserAuthentication.getUserMaps is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleGetUserMapsRequest: Sync = (
  { request, session, user, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/user/maps", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
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
    [UserAuthentication.getUserMaps, { user, session }],
  ),
});

/**
 * When getUserMaps is successful, this sync returns the maps data
 * in response to the original request.
 */
export const HandleGetUserMapsResponse: Sync = ({ request, maps }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/user/maps" }, { request }],
    [UserAuthentication.getUserMaps, {}, { maps }],
  ),
  then: actions(
    [Requesting.respond, { request, maps }],
  ),
});

/**
 * If getUserMaps fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleGetUserMapsErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/auth/user/maps" }, { request }],
    [UserAuthentication.getUserMaps, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Note: _getUser and _getSession are query methods that are only used
 * internally with frames.query() for session validation in other syncs.
 * They should not be exposed as direct API endpoints.
 * 
 * Query methods (starting with `_`) are not instrumented as actions and
 * cannot be used in sync `then: actions()` clauses. They can only be used
 * with `frames.query()` in `where` clauses.
 * 
 * If you need to expose user or session information via API, create separate
 * action methods (without the `_` prefix) or use the session validation
 * pattern in other syncs.
 */
