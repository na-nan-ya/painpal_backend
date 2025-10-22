---
timestamp: 'Tue Oct 21 2025 19:37:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_193745.96d05d8c.md]]'
content_id: 76d6a3818bfac53de92bc5e59e5f8565d38f71ff8e5ecf4c2d08f89417e34220
---

# API Specification: BodyMapGeneration Concept

**Purpose:** provide a daily visual representation of the body for users to track changes over time, without including any notion of body measurements.

***

## API Endpoints

### POST /api/BodyMapGeneration/generateMap

**Description:** Generates a new body map for a user, marking any existing current map as saved.

**Requirements:**

* true

**Effects:**

* If user has an existing currentMapId: That map's isSaved property is set to true.
* A new Map is created with ownerId, current Date, placeholder imageUrl, and isSaved: false.
* The user's currentMapId is updated to this new Map's ID.
* Returns the \_id of the newly generated Map.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "mapId": "ID"
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

**Description:** Manually archives the user's current map at any time by setting its isSaved property to true.

**Requirements:**

* user has a currentMapId.

**Effects:**

* The Map referenced by user's currentMapId has its isSaved property set to true.
* This action allows a user to manually archive their current map at any time.

**Request Body:**

```json
{
  "user": "ID"
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

**Description:** Deletes the user's current map and removes the reference to it.

**Requirements:**

* user has a currentMapId.

**Effects:**

* The Map referenced by user's currentMapId is deleted from the maps collection.
* The user's currentMapId is set to null.

**Request Body:**

```json
{
  "user": "ID"
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

**Description:** Initiates the daily process of generating new body maps for all users.

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

* true

**Effects:**

* Returns the current map for a given user, or null if none exists.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "map": {
      "_id": "ID",
      "ownerId": "ID",
      "creationDate": "string (ISO 8601)",
      "imageUrl": "string",
      "isSaved": "boolean"
    }
  },
  {
    "map": null
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

* true

**Effects:**

* Returns all saved maps for a given user.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "maps": [
      {
        "_id": "ID",
        "ownerId": "ID",
        "creationDate": "string (ISO 8601)",
        "imageUrl": "string",
        "isSaved": "boolean"
      },
      {
        "_id": "ID",
        "ownerId": "ID",
        "creationDate": "string (ISO 8601)",
        "imageUrl": "string",
        "isSaved": "boolean"
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
