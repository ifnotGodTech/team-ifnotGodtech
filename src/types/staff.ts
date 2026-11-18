// The contract with the backend's staff log in API. The stand-in in src/lib/api follows it.

export type StaffMember = {
  id: string;
  name: string;
  email: string;
};

/** After the right code: the backend's token, kept only inside the encrypted session cookie. */
export type SignedIn = {
  token: string;
  staff: StaffMember;
};

/** A log in waiting for its emailed code. */
export type LoginChallenge = {
  challengeId: string;
  /** Where the code was sent. */
  sentTo: string;
  /** ISO date-time when the code stops working. */
  expiresAt: string;
};
