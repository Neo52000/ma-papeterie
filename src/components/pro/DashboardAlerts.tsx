import { Link } from 'react-router-dom';
import { AlertTriangle, FileText, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { B2BInvoice } from '@/hooks/useB2BInvoices';
import type { Order } from '@/hooks/useOrders';

interface DashboardAlertsProps {
  unpaidInvoices: B2BInvoice[];
  unpaidTotal: number;
  isOverBudget: boolean;
  isNearAlert: boolean;
  percentUsed: number;
  pendingOrders: Order[];
}

export function DashboardAlerts({
  unpaidInvoices,
  unpaidTotal,
  isOverBudget,
  isNearAlert,
  percentUsed,
  pendingOrders,
}: DashboardAlertsProps) {
  const hasAlerts = unpaidInvoices.length > 0 || isOverBudget || isNearAlert || pendingOrders.length > 0;

  if (!hasAlerts) return null;

  return (
    <div className="space-y-2">
      {isOverBudget && (
        <Alert variant="destructive" className="py-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Votre budget annuel est dépassé. Contactez votre chargé de compte pour ajuster votre enveloppe.
          </AlertDescription>
        </Alert>
      )}

      {!isOverBudget && isNearAlert && (
        <Alert className="py-3 border-orange-300 bg-orange-50 text-orange-800 [&>svg]:text-orange-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Budget utilisé à {percentUsed}% — approche du seuil d'alerte.
          </AlertDescription>
        </Alert>
      )}

      {unpaidInvoices.length > 0 && (
        <Alert className="py-3 border-red-200 bg-red-50 text-red-800 [&>svg]:text-red-600">
          <FileText className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''} impayée{unpaidInvoices.length > 1 ? 's' : ''} ({unpaidTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})
            </span>
            <Link to="/pro/factures" className="text-red-700 underline font-medium text-xs ml-2 shrink-0">
              Voir les factures
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {pendingOrders.length > 0 && (
        <Alert className="py-3 border-yellow-200 bg-yellow-50 text-yellow-800 [&>svg]:text-yellow-600">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {pendingOrders.length} commande{pendingOrders.length > 1 ? 's' : ''} en attente de confirmation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
