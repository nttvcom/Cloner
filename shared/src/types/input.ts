/**
 * One tick of a player's intent. During online play this is the ONLY thing
 * a client ever sends about gameplay — the server simulates everything else.
 */
export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  placeClone: boolean;
  removeClone: boolean;
}

export const EMPTY_INPUT: Readonly<PlayerInput> = {
  left: false,
  right: false,
  jump: false,
  placeClone: false,
  removeClone: false,
};
