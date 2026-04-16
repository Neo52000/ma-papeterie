import { useState } from "react";
import { Mail, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoneypotField } from "@/components/HoneypotField";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";

/**
 * Inline newsletter capture, rendered mid-page between sections.
 * Complements the footer newsletter — catches users before they reach the footer.
 */
const HomeNewsletterInline = () => {
  const [email, setEmail] = useState("");
  const {
    subscribe,
    isLoading,
    isSuccess,
    isError,
    errorMessage,
    isAlreadySubscribed,
  } = useNewsletterSubscribe();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await subscribe(email.trim(), "home_inline");
  };

  const done = isAlreadySubscribed || isSuccess;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-primary via-primary to-primary-dark p-8 md:p-12">
          {/* Decorative blobs */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-cta/30 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-secondary/20 blur-3xl"
          />

          <div className="relative grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
            <div className="text-primary-foreground">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-4">
                <Mail className="w-3.5 h-3.5" />
                Newsletter
              </div>
              <h2 className="text-2xl md:text-3xl font-bold font-poppins leading-tight mb-3">
                Les offres pro, directement dans votre boîte mail
              </h2>
              <p className="text-primary-foreground/80 text-sm md:text-base leading-relaxed max-w-lg">
                Bons plans fournitures, nouveautés et guides pratiques — 2 emails par mois,
                zéro spam, désinscription en 1 clic.
              </p>
            </div>

            {done ? (
              <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-xl p-5 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <Check className="w-5 h-5 text-accent-foreground" />
                  </span>
                  <div>
                    <p className="font-semibold">Inscription confirmée</p>
                    <p className="text-sm text-primary-foreground/80">
                      Vous êtes sur la liste. À très vite !
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <HoneypotField />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="votre.email@entreprise.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    aria-label="Adresse email"
                    className="flex-1 bg-primary-foreground text-foreground border-0 h-12"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    variant="cta-orange"
                    disabled={isLoading}
                    className="h-12 whitespace-nowrap"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "S'abonner"}
                  </Button>
                </div>
                {isError && errorMessage && (
                  <p role="alert" className="text-destructive-foreground text-xs bg-destructive/20 rounded-md px-3 py-2">
                    {errorMessage}
                  </p>
                )}
                <p className="text-[0.7rem] text-primary-foreground/60">
                  En cliquant sur S'abonner, vous acceptez notre politique de confidentialité.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeNewsletterInline;
