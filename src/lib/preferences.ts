let pending: Promise<unknown> = Promise.resolve();
export function enqueuePreference<T>(write: () => Promise<T>): Promise<T> {
  const next = pending.then(write, write);
  pending = next.catch(() => undefined);
  return next;
}
