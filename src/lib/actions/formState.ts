/** What a form gets back when a save fails: a message, and what was chosen so it isn't lost. */
export type ChoiceFormState = { formError: string | null; values: string[] };

export const INITIAL_CHOICE_STATE: ChoiceFormState = { formError: null, values: [] };
