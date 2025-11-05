---
timestamp: 'Tue Nov 04 2025 21:28:17 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_212817.a15a03a0.md]]'
content_id: 5b73e1f1fbf45a18d52cf0405e7fa6ad9fa8c7f5dcb034811dd7c5f91bf6323e
---

# response:

Based on the analysis of the provided concept implementations (`BodyMapGeneration`, `MapSummaryGeneration`, `PainLocationScoring`, and `UserAuthentication`), several key interactions are necessary to create a cohesive application. These interactions should be implemented as synchronizations (`syncs`) to maintain the independence and modularity of each concept.

Here are the essential syncs identified, along with their specifications and TypeScript implementations.

### 1. Generate an Initial Body Map on User Registration

When a new user successfully registers, they should immediately be provided with their first body map for the current day. This connects the user creation event to the map generation process.

**Specification:**

```sync
sync GenerateFirstMap
when
    UserAuthentication.register (username, password) : (user)
then
    BodyMapGeneration.generateMap (user)
```

**Implementation:**

```typescript
// file: src/syncs/user_onboarding.sync.ts
import { actions, Sync } from "@engine";
import { BodyMapGeneration, UserAuthentication } from "@concepts";

/**
 * When a new user is successfully registered, generate their first body map automatically.
 */
export const GenerateFirstMapOnRegistration: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [BodyMapGeneration.generateMap, { user }],
  ),
});
```

***

### 2. Track Map Ownership for Pain Scoring

The `PainLocationScoring` concept needs to know which maps belong to which users to validate actions like adding or scoring a region. When `BodyMapGeneration` creates a new map, this sync informs `PainLocationScoring` so it can track the ownership.

*Note: This sync uses the `_addMapForTesting` method from `PainLocationScoring`. In a production system, a dedicated action like `trackMap(user, map)` would be preferable, but we work with the provided implementation.*

**Specification:**

```sync
sync TrackMapOwnershipForScoring
when
    BodyMapGeneration.generateMap (user) : (mapId)
then
    PainLocationScoring._addMapForTesting (user, map: mapId)
```

**Implementation:**

```typescript
// file: src/syncs/map_management.sync.ts
import { actions, Sync } from "@engine";
import { BodyMapGeneration, PainLocationScoring } from "@concepts";

/**
 * When a new map is generated for a user, inform the PainLocationScoring concept
 * so it can track ownership for future validation of region-based actions.
 */
export const TrackMapOwnershipForScoring: Sync = ({ user, mapId }) => ({
  when: actions(
    [BodyMapGeneration.generateMap, { user }, { mapId }],
  ),
  then: actions(
    // The 'map' parameter of _addMapForTesting is aliased to the 'mapId' variable.
    [PainLocationScoring._addMapForTesting, { user, map: mapId }],
  ),
});
```

***

### 3. Handle PDF Export Requests

When a front-end client requests a PDF summary for a user, the `Requesting` concept fires a `request` action. This needs to be caught, authenticated, and then trigger the PDF generation in `MapSummaryGeneration`. A second pair of syncs is needed to catch the result (either the PDF data or an error) and send it back as a response.

**Specification:**

```sync
sync InitiatePDFExport
when
    Requesting.request(path: "/summary/export", session): (request)
where
    in UserAuthentication: _getSession(session) has userId of user AND isActive is true
then
    MapSummaryGeneration.exportUserSummariesAsPDF(user)

sync RespondWithPDF
when
    Requesting.request(path: "/summary/export"): (request)
    MapSummaryGeneration.exportUserSummariesAsPDF(): (pdfBuffer)
then
    Requesting.respond(request, pdfBuffer)

sync RespondWithPDFError
when
    Requesting.request(path: "/summary/export"): (request)
    MapSummaryGeneration.exportUserSummariesAsPDF(): (error)
then
    Requesting.respond(request, error)
```

**Implementation:**

```typescript
// file: src/syncs/summary_export.sync.ts
import { actions, Sync } from "@engine";
import { Requesting, MapSummaryGeneration, UserAuthentication } from "@concepts";

/**
 * Catches an incoming request for a user's PDF summary, validates the session,
 * and triggers the PDF generation process.
 */
export const HandlePDFExportRequest: Sync = ({ request, session, user, sessionState }) => ({
  when: actions(
    [Requesting.request, { path: "/summary/export", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, { sessionState });
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

```

***

### 4. Cascade Deletion of Regions When a Map is Cleared

The action `BodyMapGeneration.clearMap` deletes a map but does not affect the associated regions in `PainLocationScoring`, which would lead to orphaned data. The best way to handle this is to create a request-based flow. When a request to clear a map arrives, one sync deletes all associated regions, and another sync clears the map itself. This ensures all related data is removed cleanly.

**Specification:**

```sync
sync DeleteRegionsOnMapClearRequest
when
    Requesting.request(path: "/maps/clear", session): (request)
where
    in UserAuthentication: _getSession(session) has userId of user AND isActive is true
    in BodyMapGeneration: _getCurrentMap(user) gets map
    in PainLocationScoring: _getRegionsForMap(user, map: map._id) gets region
then
    PainLocationScoring.deleteRegion(user, region: region._id)

sync ClearMapAndRespondOnRequest
when
    Requesting.request(path: "/maps/clear", session): (request)
where
    in UserAuthentication: _getSession(session) has userId of user AND isActive is true
then
    BodyMapGeneration.clearMap(user)
    Requesting.respond(request, status: "map cleared successfully")
```

**Implementation:**

```typescript
// file: src/syncs/map_management.sync.ts
import { actions, Sync, Frames } from "@engine";
import { Requesting, BodyMapGeneration, PainLocationScoring, UserAuthentication } from "@concepts";

/**
 * When a request is made to clear a user's current map, this sync first finds
 * all associated pain regions and deletes them to prevent orphaned data.
 */
export const DeleteRegionsOnMapClearRequest: Sync = ({ request, session, user, sessionState, map, region }) => ({
  when: actions(
    [Requesting.request, { path: "/maps/clear", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, { sessionState });
    frames = frames.filter(($) => $[sessionState] && $[sessionState].active)
                   .map(($) => ({ ...$, [user]: $[sessionState].userId }));

    frames = await frames.query(BodyMapGeneration._getCurrentMap, { user }, { map });
    frames = frames.filter(($) => $[map] !== null); // Proceed only if a map exists

    // For each map, find all its regions. This will create a frame for each region.
    return await frames.query(
      PainLocationScoring._getRegionsForMap,
      (frame) => ({ user: frame[user], map: frame[map]._id }), // Use the map ID from the map object
      { region },
    );
  },
  then: actions(
    // This action will be fired once for each frame, deleting each region.
    (frame) => [PainLocationScoring.deleteRegion, { user: frame[user], region: frame[region]._id }],
  ),
});

/**
 * In parallel with deleting regions, this sync handles clearing the actual map
 * in the BodyMapGeneration concept and responds to the original HTTP request.
 */
export const ClearMapOnRequestAndRespond: Sync = ({ request, session, user, sessionState }) => ({
  when: actions(
    [Requesting.request, { path: "/maps/clear", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSession, { session }, { sessionState });
    frames = frames.filter(($) => $[sessionState] && $[sessionState].active)
                   .map(($) => ({ ...$, [user]: $[sessionState].userId }));
    return frames;
  },
  then: actions(
    [BodyMapGeneration.clearMap, { user }],
    // We can chain the response to happen after the clearMap action.
    [Requesting.respond, { request, status: "map and associated regions cleared" }],
  ),
});
```
