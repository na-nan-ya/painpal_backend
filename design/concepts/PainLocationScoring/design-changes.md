**Issues:**

There were no edits suggested for this concept on Assignment 2.
However, I did encounter issues handling the pre-conditions. Since regions are ultimately associated with Maps, I was unsure about how to handle the fact that I need a Map to execute this concept but the actual creation of the Map is not a part of it.
I ultimately called generateMap() as precursor action and ensured that any actions in PainLocationScoring did not modify the actual state of BodyMapGeneration, keeping them insular. I think it is similar to an Upvoting vs Posting concept. You cannot upvote a post if it doesn't exist, but you cannot create a post within the Upvoting concept. This was the understanding that informed my decision to use an action from another concept to enable testing of this one.