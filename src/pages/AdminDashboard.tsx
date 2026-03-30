import { AdminLayout } from '@/components/admin/AdminLayout';
import { KpiDashboard } from '@/components/admin/KpiDashboard';

export default function AdminDashboard() {
  return (
    <AdminLayout title="Tableau de bord" description="Vue d'ensemble de votre activité">
      <KpiDashboard />
    </AdminLayout>
  );
}
