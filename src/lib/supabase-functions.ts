// Utilities around `supabase.functions.invoke()` error handling.
//
// The Supabase JS client surfaces two generic messages that aren't useful
// to end-users:
//   - "Edge Function returned a non-2xx status code" (FunctionsHttpError)
//   - "Failed to send a request to the Edge Function"   (FunctionsFetchError)
//
// The real cause is either in the JSON body of the response (for HttpError)
// or in network details (for FetchError). `extractFunctionErrorMessage`
// pulls out the best available message.

const GENERIC_MESSAGES = new Set([
  'Edge Function returned a non-2xx status code',
  'Failed to send a request to the Edge Function',
]);

type MaybeFunctionError = {
  message?: string;
  context?: {
    json?: () => Promise<unknown>;
    status?: number;
    statusText?: string;
  };
};

/**
 * Extract a user-facing error message from a Supabase Edge Function error.
 * Falls back to `fallback` when no better message is available.
 */
export async function extractFunctionErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  const err = error as MaybeFunctionError;

  // 1. Try to parse the JSON body (FunctionsHttpError path).
  try {
    const body = (await err?.context?.json?.()) as
      | { error?: string; message?: string }
      | undefined;
    const bodyMessage = body?.error ?? body?.message;
    if (bodyMessage) return bodyMessage;
  } catch {
    // Body is not JSON or already consumed — fall through.
  }

  // 2. Use the error's own message if it's not one of the generic ones.
  if (err?.message && !GENERIC_MESSAGES.has(err.message)) {
    return err.message;
  }

  // 3. FunctionsFetchError: surface HTTP status when present.
  const status = err?.context?.status;
  if (status) {
    return `${fallback} (HTTP ${status}${err.context?.statusText ? ` ${err.context.statusText}` : ''})`;
  }

  // 4. FunctionsFetchError without status usually means the function is
  //    unreachable (not deployed, CORS, network). Be explicit about it.
  if (err?.message === 'Failed to send a request to the Edge Function') {
    return `${fallback} — Edge Function injoignable (non déployée, CORS ou réseau)`;
  }

  return fallback;
}
