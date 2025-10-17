---
timestamp: 'Fri Oct 17 2025 11:46:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_114603.791caed7.md]]'
content_id: a19ce0cbde892d63b8914d6d36e736471c675b0f3ec778a411f6da7e0cdca1d4
---

# response:

```typescript
// file: src/BodyMapGeneration/BodyMapGenerationConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * @concept BodyMapGeneration [User]
 * @purpose support users in generating maps of their body measurements
 * @principle after providing an initial set of body measurements, the system can
 *   generate a personalized body map with visual representations of those measurements,
 *   and subsequent measurements can be added to update the map.
 */

// Declare collection prefix, use concept name
const PREFIX = "BodyMapGeneration" + ".";

// Generic types of this concept
type User = ID;
type BodyMapID = ID;
type MeasurementID = ID; // Internal ID for Measurement documents

/**
 * @state a set of Users with a bodyMaps set of BodyMapID
 */
interface Users {
  _id: User;
  bodyMaps: BodyMapID[];
}

/**
 * @state a set of BodyMapIDs with
 *   a user User
 *   a name String
 *   a timestamp Date
 *   a measurements set of MeasurementID (IDs of Measurement documents)
 */
interface BodyMapIDs {
  _id: BodyMapID;
  user: User;
  name: string;
  timestamp: Date;
  measurements: MeasurementID[];
}

/**
 * @state a set of Measurements with
 *   a type String (e.g., "waist", "chest", "arm", "thigh")
 *   a value Number (e.g., in cm or inches)
 *   a unit String (e.g., "cm", "in")
 *   a timestamp Date
 *   a bodyMap BodyMapID (reference to the BodyMapID it belongs to)
 */
interface Measurements {
  _id: MeasurementID;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  bodyMap: BodyMapID;
}

// Input type for initial measurements within generateMap action
interface InitialMeasurementInput {
  type: string;
  value: number;
  unit: string;
}

export default class BodyMapGenerationConcept {
  users: Collection<Users>;
  bodyMaps: Collection<BodyMapIDs>;
  measurements: Collection<Measurements>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.bodyMaps = this.db.collection(PREFIX + "bodyMaps");
    this.measurements = this.db.collection(PREFIX + "measurements");
  }

  /**
   * @action generateMap (user: User, name: String, initialMeasurements: set of (type: String, value: Number, unit: String)): (bodyMapID: BodyMapID)
   * @requires no existing BodyMapID for the given user and name combination
   * @effects a new BodyMapID is created, associated with the user and name, and the
   *   initialMeasurements are recorded and linked to this BodyMapID. The timestamp
   *   of the BodyMapID and each measurement is set to the current time.
   */
  async generateMap(
    {
      user,
      name,
      initialMeasurements,
    }: {
      user: User;
      name: string;
      initialMeasurements: InitialMeasurementInput[];
    },
  ): Promise<{ bodyMapID: BodyMapID } | { error: string }> {
    // Requires: no existing BodyMapID for the given user and name combination
    const existingMap = await this.bodyMaps.findOne({ user, name });
    if (existingMap) {
      return {
        error: "A body map with this name already exists for this user.",
      };
    }

    // Effects: Create a new BodyMapID and associate initial measurements
    const newBodyMapID = freshID() as BodyMapID;
    const now = new Date();

    const measurementIDs: MeasurementID[] = [];
    const measurementsToInsert: Measurements[] = [];

    // Process initial measurements to create Measurement documents
    for (const measurement of initialMeasurements) {
      const newMeasurementID = freshID() as MeasurementID;
      measurementIDs.push(newMeasurementID);
      measurementsToInsert.push({
        _id: newMeasurementID,
        type: measurement.type,
        value: measurement.value,
        unit: measurement.unit,
        timestamp: now,
        bodyMap: newBodyMapID, // Link measurement to the new body map
      });
    }

    // Insert the new BodyMapID document
    await this.bodyMaps.insertOne({
      _id: newBodyMapID,
      user,
      name,
      timestamp: now,
      measurements: measurementIDs, // Store IDs of associated measurements
    });

    // Insert all initial measurements. Only perform if there are measurements to insert.
    if (measurementsToInsert.length > 0) {
      await this.measurements.insertMany(measurementsToInsert);
    }

    // Update the Users collection to link the new bodyMapID to the user.
    // Use upsert: true to create the user document if it doesn't exist.
    await this.users.updateOne(
      { _id: user },
      { $addToSet: { bodyMaps: newBodyMapID } }, // Add the new bodyMapID to the user's list
      { upsert: true },
    );

    // Return the newly created bodyMapID
    return { bodyMapID: newBodyMapID };
  }

  /**
   * @action addMeasurement (bodyMapID: BodyMapID, type: String, value: Number, unit: String): Empty
   * @requires the bodyMapID exists
   * @effects a new Measurement is created, associated with the bodyMapID, type, value,
   *   and unit. Its timestamp is set to the current time. The MeasurementID is added
   *   to the bodyMap's list of measurements.
   */
  async addMeasurement(
    {
      bodyMapID,
      type,
      value,
      unit,
    }: { bodyMapID: BodyMapID; type: string; value: number; unit: string },
  ): Promise<Empty | { error: string }> {
    // Requires: the bodyMapID exists
    const existingBodyMap = await this.bodyMaps.findOne({ _id: bodyMapID });
    if (!existingBodyMap) {
      return { error: "Body map not found." };
    }

    // Effects: Create a new Measurement and link it
    const newMeasurementID = freshID() as MeasurementID;
    const now = new Date();

    await this.measurements.insertOne({
      _id: newMeasurementID,
      type,
      value,
      unit,
      timestamp: now,
      bodyMap: bodyMapID,
    });

    // Add the new measurement's ID to the body map's list of measurements
    await this.bodyMaps.updateOne(
      { _id: bodyMapID },
      { $addToSet: { measurements: newMeasurementID } },
    );

    return {};
  }

  /**
   * @query _getMapDetails (bodyMapID: BodyMapID): (user: User, name: String, measurements: set of (type: String, value: Number, unit: String, timestamp: Date))
   * @requires the bodyMapID exists
   * @effects returns the details of the specified body map, including its associated user,
   *   name, and all recorded measurements.
   */
  async _getMapDetails(
    { bodyMapID }: { bodyMapID: BodyMapID },
  ): Promise<
    | {
      user: User;
      name: string;
      measurements: {
        type: string;
        value: number;
        unit: string;
        timestamp: Date;
      }[];
    }
    | { error: string }
  > {
    // Requires: the bodyMapID exists
    const bodyMap = await this.bodyMaps.findOne({ _id: bodyMapID });
    if (!bodyMap) {
      return { error: "Body map not found." };
    }

    // Effects: returns the details
    // Find all measurements linked to this bodyMapID
    const associatedMeasurements = await this.measurements.find(
      { bodyMap: bodyMapID },
      // Project out internal MongoDB _id and the bodyMap reference, as they are not
      // part of the query's specified return structure.
    ).project({ _id: 0, bodyMap: 0 }).toArray();

    return {
      user: bodyMap.user,
      name: bodyMap.name,
      measurements: associatedMeasurements,
    };
  }
}
```
