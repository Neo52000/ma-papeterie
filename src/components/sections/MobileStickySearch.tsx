import { useEffect, useState } from "react";
import { Search } from "lucide-react";

/**
 * Mobile-only floating search pill that appears after scrolling past the hero.
 * Tap-target navigates to the catalogue; keeps users connected to search
 * even far down the homepage without cluttering the header.
 */
const MobileStickySearch = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = "/catalogue";
      }}
      aria-label="Rechercher dans le catalogue"
      className={`md:hidden fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 shadow-lg transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="text-sm font-semibold">Rechercher</span>
    </button>
  );
};

export default MobileStickySearch;
