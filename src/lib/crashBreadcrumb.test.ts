import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearBreadcrumb,
  installCrashBreadcrumbs,
  readBreadcrumb,
  recordWebGLContextEvent,
  writeBreadcrumb,
} from './crashBreadcrumb';

// Node vitest may expose a broken localStorage (no .clear). Match the
// pattern in subscription.test.ts and only run storage-backed cases when
// setItem / getItem / removeItem are actually callable.
const hasStorage =
  typeof localStorage !== 'undefined' &&
  typeof localStorage.setItem === 'function' &&
  typeof localStorage.getItem === 'function' &&
  typeof localStorage.removeItem === 'function';

describe('crashBreadcrumb', () => {
  beforeEach(() => {
    if (hasStorage) localStorage.removeItem('ironhaven_crash_breadcrumb');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearBreadcrumb();
  });

  it('writes and reads a breadcrumb', () => {
    if (!hasStorage) return;
    writeBreadcrumb({
      kind: 'error',
      message: 'boom',
      stack: 'at foo',
    });
    const crumb = readBreadcrumb();
    expect(crumb).not.toBeNull();
    expect(crumb!.kind).toBe('error');
    expect(crumb!.message).toBe('boom');
    expect(crumb!.stack).toBe('at foo');
    expect(typeof crumb!.at).toBe('number');
    expect(typeof crumb!.sessionAgeSec).toBe('number');
  });

  it('records webgl events', () => {
    if (!hasStorage) return;
    recordWebGLContextEvent('webglcontextlost');
    const crumb = readBreadcrumb();
    expect(crumb!.kind).toBe('webglcontextlost');
    expect(crumb!.message).toMatch(/context lost/i);
  });

  it('surfaces prior breadcrumb on install', () => {
    if (!hasStorage) return;
    writeBreadcrumb({ kind: 'unhandledrejection', message: 'prior fail' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installCrashBreadcrumbs();
    expect(warn).toHaveBeenCalled();
    const joined = warn.mock.calls.map((c) => c.join(' ')).join(' ');
    expect(joined).toMatch(/prior crash breadcrumb/);
    expect(joined).toMatch(/prior fail/);
  });

  it('install is a no-op without a prior breadcrumb', () => {
    // Always safe — just must not throw.
    installCrashBreadcrumbs();
  });
});
