type NavigationRecorder = (route: string, startedAt: number, completedAt: number) => void;
type ErrorRecorder = (error: unknown, component?: string) => void;
type ViewRecorder = (name: string, duration: number, renderDuration: number) => void;

let navigationRecorder: NavigationRecorder | undefined;
let vueErrorRecorder: ErrorRecorder | undefined;
let viewRecorder: undefined | ViewRecorder;
const pendingVueErrors: Array<[unknown, string | undefined]> = [];

export function registerTelemetryRecorders(
  navigation: NavigationRecorder, vueError: ErrorRecorder, view: ViewRecorder,
): void {
  navigationRecorder = navigation;
  vueErrorRecorder = vueError;
  viewRecorder = view;
  for (const [error, component] of pendingVueErrors.splice(0)) {
    try { vueError(error, component); } catch { /* Keep replaying the remaining errors. */ }
  }
}

export function recordNavigation(route: string, startedAt: number, completedAt: number): void {
  navigationRecorder?.(route, startedAt, completedAt);
}

export function recordView(name: string, duration: number, renderDuration: number): void {
  viewRecorder?.(name, duration, renderDuration);
}

export function recordVueError(error: unknown, component?: string): void {
  if (vueErrorRecorder) vueErrorRecorder(error, component);
  else if (pendingVueErrors.length < 20) pendingVueErrors.push([error, component]);
}
