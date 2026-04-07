import { AdminLayout } from "@/components/admin/AdminLayout";
import { SupplierCompletenessDashboard } from "@/components/admin/SupplierCompletenessDashboard";

export default function AdminSupplierCompleteness() {
  return (
    <AdminLayout title="Complétude fournisseurs" description="Suivi de la qualité des données par fournisseur">
      <SupplierCompletenessDashboard />
    </AdminLayout>
  );
}
