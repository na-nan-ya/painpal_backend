---
timestamp: 'Fri Oct 17 2025 11:50:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_115051.2d5dfd21.md]]'
content_id: e856c8a5579e49783b5b73e247d27c3e8fe231451f9485f30b98eabf1d135c92
---

# file: src/BodyMapGeneration/BodyMapGenerationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "../../utils/types.ts"; // Adjust path as necessary
import { freshID } from "../../utils/database.ts"; // Adjust path as necessary

// Declare collection prefix, use concept name
const PREFIX = "BodyMapGeneration" + ".";

// Generic type parameters for this concept
type User = ID;
type BodyMap = ID;

/**
 * State:
 * a set of Users with
 *   a bodyMap BodyMap
 */
interface UserBodyMap {
  _id: User; // The ID of the user
  bodyMapId: BodyMap; // The ID of the generic body outline associated with the user
}

/**
 * concept BodyMapGeneration [User]
 *
 * purpose: To associate a unique, generic body outline reference with a user.
 *
 * principle: A user can request to generate a body outline, and the concept will create a unique
 * reference for a generic outline for them, ensuring they only have one such outline.
 * Subsequent attempts to generate a map for the same user will result in an error.
 */
export default class BodyMapGenerationConcept {
  private userBodyMaps: Collection<UserBodyMap>;

  constructor(private readonly db: Db) {
    this.userBodyMaps = this.db.collection<UserBodyMap>(PREFIX + "userBodyMaps");
  }

  /**
   * action generateMap (user: User): (bodyMapId: BodyMap)
   *
   * requires: the `user` does not already have an associated `bodyMap`.
   * effects: a new `BodyMap` ID is generated (`freshID()`) and associated with the `user`.
   *          The generated `bodyMapId` is returned.
   *
   * action generateMap (user: User): (error: String)
   *
   * requires: the `user` already has an associated `bodyMap`.
   * effects: returns an error message indicating that a map already exists for the user.
   */
  async generateMap({ user }: { user: User }): Promise<{ bodyMapId: BodyMap } | { error: string }> {
    // Check if the user already has a body map
    const existingMap = await this.userBodyMaps.findOne({ _id: user });

    if (existingMap) {
      // Precondition check: `user` already has an associated `bodyMap`.
      // Effect: Returns an error message.
      return { error: `Body map already exists for user ${user}.` };
    }

    // Precondition check: `user` does not already have an associated `bodyMap`.
    // Effect: A new `BodyMap` ID is generated and associated with the `user`.
    //         The generated `bodyMapId` is returned.
    const newBodyMapId = freshID();
    const result = await this.userBodyMaps.insertOne({
      _id: user,
      bodyMapId: newBodyMapId,
    });

    if (result.acknowledged) {
      return { bodyMapId: newBodyMapId };
    } else {
      // This case handles potential database write failures even if acknowledged is true,
      // though typically result.acknowledged implies success in simple insert operations.
      return { error: "Failed to acknowledge body map generation." };
    }
  }

  /**
   * query _getBodyMap (user: User): (bodyMapId: BodyMap)
   *
   * requires: the `user` has an associated `bodyMap`.
   * effects: returns the `bodyMapId` associated with the `user`.
   *
   * query _getBodyMap (user: User): (error: String)
   *
   * requires: the `user` does not have an associated `bodyMap`.
   * effects: returns an error message indicating no map exists for the user.
   */
  async _getBodyMap({ user }: { user: User }): Promise<{ bodyMapId: BodyMap } | { error: string }> {
    const existingMap = await this.userBodyMaps.findOne({ _id: user });

    if (existingMap) {
      return { bodyMapId: existingMap.bodyMapId };
    } else {
      return { error: `No body map found for user ${user}.` };
    }
  }
}
```
