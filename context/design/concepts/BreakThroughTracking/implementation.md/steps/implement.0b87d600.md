---
timestamp: 'Fri Oct 17 2025 22:09:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_220902.1efdcc97.md]]'
content_id: 0b87d600b2bacda9cc96805e8120f4fcf688d99ca2c3f89ba825c478e01cb26a
---

# implement: BreakThroughTracking

**concept** BreakThroughTracking
**purpose** record, edit, and summarise occurrences of breakthrough pain events
**principle** breakthrough pain events are tracked within months to determine frequency, average duration, and overlap patterns; users may edit or delete entries

**state**
a set of Users with
 a set of Months

a set of Months with
 a set of Breakthroughs
 a breakthrough Summary

a set of Breakthroughs with
 a Start time
 an End time
 a duration Number

a breakthrough Summary with
 a Number of breakthroughs
 an average duration Number

**actions**
startBreakthrough(user: User, startTime: DateTime, month: Month): (pain: Breakthrough)
 **requires** no overlapping Breakthrough exists for the same User and time range
 **effects** creates and returns a new Breakthrough pain event associated with the Month

endBreakthrough(user: User, pain: Breakthrough, endTime: DateTime): (pain: Breakthrough)
 **requires** the Breakthrough has a Start time and belongs to the User
 **effects** sets the End time, computes Duration, and returns the completed Breakthrough

editBreakthrough(user: User, pain: Breakthrough, newStart: DateTime, newEnd: DateTime): (pain: Breakthrough)
   **requires** the Breakthrough exists for the User
   **effects** updates the Start/End times, recomputes Duration, and ensures no overlap with other Breakthroughs

deleteBreakthrough(user: User, pain: Breakthrough)
 **requires** the Breakthrough exists for the User
 **effects** removes the Breakthrough from the associated Month

summarise(user: User, month: Month, avgDuration: Number, frequency: Number): (summary: String)
 **effects** returns a summary String with the frequency and average duration for the Month
