
**Interesting moments:**
- The LLM started producing code in Python despite multiple context files specifying TypeScript.
[response.10e6e658](../context/design/concepts/PainLocationScoring/implementation.md/steps/response.10e6e658.md)

- Initially, the LLM designed the PainLocationScoring implementatin with helper functions that created maps directly as a part of the concept, violating the purpose and principle of the concept. I added a background document that prohibited it from doing so and to have the test suite work on the basis of integrated testing instead by calling generateMap().
Faulty response: [response.a3f9429d](../context/design/concepts/PainLocationScoring/implementation.md/steps/response.a3f9429d.md)
Background documents added: 
	[PainLocationScoringNotes](background/PainLocationScoringNotes.md)
	[PainLocationScoringTesting](background/PainLocationScoringTesting.md)

- Early versions allowed users to generate and save multiple maps in one day. Interestingly, I didn't actually catch this error until after the LLM fixed it on its own! I don't know why the same context documents provided during both prompts would result in the LLM catching its own error in testing the implementation.
Faulty response: [file.8bc464f9](../context/design/concepts/BodyMapGeneration/testing.md/steps/file.8bc464f9.md)


