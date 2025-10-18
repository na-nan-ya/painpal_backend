running 1 test from ./src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts
BodyMapGeneration ...
  Principle: BodyMapGeneration Lifecycle ...
------- output -------
Principle: Generating first map for User 1
Principle: Querying current map for User 1
Principle: Saving current map for User 1
Principle: Generating second map for User 1
Principle: Querying saved maps for User 1
Principle: Generating map for User 2 for daily gen setup
Principle: Manually set dailyGenerationStatus to yesterday: 2025-10-17T03:28:31.465Z
Principle: Triggering daily map generation

Starting daily map generation for date: 2025-10-17T04:00:00.000Z

Processing daily map generation for user: user123_principle
Processing daily map generation for user: user456_principle

Daily map generation completed for date: 2025-10-17T04:00:00.000Z

Principle: Daily map generation triggered successfully.
Principle: Verifying User 1's state after daily generation
Principle: Verifying User 2's state after daily generation
Principle: Clearing current map for User 1
----- output end -----

  Principle: BodyMapGeneration Lifecycle ... ok (1s)
  Action: Generating a map for a new user correctly initializes their state ... ok (735ms)
  Action: Generating a map twice for the same user on the same day updates current and saves previous ... ok (1s)
  Action: Saving a map fails if user has no current map ... ok (865ms)
  Action: Clearing a map fails if user has no current map ... ok (760ms)
  Action: Daily map generation fails if run twice on the same calendar day ...

------- output -------
Starting daily map generation for date: 2025-10-17T04:00:00.000Z
Processing daily map generation for user: userForDailyGenCheck_action
Daily map generation completed for date: 2025-10-17T04:00:00.000Z
----- output end -----

  Action: Daily map generation fails if run twice on the same calendar day ... ok (969ms)
  Action: Daily map generation runs successfully when no users exist ...

------- output -------
Starting daily map generation for date: 2025-10-17T04:00:00.000Z
Daily map generation completed for date: 2025-10-17T04:00:00.000Z
----- output end -----

  Action: Daily map generation runs successfully when no users exist ... ok (722ms)
BodyMapGeneration ... ok (6s)