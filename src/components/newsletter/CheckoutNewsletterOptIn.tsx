import { useState, forwardRef, useImperativeHandle } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";

interface CheckoutNewsletterOptInProps {
  email: string;
  className?: string;
}

export interface CheckoutNewsletterOptInRef {
  triggerSubscribe: () => void;
}

export const CheckoutNewsletterOptIn = forwardRef<
  CheckoutNewsletterOptInRef,
  CheckoutNewsletterOptInProps
>(function CheckoutNewsletterOptIn({ email, className }, ref) {
  const [checked, setChecked] = useState(false);
  const { subscribe, isAlreadySubscribed } = useNewsletterSubscribe();

  useImperativeHandle(ref, () => ({
    triggerSubscribe: () => {
      if (checked && email) {
        subscribe(email, "checkout");
      }
    },
  }));

  if (isAlreadySubscribed) return null;

  return (
    <div className={className}>
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => setChecked(!!value)}
          className="mt-0.5"
        />
        <div>
          <span className="text-sm">
            Recevoir mes confirmations de commande et les offres Ma Papeterie
            par email
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Sans spam — désinscription à tout moment
          </p>
        </div>
      </label>
    </div>
  );
});
