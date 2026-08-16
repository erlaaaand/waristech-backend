// src/shared/utils/database-error.util.ts

interface DriverErrorLike {
  code?: string;
  driverError?: { code?: string };
}

export function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as DriverErrorLike;
  return (
    err.code === 'ER_DUP_ENTRY' || err.driverError?.code === 'ER_DUP_ENTRY'
  );
}
