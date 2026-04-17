import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package, ArrowRight, Loader2 } from "lucide-react";
import { confettiCelebrate } from "@/lib/confetti";

interface OrderData {
  order_number: string;
  total_amount: number;
  customer_email: string;
  payment_status: string;
  status: string;
  created_at: string;
  order_items?: Array<{
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
  }>;
}

export default function OrderConfirmation() {
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Aucune session de paiement trouvee.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        // Wait briefly for webhook to process
        await new Promise((r) => setTimeout(r, 2000));

        const { data, error: fetchError } = await supabase
          .from("orders")
          .select(
            "order_number, total_amount, customer_email, payment_status, status, created_at, order_items (product_name, product_price, quantity, subtotal)",
          )
          .eq("stripe_session_id", sessionId)
          .single();

        if (fetchError) throw fetchError;
        setOrder(data as unknown as OrderData);
        // Celebratory burst once the order is confirmed
        void confettiCelebrate();
      } catch {
        setError("Commande introuvable. Elle sera visible dans votre espace sous peu.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Verification du paiement...</p>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Paiement en cours de traitement</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button asChild>
                  <a href="/mon-compte?tab=orders">
                    Voir mes commandes
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : order ? (
            <>
              <div className="text-center mb-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-2">Merci pour votre commande !</h1>
                <p className="text-lg text-muted-foreground">
                  Commande <span className="font-semibold text-foreground">{order.order_number}</span>
                </p>
              </div>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Recapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.order_items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.product_price.toFixed(2)} € x {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-sm">{item.subtotal.toFixed(2)} €</p>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between items-center text-lg">
                    <p className="font-bold">Total</p>
                    <p className="font-bold text-primary">{order.total_amount.toFixed(2)} €</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Statut paiement</p>
                      <p className="font-medium capitalize">
                        {order.payment_status === "paid" ? "Paye" : order.payment_status}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confirmation envoyee a</p>
                      <p className="font-medium">{order.customer_email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <a href="/mon-compte?tab=orders">
                    Suivre ma commande
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/catalogue">Continuer mes achats</a>
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
