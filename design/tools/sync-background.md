[@concept-design-overview](../background/concept-design-overview.md)

[@concept-specifications](../background/concept-specifications.md)

[@implementing-concepts](../background/implementing-concepts.md)

[@implementing-synchronizations](../background/implementing-synchronizations.md)

[@README](../../src/concepts/Requesting/README.md)

[@architecture](../background/architecture.md)

# prompt: Analyse the following concept implementations and determine what syncs should be implemented between them based on the given background.

[@BodyMapGenerationConcept.ts](../../src/concepts/BodyMapGeneration/BodyMapGenerationConcept.ts)

[@MapSummaryGenerationConcept.ts](../../src/concepts/MapSummaryGeneration/MapSummaryGenerationConcept.ts)

[@PainLocationScoringConcept.ts](../../src/concepts/PainLocationScoring/PainLocationScoringConcept.ts)

[@UserAuthenticationConcept.ts](../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)
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

---

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

---

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

---

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

# prompt: Note that generateMap and saveMap are actions that occur on a 24-hour basis. The user has no control over them. At midnight, a new map is generated and the previous one is saved associated with that date. Can a sync take care of that and how?
# response:

Of course. This is an excellent question that gets to the heart of the architectural pattern.

A `sync` by itself **cannot** initiate this process. The reason is that a sync's `when` clause is triggered by the *occurrence of an action* within the system. It is a reactive, event-driven mechanism. It cannot be triggered by an external event like the passage of time (e.g., "when the clock strikes midnight").

However, the concept design pattern provides a clean and robust way to handle this. The solution is to introduce a component that translates the external time-based event into an action that the system, including syncs, can react to.

The `BodyMapGenerationConcept` is already perfectly designed for this with its `system` action:

```typescript
  /**
   * system triggerDailyMapGeneration (): Empty
   *
   * requires: The current time is 00:00:00 (midnight) of a new day...
   * effects: For each user... Call generateMap(user).
   */
  async triggerDailyMapGeneration(): Promise<Empty | { error: string }>
```

Here is the complete pattern for how this should be handled:

### The Correct Approach: External Scheduler + System Action

The process is split into two distinct responsibilities:

1.  **An External Scheduler (The "When"):** This is a component outside the concept/sync engine whose only job is to run on a schedule. This is typically a `cron` job on a server or a timed loop (`setInterval`/`setTimeout`) within the main application process. This scheduler's task is to call the `triggerDailyMapGeneration` action precisely at midnight.

2.  **A System Action (The "What"):** This is the `triggerDailyMapGeneration` action inside your concept. It contains all the business logic for what needs to happen at midnight (iterate all users, generate a new map for each, which implicitly saves the old one).

### How a Sync Fits Into This Flow

While a sync doesn't *start* the process, it **reacts to the consequences of it**.

The `triggerDailyMapGeneration` action loops through all users and calls `generateMap` for each one. This `generateMap` action is the key event that other concepts care about.

Therefore, the `TrackMapOwnershipForScoring` sync we defined previously will be automatically triggered for every single user every night, keeping the `PainLocationScoring` concept perfectly up-to-date.

Here is the complete sequence of events at midnight:

1.  **00:00:00:** An external `cron` job (or a `setInterval` in your `main.ts`) executes.
2.  The job's only task is to trigger the `BodyMapGeneration.triggerDailyMapGeneration` action.
3.  The `triggerDailyMapGeneration` action begins executing. It fetches a list of all users: `[userA, userB, userC, ...]`.
4.  It enters a loop:
    *   **Loop 1:** Calls `BodyMapGeneration.generateMap({ user: userA })`.
    *   **Sync Fires:** The `TrackMapOwnershipForScoring` sync sees this action occur. It runs `then: PainLocationScoring._addMapForTesting({ user: userA, map: newMapIdForA })`.
    *   **Loop 2:** Calls `BodyMapGeneration.generateMap({ user: userB })`.
    *   **Sync Fires:** The sync sees this action and runs `then: PainLocationScoring._addMapForTesting({ user: userB, map: newMapIdForB })`.
    *   ...and so on for every user.
5.  The `triggerDailyMapGeneration` action finishes its loop and updates its `lastRunDate`.

### Example Implementation of the Scheduler

You would add a simple scheduler to your application's entry point (e.g., `src/main.ts`). This is the bridge between the world of time and the world of concepts.

```typescript
// file: src/main.ts (or a dedicated scheduler file)

import { getDb } from "@utils/database.ts";
import { ConceptEngine } from "@engine";
import * as concepts from "@concepts";
import * as syncs from "@syncs";

// ... (existing setup code for engine, db, etc.)

const [db, _client] = await getDb();
const engine = new ConceptEngine(db, Object.values(concepts), Object.values(syncs));

// --- SCHEDULER IMPLEMENTATION ---

function scheduleMidnightTask() {
  const now = new Date();
  
  // Calculate time until next midnight
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Set to midnight of the *next* day
  const msUntilMidnight = midnight.getTime() - now.getTime();

  console.log(`[Scheduler] Daily map generation scheduled in ${msUntilMidnight / 1000 / 60} minutes.`);

  // Set a timeout for the first run at midnight
  setTimeout(() => {
    runDailyMapGeneration();
    
    // After the first run, set an interval to run every 24 hours
    setInterval(runDailyMapGeneration, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  }, msUntilMidnight);
}

async function runDailyMapGeneration() {
  console.log("[Scheduler] It's midnight! Running daily map generation...");
  try {
    // Directly invoke the system action through the engine
    // The engine's `invoke` method is the standard way to trigger actions
    const result = await engine.invoke(
      concepts.BodyMapGeneration.triggerDailyMapGeneration, 
      {} // No input arguments
    );
    
    if (result && 'error' in result) {
        console.error("[Scheduler] Daily map generation failed:", result.error);
    } else {
        console.log("[Scheduler] Daily map generation completed successfully.");
    }

  } catch (e) {
    console.error("[Scheduler] A critical error occurred during scheduled task:", e);
  }
}

// Start the server and the scheduler
// ... (start the API server)
scheduleMidnightTask(); 
```

### Summary: Why this is the Correct Pattern

*   **Separation of Concerns:** The scheduler knows *when* to run a task. The concept knows *what* the task is. The syncs know *how to react* to the results of the task. Each part has a single, clear responsibility.
*   **Testability:** You can test the `triggerDailyMapGeneration` action directly via an API call or unit test without having to wait for midnight.
*   **Architectural Integrity:** It respects the action-driven nature of the concept engine. The scheduler simply acts as another client that invokes an action, just like an HTTP request does via the `Requesting` concept.

# prompt: Do not use the _addMapForTesting action in the map_management sync, that is solely for unit testing purposes
# response:

You are absolutely right. Using a method named `_addMapForTesting` in a production synchronization is a significant architectural flaw. It breaks the encapsulation of the concept and relies on an implementation detail that is explicitly marked for non-production use.

The correct approach is to introduce a new, first-class action in `PainLocationScoringConcept` whose specific purpose is to allow the concept to be informed about a map created by another part of the system. This makes the interaction explicit, documented, and safe.

Here is the corrected implementation, which involves two steps:
1.  Adding a new `trackMap` action to `PainLocationScoringConcept`.
2.  Updating the `map_management.sync.ts` to use this new, official action.

---

### Step 1: Add a `trackMap` Action to `PainLocationScoringConcept.ts`

We will add a new public action, `trackMap`, to the concept. This action will serve as the official entry point for registering a map's ownership.

**file: `/Users/ananyaganesh/painpal_backend/src/concepts/PainLocationScoring/PainLocationScoringConcept.ts`**

```typescript
// ... (imports and existing interfaces)

/**
 * PainLocationScoringConcept
 *
 * purpose: users can select a region on the body map and rate the pain on a scale of 1 to 10
 * principle: each region on a body map may be assigned a numerical score representing pain intensity
 */
export default class PainLocationScoringConcept {
  private bodyMaps: Collection<BodyMap>;
  private regions: Collection<BodyRegion>;

  constructor(private readonly db: Db) {
    this.bodyMaps = this.db.collection(PREFIX + "bodyMaps");
    this.regions = this.db.collection(PREFIX + "regions");
  }

  // ... (existing helper methods: validateMapOwnership, validateRegionOwnership)

  /**
   * trackMap(user: User, map: Map): Empty
   *
   * requires: The map must not already be tracked for any user.
   * effects: Stores the association between a user and a map. This action is intended to be
   *          called by a synchronization when an external concept (e.g., BodyMapGeneration) creates a new map.
   */
  async trackMap(
    { user, map }: { user: User; map: Map },
  ): Promise<Empty | { error: string }> {
    try {
      // Precondition check: ensure the map is not already tracked.
      const alreadyTracked = await this.bodyMaps.findOne({ _id: map });
      if (alreadyTracked) {
        // If it's already tracked for the same user, it's idempotent. Otherwise, it's an error.
        if (String(alreadyTracked.userId) !== String(user)) {
          return { error: `Map '${map}' is already tracked by another user.` };
        }
        return {}; // Already tracked for this user, do nothing.
      }

      // Store the new map ownership information.
      await this.bodyMaps.insertOne({ _id: map, userId: user });
      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error tracking map '${map}' for user '${user}':`, e);
        return { error: `Failed to track map: ${e.message}` };
      } else {
        console.error(`Unknown error tracking map '${map}' for user '${user}':`, e);
        return { error: "Failed to track map due to an unknown error" };
      }
    }
  }


  // ... (existing actions: addRegion, scoreRegion, deleteRegion)
  // ... (existing queries: _getRegion, _getRegionsForMap)
  // ... (existing test helper: _addMapForTesting - which is now correctly isolated for testing only)
}
```

---

### Step 2: Update the `map_management.sync.ts` File

Now, we can update the synchronization to call the new, appropriate `trackMap` action instead of the test helper.

**file: `src/syncs/map_management.sync.ts`**

```typescript
import { actions, Sync } from "@engine";
import { BodyMapGeneration, PainLocationScoring } from "@concepts";

/**
 * When a new map is generated for a user, this sync calls the official 'trackMap' action
 * in the PainLocationScoring concept. This allows it to track ownership for future
 * validation of region-based actions in an architecturally sound way.
 */
export const TrackMapOwnershipForScoring: Sync = ({ user, mapId }) => ({
  when: actions(
    [BodyMapGeneration.generateMap, { user }, { mapId }],
  ),
  then: actions(
    // CORRECT: Use the new, official 'trackMap' action.
    // The 'map' parameter of trackMap is aliased to the 'mapId' variable from the 'when' clause.
    [PainLocationScoring.trackMap, { user, map: mapId }],
  ),
});

// ... (other syncs from the file, e.g., for map clearing)
```

### Reasoning and Benefits of this Change

This correction is crucial for maintaining a robust and scalable architecture:

1.  **Explicit API Contract:** The `PainLocationScoring` concept now has a clear, documented, and intentional way (`trackMap`) for other parts of the system to inform it about new maps. It's no longer a hidden side-effect of a test function.
2.  **Architectural Purity:** It strictly adheres to the principle that concepts are black boxes that interact *only* through their defined actions. The sync acts as the glue, orchestrating calls between these official actions.
3.  **Removes Ambiguity:** A developer seeing a call to `_addMapForTesting` in a sync would be confused about its purpose and whether it's safe to use. A call to `trackMap` is self-explanatory and clearly communicates its intent.
4.  **Enhances Security and Stability:** It prevents production logic from depending on test code, which might be changed or removed without consideration for production impact.