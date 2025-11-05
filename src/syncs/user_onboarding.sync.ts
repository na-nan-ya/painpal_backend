import { actions, Sync } from "@engine";
import { BodyMapGeneration, UserAuthentication } from "@concepts";

/**
 * When a new user is successfully registered, generate their first body map automatically.
 */
export const GenerateFirstMapOnRegistration: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [BodyMapGeneration.generateMap, { user }],
  ),
});
