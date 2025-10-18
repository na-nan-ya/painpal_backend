**Changes based on Assignment 2 feedback:**

- I added the idea of ownership and user-specific associations when carrying out actions. Since there is no separate UserAuthentication concept as of now, it makes sense to preserve individual users' data by verifying ownership of the items they can access and modify.

- I also updated the time model to be less clunky. The idea is for the app to have a 24-hour refresh that automatically generates a new Map and saves the Old one. Although I don't think there was big difference implementation-wise, the design-level abstraction was impacted by this to look more intuitive.

**Issues:**

- The LLM appeared to have a difficult time simultaneously maintaining multiple Map IDs associated with a single User. It made me question whether it is more important to have a specific UserAccount or authentication-based concept that would further modularise individual users' data in a manageable way.