---
timestamp: 'Fri Oct 17 2025 21:18:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_211803.d849f333.md]]'
content_id: 682c7853179b8b3dda94e3a8adff713c325409c2285def463c64009beb8a6232
---

# file: src/concepts/BodyMapGeneration/BodyMapGeneration.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "BodyMapGeneration" + ".";

// Generic type parameter for users
type User = ID;
// Internal ID for Maps
type Map = ID;

/**
 * @interface UserState
 * Represents the state of a user within the BodyMapGeneration concept.
 *
 * users: a set of Users with
 *   currentMapId: Map | null
 */
interface UserState {
  _id: User;
  currentMapId: Map | null;
}

/**
 * @interface MapState
 * Represents a single generated body map.
 *
 * maps: a set of Maps with
 *   _id: Map
 *   ownerId: User
 *   creationDate: Date
 *   imageUrl: String
 *   isSaved: Boolean
 */
interface MapState {
  _id: Map;
  ownerId: User;
  creationDate: Date;
  imageUrl: string;
  isSaved: boolean;
}

/**
 * @interface DailyGenerationStatus
 * A single record to track the last time the daily generation system action ran.
 *
 * dailyGenerationStatus:
 *   _id: String = "dailyGeneration"
 *   lastRunDate: Date
 */
interface DailyGenerationStatus {
  _id: "dailyGeneration"; // Unique identifier for this system status record
  lastRunDate: Date;
}

/**
 * @concept BodyMapGeneration
 * @purpose provide a daily visual representation of the body for users to track changes over time,
 *          without including any notion of body measurements.
 * @principle after a map is generated, it becomes the user's current map. At midnight, the user's current map
 *             is automatically saved to a historical archive and a new one is automatically generated for the next day for all users.
 */
export default class BodyMapGenerationConcept {
  // MongoDB collections for the concept's state
  users: Collection<UserState>;
  maps: Collection<MapState>;
  dailyGenerationStatus: Collection<DailyGenerationStatus>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.maps = this.db.collection(PREFIX + "maps");
    this.dailyGenerationStatus = this.db.collection(PREFIX + "system");
  }

  /**
   * generateMap (user: User): (mapId: Map)
   *
   * requires: true
   * effects:
   *   If user has an existing currentMapId: That map's isSaved property is set to true.
   *   A new Map is created with ownerId, current Date, placeholder imageUrl, and isSaved: false.
   *   The user's currentMapId is updated to this new Map's ID.
   *   Returns the _id of the newly generated Map.
   */
  async generateMap(
    { user }: { user: User },
  ): Promise<{ mapId: Map } | { error: string }> {
    try {
      // Find the user's current state
      const existingUser = await this.users.findOne({ _id: user });

      // If the user has an existing current map, mark it as saved (archived).
      if (existingUser && existingUser.currentMapId) {
        await this.maps.updateOne(
          { _id: existingUser.currentMapId },
          { $set: { isSaved: true } },
        );
      }

      // Generate a new unique ID for the new map
      const newMapId = freshID() as Map;
      const newMap: MapState = {
        _id: newMapId,
        ownerId: user,
        creationDate: new Date(),
        imageUrl: "default_map_image.png", // Placeholder image URL, no body measurements implied
        isSaved: false, // New maps are not saved yet
      };

      // Insert the new map into the maps collection
      await this.maps.insertOne(newMap);

      // Update or create the user record with the new currentMapId
      // upsert: true ensures that if the user record doesn't exist, it will be created.
      await this.users.updateOne(
        { _id: user },
        { $set: { currentMapId: newMapId } },
        { upsert: true },
      );

      return { mapId: newMapId };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error generating map for user ${user}:`, e);
        return { error: `Failed to generate map: ${e.message}` };
      } else {
        console.error(`Unknown error generating map for user ${user}:`, e);
        return { error: "Failed to generate map due to an unknown error" };
      }
    }
  }

  /**
   * saveMap (user: User): Empty
   *
   * requires: user has a currentMapId.
   * effects: The Map referenced by user's currentMapId has its isSaved property set to true.
   *          This action allows a user to manually archive their current map at any time.
   */
  async saveMap({ user }: { user: User }): Promise<Empty | { error: string }> {
    try {
      const userState = await this.users.findOne({ _id: user });

      // Precondition check: user must have a currentMapId
      if (!userState || !userState.currentMapId) {
        return { error: `User ${user} does not have a current map to save.` };
      }

      // Mark the current map as saved
      const result = await this.maps.updateOne(
        { _id: userState.currentMapId },
        { $set: { isSaved: true } },
      );

      if (result.modifiedCount === 0) {
        // If the map wasn't found or already saved, it's still a successful operation for the user's intent.
        // Or it could indicate a consistency issue, depending on strictness.
        // For now, we consider it a success if no error was thrown and it was meant to be set.
        console.warn(
          `Map ${userState.currentMapId} for user ${user} was not modified (might be already saved or not found).`,
        );
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error saving map for user ${user}:`, e);
        return { error: `Failed to save map: ${e.message}` };
      } else {
        console.error(`Unknown error saving map for user ${user}:`, e);
        return { error: "Failed to save map due to an unknown error" };
      }
    }
  }

  /**
   * clearMap (user: User): Empty
   *
   * requires: user has a currentMapId.
   * effects:
   *   The Map referenced by user's currentMapId is deleted from the maps collection.
   *   The user's currentMapId is set to null.
   */
  async clearMap({ user }: { user: User }): Promise<Empty | { error: string }> {
    try {
      const userState = await this.users.findOne({ _id: user });

      // Precondition check: user must have a currentMapId
      if (!userState || !userState.currentMapId) {
        return { error: `User ${user} does not have a current map to clear.` };
      }

      // Delete the associated map document from the maps collection
      const deleteResult = await this.maps.deleteOne({
        _id: userState.currentMapId,
      });
      if (deleteResult.deletedCount === 0) {
        console.warn(
          `Map ${userState.currentMapId} for user ${user} was not found for deletion.`,
        );
        // Even if not found, the user's currentMapId will be set to null, achieving the user's intent.
      }

      // Set user's current map reference to null
      await this.users.updateOne(
        { _id: user },
        { $set: { currentMapId: null } },
      );

      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error clearing map for user ${user}:`, e);
        return { error: `Failed to clear map: ${e.message}` };
      } else {
        console.error(`Unknown error clearing map for user ${user}:`, e);
        return { error: "Failed to clear map due to an unknown error" };
      }
    }
  }

  /**
   * system triggerDailyMapGeneration (): Empty
   *
   * requires: The current time is 00:00:00 (midnight) of a new day, AND dailyGenerationStatus.lastRunDate is not today's date.
   * effects:
   *   For each user in the users collection:
   *     Call generateMap(user). (This will implicitly save the previous currentMap if one exists, then create a new one).
   *   Update dailyGenerationStatus.lastRunDate to the current date.
   */
  async triggerDailyMapGeneration(): Promise<Empty | { error: string }> {
    const now = new Date();
    // Calculate midnight of the current day for comparison
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    try {
      const status = await this.dailyGenerationStatus.findOne({
        _id: "dailyGeneration",
      });
      const lastRunDate = status ? new Date(status.lastRunDate) : null;
      // Calculate midnight of the last run date for comparison
      const lastRunMidnight = lastRunDate
        ? new Date(
          lastRunDate.getFullYear(),
          lastRunDate.getMonth(),
          lastRunDate.getDate(),
        )
        : null;

      // Precondition check: Ensure this action hasn't already run today
      if (
        lastRunMidnight && lastRunMidnight.getTime() === todayMidnight.getTime()
      ) {
        return { error: "Daily map generation has already run for today." };
      }

      console.log(
        `Starting daily map generation for date: ${todayMidnight.toISOString()}`,
      );

      // Retrieve all existing users to process their maps
      const allUsers = await this.users.find({}).toArray();

      for (const userState of allUsers) {
        console.log(
          `Processing daily map generation for user: ${userState._id}`,
        );
        // Calling generateMap for each user handles both cases:
        // 1. If user has a current map: it's marked as saved, then a new one is created.
        // 2. If user does not have a current map (currentMapId is null): a new one is simply created.
        const generateResult = await this.generateMap({ user: userState._id });
        if ("error" in generateResult) {
          console.error(
            `Failed to generate daily map for user ${userState._id}: ${generateResult.error}`,
          );
          // Decide on error handling strategy: continue processing other users or halt?
          // For system-wide tasks, usually continue with a log.
        }
      }

      // Update the system status to mark that daily generation has run for today
      await this.dailyGenerationStatus.updateOne(
        { _id: "dailyGeneration" },
        { $set: { lastRunDate: now } }, // Store the exact time of completion
        { upsert: true }, // Create the status record if it doesn't exist
      );

      console.log(
        `Daily map generation completed for date: ${todayMidnight.toISOString()}`,
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error("Critical error during daily map generation:", e);
        return { error: `Daily map generation failed: ${e.message}` };
      } else {
        console.error("Unknown critical error during daily map generation:", e);
        return { error: "Daily map generation failed due to an unknown error" };
      }
    }
  }

  // --- Query methods (not explicitly requested but good for testing/observability) ---

  /**
   * _getCurrentMap (user: User): (map: MapState | null)
   *
   * effects: Returns the current map for a given user, or null if none exists.
   */
  async _getCurrentMap(
    { user }: { user: User },
  ): Promise<{ map: MapState | null } | { error: string }> {
    try {
      const userState = await this.users.findOne({ _id: user });
      if (!userState || !userState.currentMapId) {
        return { map: null };
      }
      const map = await this.maps.findOne({ _id: userState.currentMapId });
      return { map };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching current map for user ${user}:`, e);
        return { error: `Failed to fetch current map: ${e.message}` };
      } else {
        console.error(
          `Unknown error fetching current map for user ${user}:`,
          e,
        );
        return { error: "Failed to fetch current map due to an unknown error" };
      }
    }
  }

  /**
   * _getSavedMaps (user: User): (maps: MapState[])
   *
   * effects: Returns all saved maps for a given user.
   */
  async _getSavedMaps(
    { user }: { user: User },
  ): Promise<{ maps: MapState[] } | { error: string }> {
    try {
      const maps = await this.maps.find({ ownerId: user, isSaved: true })
        .toArray();
      return { maps };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching saved maps for user ${user}:`, e);
        return { error: `Failed to fetch saved maps: ${e.message}` };
      } else {
        console.error(`Unknown error fetching saved maps for user ${user}:`, e);
        return { error: "Failed to fetch saved maps due to an unknown error" };
      }
    }
  }
}

```
