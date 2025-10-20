**concept** BreakThroughTracking <br />
**purpose** record, edit, and summarise occurrences of breakthrough pain events <br />
**principle** breakthrough pain events are tracked within months to determine frequency, average duration, and overlap patterns; users may edit or delete entries <br />
<br />

**state** <br />
a set of Users with <br />
 a set of Months <br />
<br />
a set of Months with <br />
 a set of Breakthroughs <br />
 a breakthrough Summary <br />
<br />
a set of Breakthroughs with <br />
 a Start time <br />
 an End time <br />
 a duration Number <br />
<br />
a breakthrough Summary with <br />
 a Number of breakthroughs <br />
 an average duration Number <br />
<br />
**actions** <br />
  startBreakthrough(user: User, startTime: DateTime, month: Month): (pain: Breakthrough) <br />
   **requires** no overlapping Breakthrough exists for the same User and time range <br />
   **effects** creates and returns a new Breakthrough pain event associated with the Month <br />
<br />
  endBreakthrough(user: User, pain: Breakthrough, endTime: DateTime): (pain: Breakthrough) <br />
   **requires** the Breakthrough has a Start time and belongs to the User <br />
   **effects** sets the End time, computes Duration, and returns the completed Breakthrough <br />
<br />
  editBreakthrough(user: User, pain: Breakthrough, newStart: DateTime, newEnd: DateTime): (pain: Breakthrough) <br />
   **requires** the Breakthrough exists for the User <br />
   **effects** updates the Start/End times, recomputes Duration, and ensures no overlap with other Breakthroughs <br />
<br />
 deleteBreakthrough(user: User, pain: Breakthrough) <br />
   **requires** the Breakthrough exists for the User <br />
   **effects** removes the Breakthrough from the associated Month <br />
<br />
summarise(user: User, month: Month, avgDuration: Number, frequency: Number): (summary: String) <br />
 **effects** returns a summary String with the frequency and average duration for the Month <br />
