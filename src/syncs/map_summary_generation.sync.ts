import { actions, Sync } from "@engine";
import { MapSummaryGeneration, Requesting, UserAuthentication } from "@concepts";

/**
 * Catches an incoming request to get a specific summary, validates the session,
 * and triggers the _getSummary query.
 * 
 * Note: This sync is used when MapSummaryGeneration._getSummary is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleGetSummaryRequest: Sync = (
  { request, session, user, sessionState, summaryId },
) => ({
  when: actions(
    [Requesting.request, { path: "/summary/get", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, {
      sessionState,
    });
    // Ensure the session is valid and active before proceeding.
    return frames
      .filter(($) => $[sessionState] && $[sessionState].active)
      .map(($) => ({ ...$, [user]: $[sessionState].userId })); // Extract userId as 'user' variable
    // Note: summaryId should be extracted from request.body in the Requesting concept
  },
  then: actions(
    [MapSummaryGeneration._getSummary, { summaryId }],
  ),
});

/**
 * When _getSummary is successful, this sync returns the summary data
 * in response to the original request.
 */
export const HandleGetSummaryResponse: Sync = ({ request, summary }) => ({
  when: actions(
    [Requesting.request, { path: "/summary/get" }, { request }],
    [MapSummaryGeneration._getSummary, {}, { summary }],
  ),
  then: actions(
    [Requesting.respond, { request, summary }],
  ),
});

/**
 * If _getSummary fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleGetSummaryErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/summary/get" }, { request }],
    [MapSummaryGeneration._getSummary, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Catches an incoming request to get all summaries for a user, validates the session,
 * and triggers the _getUserSummaries query.
 * 
 * Note: This sync is used when MapSummaryGeneration._getUserSummaries is excluded from passthrough
 * and requests go through the Requesting concept instead.
 */
export const HandleGetUserSummariesRequest: Sync = (
  { request, session, user, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/summaries/user", session }, { request }],
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
    [MapSummaryGeneration._getUserSummaries, { user }],
  ),
});

/**
 * When _getUserSummaries is successful, this sync returns the summaries data
 * in response to the original request.
 */
export const HandleGetUserSummariesResponse: Sync = ({ request, summaries }) => ({
  when: actions(
    [Requesting.request, { path: "/summaries/user" }, { request }],
    [MapSummaryGeneration._getUserSummaries, {}, { summaries }],
  ),
  then: actions(
    [Requesting.respond, { request, summaries }],
  ),
});

/**
 * If _getUserSummaries fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandleGetUserSummariesErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/summaries/user" }, { request }],
    [MapSummaryGeneration._getUserSummaries, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

