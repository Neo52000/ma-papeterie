import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { HoneypotField } from "@/components/HoneypotField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useExitIntent } from "@/hooks/useExitIntent";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

type FormValues = z.infer<typeof schema>;

export function ExitIntentPopup() {
  const { shouldShow, dismiss } = useExitIntent();
  const { subscribe, isLoading, isSuccess, isError, errorMessage } =
    useNewsletterSubscribe();
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout>>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    await subscribe(values.email, "exit_popup");
  };

  // Auto-close 3s after success
  useEffect(() => {
    if (isSuccess) {
      autoCloseTimer.current = setTimeout(() => {
        dismiss();
      }, 3000);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [isSuccess, dismiss]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dismiss();
    }
  };

  if (!shouldShow) return null;

  return (
    <Dialog open={shouldShow} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-poppins">
            Avant de partir...
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Recevez en avant-première les listes scolaires de Chaumont et nos
            meilleures sélections
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <p className="text-center text-green-600 dark:text-green-400 font-medium py-4">
            ✓ Parfait ! Vérifiez votre boîte mail pour confirmer.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <HoneypotField />
            <div>
              <Input
                {...register("email")}
                type="email"
                placeholder="Votre adresse email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
              {isError && errorMessage && (
                <p className="text-sm text-destructive mt-1">{errorMessage}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Je m&apos;inscris
            </Button>

            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Non merci
            </button>

            <p className="text-xs text-muted-foreground text-center">
              Désinscription en 1 clic à tout moment. Pas de spam, promis.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
