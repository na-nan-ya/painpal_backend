---
timestamp: 'Fri Oct 17 2025 21:06:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_210636.ac464248.md]]'
content_id: ea41804d7d775fc55e57b11cf692e4097417f0ff8ab3a8ed8f7f6021ed7d25a6
---

# test: PainLocationScoring

You are tasked with writing a **Deno test suite** for PainLocationScoring, performing **integrated testing** with BodyMapGeneration, while following modularity rules.

* Use the **LikertSurvey test suite** as a model for structure, phrasing, and best practices: top-level “Principle” tests, smaller “Action” tests, use of `testDb()`, assertions (`assertEquals`, `assertNotEquals`, `assertExists`), and clean isolation via `client.close()`.
* PainLocationScoring **must not create maps internally**. Instead, first call `BodyMapGeneration.generateMap(user, date)` to create a valid map in your test sequence, and use the resulting map ID as input to PainLocationScoring actions.
* Top-level **Principle test**: generate map → add region → score region → delete region → verify state at each step.
* Separate **Action tests**: adding duplicate regions, scoring out-of-bounds, deleting non-existent or unowned regions.
* All action calls and results must use **primitive IDs or numbers only**, without exposing internal composite objects.
* Print console messages for inputs, outputs, and verification steps.
* Ensure **programmatic assertions** determine success/failure.
* Clean up each test with `await client.close()` in a `finally` block.
