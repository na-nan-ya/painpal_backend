**concept** BodyMapGeneration
**purpose** a body map is saved at the end of each day and a fresh one is created for usage the next day
**principle** each user has exactly one body map per calendar day, created and stored using date-based association

**state**
a set of Users with
 a set of calendar Days
a set of calendar Days with
 a single body Map
a set of body Maps with
 a set of Highlights
 a Date timestamp

**actions**
system generateMap(user: User, date: DateTime): (bodymap: Map)
 **requires** no other Map exists for the same User and Date
 **effects** creates and returns a fresh Map associated with that Date for the given User
system saveMap(user: User, bodymap: Map, date: DateTime)
 **requires** the Map must exist and belong to the given User
 **effects** saves the Map associated with that Date for that User
system clearMap(user: User, bodymap: Map): (bodymap: Map)
 **requires** the Map must exist for the User and have at least one Highlight
 **effects** removes all Highlights from the Map and returns it
