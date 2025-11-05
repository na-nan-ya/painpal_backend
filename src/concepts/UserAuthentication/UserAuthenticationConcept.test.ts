import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication", async (test) => {
  let client: MongoClient | null = null;
  let db: Db;

  await test.step("Principle: UserAuthentication Lifecycle", async () => {
    try {
      [db, client] = await testDb();
      const concept = new UserAuthenticationConcept(db);

      const testUsername1 = "testuser1_principle";
      const testPassword1 = "password123";
      const testUsername2 = "testuser2_principle";
      const testPassword2 = "securepass456";

      let user1Id: ID;
      let user2Id: ID;
      let session1Id: ID;
      let session2Id: ID;

      // Action: Register User 1
      console.log("Principle: Registering User 1");
      const registerResult1 = await concept.register({
        username: testUsername1,
        password: testPassword1,
      });
      assertExists(registerResult1, "Expected a result from register");
      assert(
        "user" in registerResult1,
        `Error registering user: ${JSON.stringify(registerResult1)}`,
      );
      user1Id = registerResult1.user;
      assertExists(user1Id, "Expected user1Id to be defined");

      const user1State = await concept._getUser({ username: testUsername1 });
      assertExists(user1State, "Expected user1State to exist");
      assert("user" in user1State);
      assertExists(user1State.user, "Expected user to exist");
      assertEquals(
        user1State.user._id,
        user1Id,
        "User 1 ID should match registered user ID",
      );
      assertEquals(
        user1State.user.username,
        testUsername1,
        "User 1 username should match",
      );
      assertEquals(
        user1State.user.password,
        testPassword1,
        "User 1 password should match",
      );

      // Action: Register User 2
      console.log("Principle: Registering User 2");
      const registerResult2 = await concept.register({
        username: testUsername2,
        password: testPassword2,
      });
      assertExists(registerResult2);
      assert(
        "user" in registerResult2,
        `Error registering user 2: ${JSON.stringify(registerResult2)}`,
      );
      user2Id = registerResult2.user;
      assertExists(user2Id, "Expected user2Id to be defined");
      assertNotEquals(user1Id, user2Id, "User IDs should be different");

      // Action: Login User 1 with correct credentials
      console.log("Principle: Logging in User 1");
      const loginResult1 = await concept.login({
        username: testUsername1,
        password: testPassword1,
      });
      assertExists(loginResult1);
      assert(
        "session" in loginResult1,
        `Error logging in: ${JSON.stringify(loginResult1)}`,
      );
      assertExists(
        loginResult1.session,
        "Expected session to be non-null for correct credentials",
      );
      session1Id = loginResult1.session;

      const session1State = await concept._getSession({ session: session1Id });
      assertExists(session1State);
      assert("session" in session1State);
      assertExists(session1State.session, "Expected session to exist");
      assertEquals(
        session1State.session.userId,
        user1Id,
        "Session should be associated with User 1",
      );
      assertEquals(
        session1State.session.active,
        true,
        "Session should be active",
      );
      assertExists(
        session1State.session.startTimestamp,
        "Session should have start timestamp",
      );

      // Action: Login User 1 with incorrect password
      console.log("Principle: Attempting login with incorrect password");
      const loginResultWrong = await concept.login({
        username: testUsername1,
        password: "wrongpassword",
      });
      assertExists(loginResultWrong);
      assert(
        "session" in loginResultWrong,
        "Expected session field in result",
      );
      assertEquals(
        loginResultWrong.session,
        null,
        "Session should be null for incorrect password",
      );

      // Action: Login User 2
      console.log("Principle: Logging in User 2");
      const loginResult2 = await concept.login({
        username: testUsername2,
        password: testPassword2,
      });
      assertExists(loginResult2);
      assert("session" in loginResult2);
      assertExists(
        loginResult2.session,
        "Expected session to be non-null for User 2",
      );
      session2Id = loginResult2.session;
      assertNotEquals(
        session1Id,
        session2Id,
        "Sessions should be different",
      );

      // Action: Logout User 1
      console.log("Principle: Logging out User 1");
      const logoutResult1 = await concept.logout({ session: session1Id });
      assertExists(logoutResult1);
      assert(
        !("error" in logoutResult1),
        `Error logging out: ${JSON.stringify(logoutResult1)}`,
      );

      const session1StateAfterLogout = await concept._getSession({
        session: session1Id,
      });
      assertExists(session1StateAfterLogout);
      assert("session" in session1StateAfterLogout);
      assertExists(
        session1StateAfterLogout.session,
        "Session should still exist after logout",
      );
      assertEquals(
        session1StateAfterLogout.session.active,
        false,
        "Session should be inactive after logout",
      );

      // Verify User 2's session is still active
      const session2StateAfterUser1Logout = await concept._getSession({
        session: session2Id,
      });
      assertExists(session2StateAfterUser1Logout);
      assert("session" in session2StateAfterUser1Logout);
      assertExists(session2StateAfterUser1Logout.session);
      assertEquals(
        session2StateAfterUser1Logout.session.active,
        true,
        "User 2's session should still be active",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step(
    "Action: Registering a user with duplicate username fails",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);
        const username = "duplicate_user_action";
        const password = "password123";

        // First registration should succeed
        const registerResult1 = await concept.register({ username, password });
        assert(
          "user" in registerResult1,
          `Error registering first user: ${JSON.stringify(registerResult1)}`,
        );

        // Second registration with same username should fail
        const registerResult2 = await concept.register({ username, password });
        assert(
          "error" in registerResult2,
          "Expected error when registering duplicate username",
        );
        assert(
          registerResult2.error.includes("already exists"),
          "Error message should indicate username already exists",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: Login with non-existent username returns null session",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);

        const loginResult = await concept.login({
          username: "nonexistent_user_action",
          password: "anypassword",
        });
        assertExists(loginResult);
        assert("session" in loginResult);
        assertEquals(
          loginResult.session,
          null,
          "Session should be null for non-existent user",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: Login with incorrect password returns null session",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);
        const username = "testuser_wrongpass_action";
        const password = "correctpassword";

        // Register user
        const registerResult = await concept.register({ username, password });
        assert("user" in registerResult);

        // Try to login with wrong password
        const loginResult = await concept.login({
          username,
          password: "wrongpassword",
        });
        assertExists(loginResult);
        assert("session" in loginResult);
        assertEquals(
          loginResult.session,
          null,
          "Session should be null for incorrect password",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: Logout fails if session does not exist",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);
        const fakeSessionId = "fake_session_id" as ID;

        const logoutResult = await concept.logout({ session: fakeSessionId });
        assert(
          "error" in logoutResult,
          "Expected error when logging out non-existent session",
        );
        assert(
          logoutResult.error.includes("does not exist"),
          "Error message should indicate session does not exist",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: Logout fails if session is already inactive",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);
        const username = "testuser_logout_action";
        const password = "password123";

        // Register and login
        const registerResult = await concept.register({ username, password });
        assert("user" in registerResult);
        const loginResult = await concept.login({ username, password });
        assert("session" in loginResult);
        assertExists(loginResult.session);

        // First logout should succeed
        const logoutResult1 = await concept.logout({
          session: loginResult.session,
        });
        assert(!("error" in logoutResult1));

        // Second logout should fail
        const logoutResult2 = await concept.logout({
          session: loginResult.session,
        });
        assert(
          "error" in logoutResult2,
          "Expected error when logging out inactive session",
        );
        assert(
          logoutResult2.error.includes("already inactive"),
          "Error message should indicate session is already inactive",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: getUserMaps fails if user does not exist",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);
        const fakeUserId = "fake_user_id" as ID;
        const fakeSessionId = "fake_session_id" as ID;

        const mapsResult = await concept.getUserMaps({
          user: fakeUserId,
          session: fakeSessionId,
        });
        assert(
          "error" in mapsResult,
          "Expected error when getting maps for non-existent user",
        );
        assert(
          mapsResult.error.includes("does not exist"),
          "Error message should indicate user does not exist",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: getUserMaps fails if session is invalid or inactive",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);
        const username = "testuser_maps_action";
        const password = "password123";

        // Register user
        const registerResult = await concept.register({ username, password });
        assert("user" in registerResult);
        const userId = registerResult.user;

        // Try to get maps with invalid session
        const fakeSessionId = "fake_session_id" as ID;
        const mapsResult1 = await concept.getUserMaps({
          user: userId,
          session: fakeSessionId,
        });
        assert(
          "error" in mapsResult1,
          "Expected error when getting maps with invalid session",
        );
        assert(
          mapsResult1.error.includes("not valid or active"),
          "Error message should indicate session is not valid or active",
        );

        // Login to create a session
        const loginResult = await concept.login({ username, password });
        assert("session" in loginResult);
        assertExists(loginResult.session);

        // Logout to make session inactive
        const logoutResult = await concept.logout({
          session: loginResult.session,
        });
        assert(!("error" in logoutResult));

        // Try to get maps with inactive session
        const mapsResult2 = await concept.getUserMaps({
          user: userId,
          session: loginResult.session,
        });
        assert(
          "error" in mapsResult2,
          "Expected error when getting maps with inactive session",
        );
        assert(
          mapsResult2.error.includes("not valid or active"),
          "Error message should indicate session is not valid or active",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: getUserMaps returns empty array if user has no maps",
    async () => {
      try {
        [db, client] = await testDb();
        const concept = new UserAuthenticationConcept(db);
        const username = "testuser_nomaps_action";
        const password = "password123";

        // Register and login
        const registerResult = await concept.register({ username, password });
        assert("user" in registerResult);
        const userId = registerResult.user;
        const loginResult = await concept.login({ username, password });
        assert("session" in loginResult);
        assertExists(loginResult.session);

        // Get maps (should be empty since no maps exist)
        const mapsResult = await concept.getUserMaps({
          user: userId,
          session: loginResult.session,
        });
        assert(
          "maps" in mapsResult,
          `Error getting maps: ${JSON.stringify(mapsResult)}`,
        );
        assertEquals(
          mapsResult.maps.length,
          0,
          "User with no maps should return empty array",
        );
      } finally {
        await client?.close();
      }
    },
  );
});
