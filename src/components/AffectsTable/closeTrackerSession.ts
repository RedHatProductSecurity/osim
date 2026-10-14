// Survive AffectsTable unmounting while the parent reloads the flaw.
export const sessionFailedSelection = new Map<string, Set<string>>();
export const sessionClosedKeys = new Map<string, Set<string>>();

export function clearCloseTrackerSession(uuid: string) {
  sessionFailedSelection.delete(uuid);
  sessionClosedKeys.delete(uuid);
}
