**concept** BodyMapGeneration <br />
**purpose** a body map is saved at the end of each day and a fresh one is created for usage the next day <br />
**principle** each user has exactly one body map per calendar day, created and stored using date-based association <br />
<br />
**state** <br />
a set of Users with <br />
 a set of calendar Days <br />
a set of calendar Days with <br />
 a single body Map <br />
a set of body Maps with <br />
 a set of Highlights <br />
 a Date timestamp <br />
<br />
**actions** <br />
generateMap(user: User, date: DateTime): (bodymap: Map) <br />
 **requires** no other Map exists for the same User and Date <br />
 **effects** creates and returns a fresh Map associated with that Date for the given User <br />
saveMap(user: User, bodymap: Map, date: DateTime) <br />
 **requires** the Map must exist and belong to the given User <br />
 **effects** saves the Map associated with that Date for that User <br />
clearMap(user: User, bodymap: Map): (bodymap: Map) <br />
 **requires** the Map must exist for the User and have at least one Highlight <br />
 **effects** removes all Highlights from the Map and returns it <br />
