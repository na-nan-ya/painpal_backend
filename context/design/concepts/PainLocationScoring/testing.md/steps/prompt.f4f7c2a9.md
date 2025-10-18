---
timestamp: 'Fri Oct 17 2025 21:18:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_211803.d849f333.md]]'
content_id: f4f7c2a9961bcca2fcd1cba92689a2e5bd4adc97ee7e49478b00ea814357fe4a
---

# prompt: You are given an example Deno test suite for a LikertSurvey concept implementation. Use it as a model for how to structure and phrase tests — including the principles, action requirements, use of testDb(), assertions (assertEquals, assertNotEquals, etc.), and clean test isolation via client.close(). Now, write a complete Deno test suite for the given PainLocationScoring implementation. Explicitly call generateMap() from BodyMapGeneration and use the result to test PainLocationScoring. Do NOT internally create any maps as a part of PainLocationScoring.

You are tasked with writing a **Deno test suite** for PainLocationScoring, performing **integrated testing** with BodyMapGeneration, while following modularity rules.

* Use the **LikertSurvey test suite** as a model for structure, phrasing, and best practices: top-level “Principle” tests, smaller “Action” tests, use of `testDb()`, assertions (`assertEquals`, `assertNotEquals`, `assertExists`), and clean isolation via `client.close()`.
* PainLocationScoring **must not create maps internally**. Instead, first EXPLICITLY call `BodyMapGeneration.generateMap(user, date)` to create a valid map in your test sequence, and use the resulting map ID as input to PainLocationScoring actions.
* Top-level **Principle test**: generate map → add region → score region → delete region → verify state at each step.
* Separate **Action tests**: adding duplicate regions, scoring out-of-bounds, deleting non-existent or unowned regions.
* All action calls and results must use **primitive IDs or numbers only**, without exposing internal composite objects.
* Print console messages for inputs, outputs, and verification steps.
* Ensure **programmatic assertions** determine success/failure.
* Clean up each test with `await client.close()` in a `finally` block.
