---
timestamp: 'Tue Nov 04 2025 21:33:29 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_213329.8341ee6f.md]]'
content_id: 96a59a9f19476db6820b4a35b943a770c2c01168127fd8be37faef340c537053
---

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

1. **An External Scheduler (The "When"):** This is a component outside the concept/sync engine whose only job is to run on a schedule. This is typically a `cron` job on a server or a timed loop (`setInterval`/`setTimeout`) within the main application process. This scheduler's task is to call the `triggerDailyMapGeneration` action precisely at midnight.

2. **A System Action (The "What"):** This is the `triggerDailyMapGeneration` action inside your concept. It contains all the business logic for what needs to happen at midnight (iterate all users, generate a new map for each, which implicitly saves the old one).

### How a Sync Fits Into This Flow

While a sync doesn't *start* the process, it **reacts to the consequences of it**.

The `triggerDailyMapGeneration` action loops through all users and calls `generateMap` for each one. This `generateMap` action is the key event that other concepts care about.

Therefore, the `TrackMapOwnershipForScoring` sync we defined previously will be automatically triggered for every single user every night, keeping the `PainLocationScoring` concept perfectly up-to-date.

Here is the complete sequence of events at midnight:

1. **00:00:00:** An external `cron` job (or a `setInterval` in your `main.ts`) executes.
2. The job's only task is to trigger the `BodyMapGeneration.triggerDailyMapGeneration` action.
3. The `triggerDailyMapGeneration` action begins executing. It fetches a list of all users: `[userA, userB, userC, ...]`.
4. It enters a loop:
   * **Loop 1:** Calls `BodyMapGeneration.generateMap({ user: userA })`.
   * **Sync Fires:** The `TrackMapOwnershipForScoring` sync sees this action occur. It runs `then: PainLocationScoring._addMapForTesting({ user: userA, map: newMapIdForA })`.
   * **Loop 2:** Calls `BodyMapGeneration.generateMap({ user: userB })`.
   * **Sync Fires:** The sync sees this action and runs `then: PainLocationScoring._addMapForTesting({ user: userB, map: newMapIdForB })`.
   * ...and so on for every user.
5. The `triggerDailyMapGeneration` action finishes its loop and updates its `lastRunDate`.

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

* **Separation of Concerns:** The scheduler knows *when* to run a task. The concept knows *what* the task is. The syncs know *how to react* to the results of the task. Each part has a single, clear responsibility.
* **Testability:** You can test the `triggerDailyMapGeneration` action directly via an API call or unit test without having to wait for midnight.
* **Architectural Integrity:** It respects the action-driven nature of the concept engine. The scheduler simply acts as another client that invokes an action, just like an HTTP request does via the `Requesting` concept.
