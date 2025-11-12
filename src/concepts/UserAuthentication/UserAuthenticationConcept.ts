import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "UserAuthentication" + ".";

// Generic type parameters
type User = ID;
type Session = ID;
type Map = ID;

/**
 * @interface UserState
 * Represents the state of a user within the UserAuthentication concept.
 *
 * users: a set of Users with
 *   username: String
 *   password: String (stored as plain text per spec - in production should be hashed)
 */
interface UserState {
  _id: User;
  username: string;
  password: string; // Note: In production, this should be hashed
}

/**
 * @interface SessionState
 * Represents a login session for a user.
 *
 * sessions: a set of Sessions with
 *   _id: Session
 *   userId: User
 *   active: Boolean
 *   startTimestamp: Date
 */
interface SessionState {
  _id: Session;
  userId: User;
  active: boolean;
  startTimestamp: Date;
}

/**
 * @concept UserAuthentication
 * @purpose allows users to create a simple identity with a username and password, manage login sessions, and access their associated body maps.
 * @principle each user has one username and password,
 *            authentication is based on direct credential matching,
 *            logged-in users have access to their stored maps,
 *            sessions expire automatically after a set duration or when the user logs out.
 */
export default class UserAuthenticationConcept {
  // MongoDB collections for the concept's state
  users: Collection<UserState>;
  sessions: Collection<SessionState>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * register(username: String, password: String): (user: User)
   *
   * requires: no existing User has the same username
   * effects: Creates and stores a new User with the given credentials
   *          Returns the _id of the newly created User
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    try {
      // Check if username already exists
      const existingUser = await this.users.findOne({ username });
      if (existingUser) {
        return { error: `Username '${username}' already exists.` };
      }

      // Create new user
      const newUserId = freshID() as User;
      const newUser: UserState = {
        _id: newUserId,
        username,
        password, // In production, hash this before storing
      };

      await this.users.insertOne(newUser);

      return { user: newUserId };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error registering user ${username}:`, e);
        return { error: `Failed to register user: ${e.message}` };
      } else {
        console.error(`Unknown error registering user ${username}:`, e);
        return { error: "Failed to register user due to an unknown error" };
      }
    }
  }

  /**
   * login(username: String, password: String): (session: Session | null, user: User | null, username: String | null)
   *
   * requires: a User with the given username exists and password matches the username
   * effects: returns a new active Session, user ID, and username if the password matches, otherwise returns null values
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<
    | { session: Session; user: User; username: string }
    | { session: null; user: null; username: null }
    | { error: string }
  > {
    try {
      // Find user by username
      const user = await this.users.findOne({ username });
      if (!user) {
        return { session: null, user: null, username: null };
      }

      // Check password match
      if (user.password !== password) {
        return { session: null, user: null, username: null };
      }

      // Create new active session
      const newSessionId = freshID() as Session;
      const newSession: SessionState = {
        _id: newSessionId,
        userId: user._id,
        active: true,
        startTimestamp: new Date(),
      };

      await this.sessions.insertOne(newSession);

      return {
        session: newSessionId,
        user: user._id,
        username: user.username,
      };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error logging in user ${username}:`, e);
        return { error: `Failed to login: ${e.message}` };
      } else {
        console.error(`Unknown error logging in user ${username}:`, e);
        return { error: "Failed to login due to an unknown error" };
      }
    }
  }

  /**
   * logout(session: Session): Empty
   *
   * requires: the Session exists and is active
   * effects: sets the Session's active flag to false and ends the user's login session
   */
  async logout(
    { session }: { session: Session },
  ): Promise<Empty | { error: string }> {
    try {
      const sessionState = await this.sessions.findOne({ _id: session });

      // Precondition check: session must exist and be active
      if (!sessionState) {
        return { error: `Session ${session} does not exist.` };
      }
      if (!sessionState.active) {
        return { error: `Session ${session} is already inactive.` };
      }

      // Set session to inactive
      await this.sessions.updateOne(
        { _id: session },
        { $set: { active: false } },
      );

      return {};
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error logging out session ${session}:`, e);
        return { error: `Failed to logout: ${e.message}` };
      } else {
        console.error(`Unknown error logging out session ${session}:`, e);
        return { error: "Failed to logout due to an unknown error" };
      }
    }
  }

  /**
   * getUserMaps(user: User): (maps: Map[])
   *
   * requires: the User exists and has a valid active session
   * effects: returns all BodyMaps associated with that User
   *
   * Note: This method queries the BodyMapGeneration concept's maps collection.
   * It requires the user to have an active session to ensure proper authentication.
   */
  async getUserMaps(
    { user, session }: { user: User; session: Session },
  ): Promise<{ maps: Map[] } | { error: string }> {
    try {
      // Verify user exists
      const userState = await this.users.findOne({ _id: user });
      if (!userState) {
        return { error: `User ${user} does not exist.` };
      }

      // Verify session exists and is active for this user
      const sessionState = await this.sessions.findOne({
        _id: session,
        userId: user,
      });
      if (!sessionState || !sessionState.active) {
        return {
          error: `Session ${session} is not valid or active for user ${user}.`,
        };
      }

      // Query BodyMapGeneration concept's maps collection
      // We need to access the BodyMapGeneration collection
      const bodyMapCollection = this.db.collection("BodyMapGeneration.maps");
      const maps = await bodyMapCollection
        .find({ ownerId: user })
        .toArray();

      // Extract map IDs - convert to string if needed (MongoDB might return ObjectId)
      const mapIds = maps.map((map) => String(map._id) as Map);

      return { maps: mapIds };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error getting maps for user ${user}:`, e);
        return { error: `Failed to get user maps: ${e.message}` };
      } else {
        console.error(`Unknown error getting maps for user ${user}:`, e);
        return { error: "Failed to get user maps due to an unknown error" };
      }
    }
  }

  // --- Query methods (for testing/observability) ---

  /**
   * _getUser(username: String): (user: UserState | null)
   *
   * effects: Returns the user state for a given username, or null if not found.
   */
  async _getUser(
    { username }: { username: string },
  ): Promise<{ user: UserState | null } | { error: string }> {
    try {
      const user = await this.users.findOne({ username });
      return { user };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching user ${username}:`, e);
        return { error: `Failed to fetch user: ${e.message}` };
      } else {
        console.error(`Unknown error fetching user ${username}:`, e);
        return { error: "Failed to fetch user due to an unknown error" };
      }
    }
  }

  /**
   * _getSession(session: Session): (session: SessionState | null)[]
   *
   * effects: Returns an array containing the session state for a given session ID, or an array with null if not found.
   *          This method returns an array to be compatible with frames.query() which expects array returns.
   *          Returns an empty array on error (which will cause frames to be filtered out).
   */
  async _getSession(
    { session }: { session: Session },
  ): Promise<Array<{ session: SessionState | null }>> {
    try {
      const sessionState = await this.sessions.findOne({ _id: session });
      return [{ session: sessionState }];
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching session ${session}:`, e);
      } else {
        console.error(`Unknown error fetching session ${session}:`, e);
      }
      // Return empty array on error - frames using this will be filtered out
      return [];
    }
  }
}
