import { Routes, Route, Navigate } from 'react-router-dom';
import { PilotageLayout } from '@/components/admin/pilotage/PilotageLayout';
import { OverviewDashboard } from '@/components/admin/pilotage/Overview/OverviewDashboard';
import { CaMargeView } from '@/components/admin/pilotage/CaMarge/CaMargeView';
import { TresorerieView } from '@/components/admin/pilotage/Tresorerie/TresorerieView';
import { BoutiquePosView } from '@/components/admin/pilotage/BoutiquePos/BoutiquePosView';
import { ObjectifsView } from '@/components/admin/pilotage/Objectifs/ObjectifsView';
import { CoachChat } from '@/components/admin/pilotage/Coach/CoachChat';
import { AlertesPanel } from '@/components/admin/pilotage/Alertes/AlertesPanel';

export default function PilotagePage() {
  return (
    <Routes>
      <Route element={<PilotageLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview"     element={<OverviewDashboard />} />
        <Route path="ca-marge"     element={<CaMargeView />} />
        <Route path="tresorerie"   element={<TresorerieView />} />
        <Route path="boutique-pos" element={<BoutiquePosView />} />
        <Route path="objectifs"    element={<ObjectifsView />} />
        <Route path="coach"        element={<CoachChat />} />
        <Route path="alertes"      element={<AlertesPanel />} />
      </Route>
    </Routes>
  );
}
