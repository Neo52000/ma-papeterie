import { createHandler } from "../_shared/handler.ts";
import { UserFacingError } from "../_shared/user-facing-error.ts";

/**
 * Retired legacy endpoint.
 *
 * This function previously generated random competitor prices and persisted
 * them as if they had been collected. The supported collector is now
 * `scrape-prices`, which writes traceable snapshots to `price_snapshots`.
 */
Deno.serve(createHandler({
  name: "scrape-competitor-prices",
  auth: "admin",
  methods: ["POST"],
  rateLimit: { prefix: "scrape-competitor-retired", max: 2, windowMs: 60_000 },
}, async () => {
  throw new UserFacingError(
    "Cette fonction a été désactivée car elle produisait des prix simulés. Utilisez scrape-prices.",
    410,
  );
}));
