running 6 tests from ./src/concepts/BreakThroughTracking/BreakThroughTrackingConcept.test.ts
BreakThroughTrackingConcept: Principle - Track, edit, and summarise breakthrough pain events ...
------- post-test output -------
Principle Trace: Breakthrough Pain Event Lifecycle
  
  --- Step 1: UserA starts a breakthrough event (Pain #1) ---
  User user:Alice started Breakthrough #bacb0a at 2023-10-10T09:00:00.000Z. Status: Ongoing.
  
  --- Step 2: UserA ends the first breakthrough (Pain #1) ---
  User user:Alice ended Breakthrough #bacb0a at 2023-10-10T09:30:00.000Z. Duration: 30 min.
  
  --- Step 3: UserA starts a second breakthrough (Pain #2) in the same month ---
  User user:Alice started Breakthrough #8907f5 at 2023-10-10T10:00:00.000Z. Status: Ongoing.
  
  --- Step 4: UserA tries to start an overlapping breakthrough while Pain #2 is ongoing (expected to fail) ---
  Attempt to start new breakthrough at 2023-10-10T10:15:00.000Z failed as expected: An overlapping breakthrough already exists or is ongoing for this user in this month..
  
  --- Step 5: UserA ends the second breakthrough (Pain #2) ---
  User user:Alice ended Breakthrough #8907f5 at 2023-10-10T11:00:00.000Z. Duration: 60 min.
  
  --- Step 6: UserA edits the first breakthrough (Pain #1) to a slightly different time range ---
  User user:Alice edited Breakthrough #bacb0a. New range: 2023-10-10T08:55:00.000Z - 2023-10-10T09:25:00.000Z. New duration: 30 min.
  
  --- Step 7: UserB starts and ends a breakthrough (Pain #3) in the same month (Oct2023) ---
  User user:Bob completed Breakthrough #9e7f79. Duration: 45 min.
  
  --- Step 8: Summarise breakthrough events for UserA in October 2023 ---
  Summary for user:Alice, 2023-10: Summary for user:Alice in 2023-10: 2 breakthrough(s) with an average duration of 45.00 minutes.
  
  --- Step 9: UserA deletes the first breakthrough (Pain #1) ---
  User user:Alice deleted Breakthrough #bacb0a.
  
  --- Step 10: Summarise again for UserA in October 2023 to verify deletion and updated summary ---
  Summary for user:Alice, 2023-10 after deletion: Summary for user:Alice in 2023-10: 1 breakthrough(s) with an average duration of 60.00 minutes.
  
  --- Step 11: Verify UserB's summary in Oct2023 is unaffected by UserA's actions ---
  Summary for user:Bob, 2023-10: Summary for user:Bob in 2023-10: 1 breakthrough(s) with an average duration of 45.00 minutes.
----- post-test output end -----

BreakThroughTrackingConcept: Principle - Track, edit, and summarise breakthrough pain events ... ok (1s)
BreakThroughTrackingConcept: startBreakthrough requirements and effects ... ok (909ms)
BreakThroughTrackingConcept: endBreakthrough requirements and effects ... ok (861ms)
BreakThroughTrackingConcept: editBreakthrough requirements and effects ... ok (914ms)
BreakThroughTrackingConcept: deleteBreakthrough requirements and effects ... ok (753ms)
BreakThroughTrackingConcept: summarise effects ... ok (1s)