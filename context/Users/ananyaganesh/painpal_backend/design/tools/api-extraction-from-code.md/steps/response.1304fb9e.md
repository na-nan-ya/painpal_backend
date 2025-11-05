---
timestamp: 'Tue Nov 04 2025 21:06:34 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_210634.8a15ce7a.md]]'
content_id: 1304fb9ed864512d6423b1f1aab0dbea711bc6ea2a41429308afc6d271c35c30
---

# response:

````markdown
# API Specification: BodyMapGeneration Concept

**Purpose:** provide a daily visual representation of the body for users to track changes over time, without including any notion of body measurements.

---

## API Endpoints

### POST /api/BodyMapGeneration/generateMap

**Description:** Generates a new body map for a user.

**Requirements:**
- true

**Effects:**
- If user has an existing currentMapId: That map's isSaved property is set to true.
- A new Map is created with ownerId, current Date, placeholder imageUrl, and isSaved: false.
- The user's currentMapId is updated to this new Map's ID.
- Returns the _id of the newly generated Map.

**Request Body:**
```json
{
  "user": "string"
}
````

**Success Response Body (Action):**

```json
{
  "mapId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BodyMapGeneration/saveMap

**Description:** Allows a user to manually archive their current map at any time.

**Requirements:**

* user has a currentMapId.

**Effects:**

* The Map referenced by user's currentMapId has its isSaved property set to true.
* This action allows a user to manually archive their current map at any time.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BodyMapGeneration/clearMap

**Description:** Deletes the user's current body map and clears the reference.

**Requirements:**

* user has a currentMapId.

**Effects:**

* The Map referenced by user's currentMapId is deleted from the maps collection.
* The user's currentMapId is set to null.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BodyMapGeneration/triggerDailyMapGeneration

**Description:** System action to automatically generate and save maps for all users daily.

**Requirements:**

* The current time is 00:00:00 (midnight) of a new day, AND dailyGenerationStatus.lastRunDate is not today's date.

**Effects:**

* For each user in the users collection: Call generateMap(user). (This will implicitly save the previous currentMap if one exists, then create a new one).
* Update dailyGenerationStatus.lastRunDate to the current date.

**Request Body:**

```json
{}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BodyMapGeneration/\_getCurrentMap

**Description:** Returns the current map for a given user, or null if none exists.

**Requirements:**

* (Implicit from effects: No explicit requirements other than valid user ID)

**Effects:**

* Returns the current map for a given user, or null if none exists.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "map": {
      "_id": "string",
      "ownerId": "string",
      "creationDate": "string",
      "imageUrl": "string",
      "isSaved": "boolean"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/BodyMapGeneration/\_getSavedMaps

**Description:** Returns all saved maps for a given user.

**Requirements:**

* (Implicit from effects: No explicit requirements other than valid user ID)

**Effects:**

* Returns all saved maps for a given user.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "ownerId": "string",
    "creationDate": "string",
    "imageUrl": "string",
    "isSaved": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
