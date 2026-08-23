import "server-only";

interface WriteQueueState {
  tail: Promise<void>;
}

const globalForWriteQueue = globalThis as typeof globalThis & {
  crmSqliteWriteQueue?: WriteQueueState;
};

function queueState(): WriteQueueState {
  if (!globalForWriteQueue.crmSqliteWriteQueue) {
    globalForWriteQueue.crmSqliteWriteQueue = { tail: Promise.resolve() };
  }
  return globalForWriteQueue.crmSqliteWriteQueue;
}

export async function serializeSqliteWrite<T>(operation: () => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL?.startsWith("file:")) return operation();

  const state = queueState();
  const previous = state.tail;
  let release!: () => void;
  state.tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}
