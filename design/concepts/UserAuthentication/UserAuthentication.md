**concept** UserAuthentication

**purpose**  allows users to create a simple identity with a username and password, manage login sessions, and access their associated body maps.

**principle** each user has one username and password,
              authentication is based on direct credential matching,
              logged-in users have access to their stored maps, 
              sessions expire automatically after a set duration or when the user logs out.

**state**  
  A set of Users with  
    a username String
    a password String
    a set of body Maps 

  A set of Sessions with  
    a User 
    an active Flag  
    a Start timestamp  


**actions**

register(username: String, password: String): (user: User)
**requires** no existing User has the same username  
**effects** Creates and stores a new User with the given credentials  

login(username: String, password: String): (session: Session | null)
**requires** a User with the given username exists and password matches the username 
**effects** returns a new active Session if the password matches, otherwise returns null  

logout(session: Session) 
**requires** the Session exists and is active  
**effects** sets the Session’s active flag to `false` and ends the user’s login session  

getUserMaps(user: User): (maps: Maps) 
**requires** the User exists and has a valid active session  
**effects** returns all BodyMaps associated with that User  
