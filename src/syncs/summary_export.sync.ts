import { actions, Sync } from "@engine";
import {
  MapSummaryGeneration,
  Requesting,
  UserAuthentication,
} from "@concepts";

/**
 * Catches an incoming request for a user's PDF summary, validates the session,
 * and triggers the PDF generation process.
 */
export const HandlePDFExportRequest: Sync = (
  { request, session, user, sessionState },
) => ({
  when: actions(
    [Requesting.request, { path: "/summary/export", session }, { request }],
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
    [MapSummaryGeneration.exportUserSummariesAsPDF, { user }],
  ),
});

/**
 * When the PDF generation is successful, this sync takes the resulting pdfBuffer
 * and sends it back in response to the original request.
 */
export const HandlePDFExportResponse: Sync = ({ request, pdfBuffer }) => ({
  when: actions(
    [Requesting.request, { path: "/summary/export" }, { request }],
    [MapSummaryGeneration.exportUserSummariesAsPDF, {}, { pdfBuffer }],
  ),
  then: actions(
    [Requesting.respond, { request, pdfBuffer }],
  ),
});

/**
 * If PDF generation fails, this sync catches the error and sends it back
 * in response to the original request.
 */
export const HandlePDFExportErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/summary/export" }, { request }],
    [MapSummaryGeneration.exportUserSummariesAsPDF, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
