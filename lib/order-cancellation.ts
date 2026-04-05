export const ORDER_CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000;

const CANCELLABLE_EARLY_STATUSES = new Set(["new"]);

export const getOrderCancellationDeadline = (createdAt: string): Date | null => {
  const createdAtTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return null;
  }

  return new Date(createdAtTime + ORDER_CANCELLATION_WINDOW_MS);
};

export const isOrderCancellable = (input: {
  status: string;
  createdAt: string;
  now?: number;
}): boolean => {
  if (!CANCELLABLE_EARLY_STATUSES.has(input.status)) {
    return false;
  }

  const createdAtTime = new Date(input.createdAt).getTime();
  if (Number.isNaN(createdAtTime)) {
    return false;
  }

  const currentTime = input.now ?? Date.now();
  return currentTime - createdAtTime <= ORDER_CANCELLATION_WINDOW_MS;
};
