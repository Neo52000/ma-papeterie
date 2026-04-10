import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

const MobileStickyBar = () => {
  const navigate = (url: string) => { window.location.href = url; };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]"
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 -4px 20px rgba(18, 28, 42, 0.06)",
      }}
    >
      <div className="px-4 py-3">
        <Button
          variant="cta-orange"
          size="lg"
          className="w-full gap-2 bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300]"
          onClick={() => navigate("/catalogue")}
        >
          <ShoppingCart className="w-5 h-5" />
          Commander maintenant
        </Button>
      </div>
    </div>
  );
};

export default MobileStickyBar;
