/**
 * Internal-error (500) responses for the Media API routes.
 *
 * Clients receive a generic message, a stable `code` and an `errorId` to quote
 * in support requests. The server log receives one JSON line with the same
 * `errorId` and allowlisted metadata only: route, code and SQLite result codes
 * that appear in a fixed whitelist. No free text from the error is logged or
 * returned: not its message, cause, name, SQL text or bound parameters, even
 * in redacted form, because driver messages can carry arbitrary values.
 */

type InternalErrorCode = "INTERNAL_ERROR" | "STORAGE_NOT_READY";

const GENERIC_MESSAGE = "Something went wrong while processing the request. Please retry.";
const STORAGE_NOT_READY = /no such (table|column)/i;

/** SQLite primary and extended result codes worth recording. Any other
 * `SQLITE_*`-looking token in a message is ignored. */
const SQLITE_RESULT_CODES = new Set([
  "SQLITE_ABORT", "SQLITE_AUTH", "SQLITE_BUSY", "SQLITE_CANTOPEN", "SQLITE_CONSTRAINT",
  "SQLITE_CONSTRAINT_CHECK", "SQLITE_CONSTRAINT_FOREIGNKEY", "SQLITE_CONSTRAINT_NOTNULL",
  "SQLITE_CONSTRAINT_PRIMARYKEY", "SQLITE_CONSTRAINT_TRIGGER", "SQLITE_CONSTRAINT_UNIQUE",
  "SQLITE_CORRUPT", "SQLITE_ERROR", "SQLITE_FULL", "SQLITE_INTERRUPT", "SQLITE_IOERR",
  "SQLITE_LOCKED", "SQLITE_MISMATCH", "SQLITE_NOMEM", "SQLITE_RANGE", "SQLITE_READONLY",
  "SQLITE_SCHEMA", "SQLITE_TOOBIG",
]);

type QueryError = Error & { query: string; params: unknown[]; cause?: unknown };

function isQueryError(error: unknown): error is QueryError {
  return (
    error instanceof Error &&
    typeof (error as { query?: unknown }).query === "string" &&
    Array.isArray((error as { params?: unknown }).params)
  );
}

/** The driver message, read only to classify the failure; never logged.
 * DrizzleQueryError embeds the SQL and parameters in its own message, so only
 * its `cause` is read. */
function driverMessage(error: unknown) {
  const cause = isQueryError(error) ? error.cause : error;
  if (cause instanceof Error) return cause.message;
  return typeof cause === "string" ? cause : "";
}

export function internalErrorResponse(route: string, error: unknown, storageMessage: string) {
  const errorId = crypto.randomUUID();
  const message = driverMessage(error);
  const code: InternalErrorCode = STORAGE_NOT_READY.test(message) ? "STORAGE_NOT_READY" : "INTERNAL_ERROR";
  const sqliteCodes = Array.from(new Set(message.match(/\bSQLITE_[A-Z_]+\b/g) ?? []))
    .filter((candidate) => SQLITE_RESULT_CODES.has(candidate))
    .sort();

  console.error(JSON.stringify({ event: "api.internal_error", errorId, route, code, sqliteCodes }));

  return Response.json(
    { error: code === "STORAGE_NOT_READY" ? storageMessage : GENERIC_MESSAGE, code, errorId },
    { status: 500 },
  );
}
