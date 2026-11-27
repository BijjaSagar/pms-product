/** The message to show a user for something that went wrong. */
export function displayError(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}
