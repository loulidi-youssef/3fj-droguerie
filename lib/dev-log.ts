const isDevLoggingEnabled = process.env.NODE_ENV !== "production";

export const devLog = (...args: unknown[]): void => {
  if (!isDevLoggingEnabled) {
    return;
  }

  console.log(...args);
};

export const devWarn = (...args: unknown[]): void => {
  if (!isDevLoggingEnabled) {
    return;
  }

  console.warn(...args);
};

export const devError = (...args: unknown[]): void => {
  if (!isDevLoggingEnabled) {
    return;
  }

  console.error(...args);
};
