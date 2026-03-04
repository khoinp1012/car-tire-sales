/**
 * Professional Logger utility to replace console.log
 * Provides a central point for log management and keeps the codebase clean.
 */

const IS_DEV = __DEV__;

export const Logger = {
    info: (message: string, ...args: any[]) => {
        if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error: (message: string, ...args: any[]) => {
        // Errors should always be logged in dev
        if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.error(`[ERROR] ${message}`, ...args);
        }
        // In production, you would typically send these to a service like Sentry
    },
    debug: (message: string, ...args: any[]) => {
        if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
};

export default Logger;
