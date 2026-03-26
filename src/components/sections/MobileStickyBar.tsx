import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MobileStickyBar = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-[#D1D5DB] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="px-4 py-3">
        <Button
          variant="cta-orange"
          size="lg"
          className="w-full gap-2"
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
