/**
 * Lightweight canvas-confetti burst.
 * Dynamically imports canvas-confetti to keep it out of the main bundle.
 * Respects prefers-reduced-motion (no-op if user opts out).
 */

interface BurstOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
}

type ConfettiFn = typeof import("canvas-confetti");

let loader: Promise<ConfettiFn | null> | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function getConfetti(): Promise<ConfettiFn | null> {
  if (!loader) {
    loader = import("canvas-confetti")
      .then((m): ConfettiFn => (m as unknown as { default?: ConfettiFn }).default ?? (m as unknown as ConfettiFn))
      .catch((): ConfettiFn | null => null);
  }
  return loader;
}

/**
 * Trigger a small celebratory burst. Safe to call in any environment.
 */
export async function confettiBurst(opts: BurstOptions = {}) {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  const confetti = await getConfetti();
  if (!confetti) return;

  const {
    particleCount = 40,
    spread = 55,
    origin = { x: 0.5, y: 0.7 },
  } = opts;

  confetti({
    particleCount,
    spread,
    origin,
    colors: ["#fd761a", "#1e3a8a", "#f4c451", "#9d4300", "#fbf3e0"],
    disableForReducedMotion: true,
    scalar: 0.8,
    ticks: 120,
  });
}

/**
 * Bigger celebratory burst for order confirmation.
 */
export async function confettiCelebrate() {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  const confetti = await getConfetti();
  if (!confetti) return;

  const colors = ["#fd761a", "#1e3a8a", "#f4c451", "#9d4300", "#2ea043"];
  const end = Date.now() + 1200;

  (function frame(): void {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.75 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.75 },
      colors,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
