You are tasked with writing a **Deno test suite** for PainLocationScoring, performing **integrated testing** with BodyMapGeneration, while following modularity rules.

- Use the **LikertSurvey test suite** as a model for structure, phrasing, and best practices: top-level “Principle” tests, smaller “Action” tests, use of `testDb()`, assertions (`assertEquals`, `assertNotEquals`, `assertExists`), and clean isolation via `client.close()`.
- PainLocationScoring **must not create maps internally**. Instead, first EXPLICITLY call `BodyMapGeneration.generateMap(user, date)` to create a valid map in your test sequence, and use the resulting map ID as input to PainLocationScoring actions.
- Top-level **Principle test**: generate map → add region → score region → delete region → verify state at each step.
- Separate **Action tests**: adding duplicate regions, scoring out-of-bounds, deleting non-existent or unowned regions.
- All action calls and results must use **primitive IDs or numbers only**, without exposing internal composite objects.
- Ensure **programmatic assertions** determine success/failure.  
- Clean up each test with `await client.close()` in a `finally` block.
