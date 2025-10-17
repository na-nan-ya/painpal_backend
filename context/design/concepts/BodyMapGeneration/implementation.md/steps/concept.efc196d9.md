---
timestamp: 'Fri Oct 17 2025 11:50:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_115051.2d5dfd21.md]]'
content_id: efc196d9f9f0f1dd7a1b9c7e97788a0ec732337b0ca51792f2e3b0d5ed0ffe71
---

# concept: BodyMapGeneration

**concept** BodyMapGeneration \[User]

**purpose** To associate a unique, generic body outline reference with a user.

**principle** A user can request to generate a body outline, and the concept will create a unique reference for a generic outline for them, ensuring they only have one such outline. Subsequent attempts to generate a map for the same user will result in an error.

**state**
  a set of Users with
    a bodyMap BodyMap // An ID referencing the generic body outline associated with the user.

**actions**
  generateMap (user: User): (bodyMapId: BodyMap)
    **requires** the `user` does not already have an associated `bodyMap`.
    **effects** a new `BodyMap` ID is generated (`freshID()`) and associated with the `user`. The generated `bodyMapId` is returned.

  generateMap (user: User): (error: String)
    **requires** the `user` already has an associated `bodyMap`.
    **effects** returns an error message indicating that a map already exists for the user.

**queries**
  \_getBodyMap (user: User): (bodyMapId: BodyMap)
    **requires** the `user` has an associated `bodyMap`.
    **effects** returns the `bodyMapId` associated with the `user`.

  \_getBodyMap (user: User): (error: String)
    **requires** the `user` does not have an associated `bodyMap`.
    **effects** returns an error message indicating no map exists for the user.

***
