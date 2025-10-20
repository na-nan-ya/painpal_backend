**concept** PainLocationScoring <br />
**purpose** users can select a region on the body map and rate the pain on a scale of 1 to 10 <br />
**principle** each region on a body map may be assigned a numerical score representing pain intensity <br />
<br />
**state** <br />
a set of Users with <br />
 a set of body Maps <br />
a set of body Maps with <br />
 a set of Regions <br />
a set of Regions with <br />
 a scaled score Number <br />
<br />
**actions** <br />
addRegion(user: User, map: Map, region: Region): (region: Region) <br />
 **requires** the Map must already exist for the given User <br />
 **effects** creates and returns a new Region on that Map <br />
<br />
scoreRegion(user: User, region: Region, score: Number) <br />
 **requires** the Region must exist within the User’s Map and the Number must be between 1 and 10 <br />
 **effects** associates the Number with that Region <br />
<br />
deleteRegion(user: User, region: Region) <br />
 **requires** the Region must already exist within the User’s Map <br />
 **effects** removes the Region from the associated Map <br />
