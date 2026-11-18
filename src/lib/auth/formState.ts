export type AuthFormState = {
  formError: string | null;
  fieldErrors: Record<string, string>;
  /** A note that isn't an error, such as "We've sent a new code." */
  notice: string | null;
  /** What was typed, except passwords and codes. */
  values: Record<string, string>;
};

export const INITIAL_AUTH_STATE: AuthFormState = { formError: null, fieldErrors: {}, notice: null, values: {} };
