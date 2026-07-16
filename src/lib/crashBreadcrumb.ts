/**
 * Lightweight crash breadcrumbs — write last error / WebGL event into
 * localStorage before the tab dies, surface on next boot.
 *
 * React ErrorBoundary only catches render-time exceptions. useFrame loops,
 * promise rejections, and WebGL context loss escape it. This is the net
 * under those paths with zero infrastructure.
 */

const STORAGE_KEY = 'ironhaven_crash_breadcrumb';
const MAX_MESSAGE = 800;
const MAX_STACK = 2000;

export type CrashBreadcrumb = {
  kind:
    | 'error'
    | 'unhandledrejection'
    | 'webglcontextlost'
    | 'webglcontextrestored';
  message: string;
  stack?: string;
  /** Unix ms when the event fired. */
  at: number;
  /** Seconds since page load when the event fired. */
  sessionAgeSec: number;
  href?: string;
  userAgent?: string;
};

const sessionStart = Date.now();

function sessionAgeSec(): number {
  return Math.round((Date.now() - sessionStart) / 1000);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function writeBreadcrumb(
  partial: Omit<
    CrashBreadcrumb,
    'at' | 'sessionAgeSec' | 'href' | 'userAgent'
  > &
    Partial<Pick<CrashBreadcrumb, 'at' | 'sessionAgeSec'>>
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const crumb: CrashBreadcrumb = {
      kind: partial.kind,
      message: truncate(partial.message || '(no message)', MAX_MESSAGE),
      stack: partial.stack ? truncate(partial.stack, MAX_STACK) : undefined,
      at: partial.at ?? Date.now(),
      sessionAgeSec: partial.sessionAgeSec ?? sessionAgeSec(),
      href: typeof location !== 'undefined' ? location.href : undefined,
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(crumb));
  } catch {
    // Quota / private mode — never let diagnostics take down the game.
  }
}

export function readBreadcrumb(): CrashBreadcrumb | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CrashBreadcrumb;
    if (!parsed || typeof parsed.message !== 'string' || !parsed.at)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearBreadcrumb(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Install once at app boot. Surfaces any breadcrumb from a prior crash, then
 * arms global handlers for the current session.
 */
export function installCrashBreadcrumbs(): void {
  if (typeof window === 'undefined') return;

  const prior = readBreadcrumb();
  if (prior) {
    // Leave it in storage so F12 still shows it after a hard reload;
    // operators can clear via clearBreadcrumb() or a later successful boot
    // that explicitly acknowledges it. Surface once here.
    console.warn(
      '[ironhaven] prior crash breadcrumb — session age',
      prior.sessionAgeSec,
      's | kind:',
      prior.kind,
      '\n',
      prior.message,
      prior.stack ? `\n${prior.stack}` : ''
    );
  }

  window.addEventListener('error', (event) => {
    const err = event.error;
    writeBreadcrumb({
      kind: 'error',
      message: err?.message || event.message || 'window.onerror',
      stack: err?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : (() => {
              try {
                return JSON.stringify(reason);
              } catch {
                return String(reason);
              }
            })();
    writeBreadcrumb({
      kind: 'unhandledrejection',
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

/** Call from canvas webglcontextlost / restored listeners. */
export function recordWebGLContextEvent(
  kind: 'webglcontextlost' | 'webglcontextrestored'
): void {
  writeBreadcrumb({
    kind,
    message:
      kind === 'webglcontextlost'
        ? 'WebGL context lost (GPU reset / tab background / driver)'
        : 'WebGL context restored',
  });
}
