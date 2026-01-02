/**
 * Custom error types for the application
 */

export interface QuotaError extends Error {
  isQuotaError: boolean;
}

/**
 * Type guard to check if an error is a QuotaError
 */
export function isQuotaError(error: unknown): error is QuotaError {
  return (
    error instanceof Error &&
    'isQuotaError' in error &&
    (error as QuotaError).isQuotaError === true
  );
}

/**
 * Create a QuotaError with proper typing
 */
export function createQuotaError(message: string): QuotaError {
  return Object.assign(new Error(message), { isQuotaError: true });
}
