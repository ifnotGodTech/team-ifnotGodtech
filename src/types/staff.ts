// The contract with the backend's staff log in API. The stand-in in src/lib/api follows it.

export type StaffMember = {
  id: string;
  name: string;
  email: string;
};

/** A log in waiting for its emailed code. */
export type LoginChallenge = {
  challengeId: string;
  /** Where the code was sent. */
  sentTo: string;
  /** ISO date-time when the code stops working. */
  expiresAt: string;
};
