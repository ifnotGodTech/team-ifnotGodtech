/** What a form gets back when a save fails: a message, and what was chosen so it isn't lost. */
export type ChoiceFormState = { formError: string | null; values: string[] };

export const INITIAL_CHOICE_STATE: ChoiceFormState = { formError: null, values: [] };

/** What a content form gets back: a message, errors by field, or a confirmation once saved. */
export type ContentFormState = { formError: string | null; fieldErrors: Record<string, string>; notice: string | null };

export const INITIAL_CONTENT_STATE: ContentFormState = { formError: null, fieldErrors: {}, notice: null };
