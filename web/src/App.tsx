import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';

const IncidentListPage = lazy(() => import('./pages/IncidentListPage').then((m) => ({ default: m.IncidentListPage })));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage').then((m) => ({ default: m.IncidentDetailPage })));
const CreateIncidentPage = lazy(() => import('./pages/CreateIncidentPage').then((m) => ({ default: m.CreateIncidentPage })));

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/incidents" replace />} />
            <Route path="/incidents" element={<IncidentListPage />} />
            <Route path="/incidents/new" element={<CreateIncidentPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
