const TAG = ["%cRxE", "color:#2ecc71;font-weight:bold"] as const;

export const log = {
  info: (...args: unknown[]) => console.info(...TAG, ...args),
  warn: (...args: unknown[]) => console.warn(...TAG, ...args),
  error: (...args: unknown[]) => console.error(...TAG, ...args),
};

/**
 * Runs RxE code that is called from inside the site's own event handlers.
 * An uncaught throw there would break the site and land in EmeraldChat's Sentry.
 */
export function attempt<T>(label: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error) {
    log.error(`${label} threw`, error);
    return undefined;
  }
}
