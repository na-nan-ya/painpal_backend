---
timestamp: 'Fri Oct 17 2025 11:58:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_115822.6d71282c.md]]'
content_id: 2e344393954004049160e1aa4854d99c1e161f76216a2677d44866ea778e0d39
---

# concept: BodyMapGeneration \[User]

**purpose** provide a daily visual representation of the body for users to track changes over time, without including any notion of body measurements.

**principle** after a map is generated, it becomes the user's current map. At midnight, the user's current map is automatically saved to a historical archive and a new one is automatically generated for the next day for all users.

**state**

* `users`: a set of Users with
  * `currentMapId`: `Map | null` (ID of the map currently active for the user)
* `maps`: a set of Maps with
  * `_id`: `Map`
  * `ownerId`: `User`
  * `creationDate`: `Date`
  * `imageUrl`: `String` (a placeholder for the visual representation)
  * `isSaved`: `Boolean` (default: false, set to true when it's no longer the current map or explicitly saved)
* `dailyGenerationStatus`: A single record to track the last time the daily generation system action ran.
  * `_id`: `String = "dailyGeneration"`
  * `lastRunDate`: `Date` (timestamp of the last successful daily map generation)

**actions**

* `generateMap (user: User): (mapId: Map)`
  * **requires** `true`
  * **effects**
    * If `user` has an existing `currentMapId`:
      * That map's `isSaved` property is set to `true`.
    * A new `Map` is created:
      * `_id`: `freshID()`
      * `ownerId`: `user`
      * `creationDate`: `current Date`
      * `imageUrl`: `"default_map.png"` (or similar placeholder, no body measurements implied)
      * `isSaved`: `false`
    * The `user`'s `currentMapId` is updated to this new `Map`'s ID.
    * Returns the `_id` of the newly generated `Map`.

* `saveMap (user: User): Empty`
  * **requires** `user` has a `currentMapId`.
  * **effects**
    * The `Map` referenced by `user`'s `currentMapId` has its `isSaved` property set to `true`. This action allows a user to manually archive their current map at any time.

* `clearMap (user: User): Empty`
  * **requires** `user` has a `currentMapId`.
  * **effects**
    * The `Map` referenced by `user`'s `currentMapId` is deleted from the `maps` collection.
    * The `user`'s `currentMapId` is set to `null`.

* `system triggerDailyMapGeneration (): Empty`
  * **requires** The current time is 00:00:00 (midnight) of a new day, AND `dailyGenerationStatus.lastRunDate` is not today's date (i.e., this action has not run yet for the current day).
  * **effects**
    * For each `user` in the `users` collection:
      * Call `generateMap(user)`. (This will implicitly save the previous `currentMap` if one exists, then create a new one).
    * Update `dailyGenerationStatus.lastRunDate` to the current date.

***
