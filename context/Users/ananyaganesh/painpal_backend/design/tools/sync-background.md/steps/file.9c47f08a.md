---
timestamp: 'Tue Nov 04 2025 21:27:19 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_212719.9768d9fb.md]]'
content_id: 9c47f08a8534b01eceb47ffb33af9700a6192e65787e45a9816e14ee7f01de29
---

# file: /Users/ananyaganesh/painpal\_backend/src/concepts/PainLocationScoring/PainLocationScoringConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// The concept name is used as a prefix for collection names to ensure uniqueness
const PREFIX = "PainLocationScoring" + ".";

/**
 * Generic type parameters for the concept:
 * User: Represents a user's unique identifier.
 * Map: Represents a body map's unique identifier.
 * Region: Represents a specific body region's unique identifier.
 */
type User = ID;
type Map = ID;
type Region = ID;

/**
 * State:
 * a set of Users with
 * a set of body Maps
 *
 * This interface represents the body maps known to this concept,
 * linking them to their owning user. While map creation is external,
 * this concept needs to store the ownership to validate actions.
 */
interface BodyMap {
  _id: Map;
  userId: User; // The user who owns this body map
}

/**
 * State:
 * a set of body Maps with
 * a set of Regions
 * a set of Regions with
 * a scaled score Number
 *
 * This interface represents a specific region on a body map,
 * including its identifier, the map it belongs to, its descriptive name,
 * and an optional pain score.
 */
interface BodyRegion {
  _id: Region;
  mapId: Map; // The map this region belongs to
  name: string; // A descriptive name for the region (e.g., "left knee", "head")
  score?: number; // The pain score (1-10), optional as it's assigned later
}

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

  /**
   * Helper method to validate if a given map exists and belongs to the user.
   * This is crucial for ownership checks across multiple actions.
   * @param user The ID of the user.
   * @param map The ID of the map.
   * @returns The BodyMap document if valid, otherwise null.
   */
  private async validateMapOwnership(
    user: User,
    map: Map,
  ): Promise<BodyMap | null> {
    const existingMap = await this.bodyMaps.findOne({ _id: map, userId: user });
    return existingMap;
  }

  /**
   * Helper method to validate if a given region exists and belongs to a map owned by the user.
   * @param user The ID of the user.
   * @param region The ID of the region.
   * @returns The BodyRegion document if valid, otherwise null.
   */
  private async validateRegionOwnership(
    user: User,
    region: Region,
  ): Promise<BodyRegion | null> {
    const bodyRegion = await this.regions.findOne({ _id: region });

    if (!bodyRegion) {
      return null; // Region not found
    }

    const mapOwner = await this.bodyMaps.findOne({
      _id: bodyRegion.mapId,
      userId: user,
    });

    if (!mapOwner) {
      return null; // Map not found or not owned by the user
    }

    return bodyRegion;
  }

  /**
   * addRegion(user: User, map: Map, regionName: string): { region: Region }
   *
   * requires: the Map must already exist for the given User
   * effects: creates and returns a new Region on that Map
   *
   * Note: `regionName` is used as input to specify the region part (e.g., "left knee"),
   * as the `Region` ID itself is newly created by this action.
   * An external concept (e.g., `BodyMapGeneration`) is assumed to provide `Map`s and their user associations.
   * This concept stores the `Map` to `User` association to enforce ownership.
   * For the purpose of this implementation, if a map is provided, we assume it's part of the `bodyMaps` collection.
   * If it's not found in `bodyMaps`, it implies it doesn't exist for the user (or at all within this concept's knowledge).
   */
  async addRegion(
    { user, map, regionName }: { user: User; map: Map; regionName: string },
  ): Promise<{ region: Region } | { error: string }> {
    // Validate map ownership
    const existingMap = await this.validateMapOwnership(user, map);
    if (!existingMap) {
      return {
        error:
          `Map '${map}' not found for user '${user}' or user does not own it.`,
      };
    }

    const newRegionId = freshID();
    const newRegion: BodyRegion = {
      _id: newRegionId,
      mapId: map,
      name: regionName,
    };

    try {
      await this.regions.insertOne(newRegion);
      return { region: newRegionId };
    } catch (e) {
      console.error("Error adding region:", e);
      return { error: "Failed to add region due to a database error." };
    }
  }

  /**
   * scoreRegion(user: User, region: Region, score: Number): Empty
   *
   * requires: the Region must exist within the User’s Map and the Number must be between 1 and 10
   * effects: associates the Number with that Region
   */
  async scoreRegion(
    { user, region, score }: { user: User; region: Region; score: number },
  ): Promise<Empty | { error: string }> {
    // Validate score range
    if (score < 1 || score > 10) {
      return { error: "Score must be a number between 1 and 10." };
    }

    // Validate region ownership
    const existingRegion = await this.validateRegionOwnership(user, region);
    if (!existingRegion) {
      return {
        error: `Region '${region}' not found or not owned by user '${user}'.`,
      };
    }

    try {
      const result = await this.regions.updateOne(
        { _id: region },
        { $set: { score: score } },
      );

      if (result.matchedCount === 0) {
        // This case should ideally not be hit if validateRegionOwnership passed,
        // but provides an extra layer of safety.
        return { error: `Region '${region}' could not be found for update.` };
      }

      return {};
    } catch (e) {
      console.error("Error scoring region:", e);
      return { error: "Failed to score region due to a database error." };
    }
  }

  /**
   * deleteRegion(user: User, region: Region): Empty
   *
   * requires: the Region must already exist within the User’s Map
   * effects: removes the Region from the associated Map
   */
  async deleteRegion(
    { user, region }: { user: User; region: Region },
  ): Promise<Empty | { error: string }> {
    // Validate region ownership
    const existingRegion = await this.validateRegionOwnership(user, region);
    if (!existingRegion) {
      return {
        error: `Region '${region}' not found or not owned by user '${user}'.`,
      };
    }

    try {
      const result = await this.regions.deleteOne({ _id: region });

      if (result.deletedCount === 0) {
        // This case should ideally not be hit if validateRegionOwnership passed,
        // but provides an extra layer of safety.
        return { error: `Region '${region}' could not be found for deletion.` };
      }

      return {};
    } catch (e) {
      console.error("Error deleting region:", e);
      return { error: "Failed to delete region due to a database error." };
    }
  }

  /**
   * _getRegion(user: User, region: Region): BodyRegion[]
   *
   * Query: Retrieves a specific region's details for a given user, including its score.
   * requires: The region must exist and be owned by the user.
   * effects: Returns an array containing the BodyRegion object if found and owned, otherwise an empty array or error.
   */
  async _getRegion(
    { user, region }: { user: User; region: Region },
  ): Promise<BodyRegion[] | { error: string }> {
    const existingRegion = await this.validateRegionOwnership(user, region);
    if (!existingRegion) {
      return {
        error: `Region '${region}' not found or not owned by user '${user}'.`,
      };
    }
    return [existingRegion];
  }

  /**
   * _getRegionsForMap(user: User, map: Map): BodyRegion[]
   *
   * Query: Retrieves all regions associated with a specific map owned by a user.
   * requires: The map must exist and be owned by the user.
   * effects: Returns an array of BodyRegion objects for the specified map and user.
   */
  async _getRegionsForMap(
    { user, map }: { user: User; map: Map },
  ): Promise<BodyRegion[] | { error: string }> {
    const existingMap = await this.validateMapOwnership(user, map);
    if (!existingMap) {
      return {
        error:
          `Map '${map}' not found for user '${user}' or user does not own it.`,
      };
    }

    try {
      const regions = await this.regions.find({ mapId: map }).toArray();
      return regions;
    } catch (e) {
      console.error("Error fetching regions for map:", e);
      return { error: "Failed to retrieve regions due to a database error." };
    }
  }

  /**
   * _addMapForTesting(user: User, map: Map): Empty
   *
   * Helper function for testing purposes ONLY.
   * This concept does not implement `addMap` as per spec: "Do not add functions that create maps internally".
   * However, for testing the concept in isolation, we need a way to populate the `bodyMaps` collection
   * that this concept uses for ownership checks.
   * This method bypasses the normal concept rules because it's purely for setting up test data.
   */
  async _addMapForTesting(
    { user, map }: { user: User; map: Map },
  ): Promise<Empty | { error: string }> {
    try {
      await this.bodyMaps.insertOne({ _id: map, userId: user });
      return {};
    } catch (e) {
      console.error("Error adding map for testing:", e);
      return { error: "Failed to add map for testing." };
    }
  }
}

```
