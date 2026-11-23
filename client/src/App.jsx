import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AppShell } from './components/layout/AppShell.jsx';
import { RequireSession } from './components/shared/RequireSession.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import DetectionPage from './pages/DetectionPage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import ExportPage from './pages/ExportPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const appRoute = (element) => <AppShell>{element}</AppShell>;
const protectedRoute = (element) => (
  <AppShell>
    <RequireSession>{element}</RequireSession>
  </AppShell>
);

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={appRoute(<DashboardPage />)} />
        <Route path="/upload" element={appRoute(<UploadPage />)} />
        <Route
          path="/detect/:documentId"
          element={protectedRoute(<DetectionPage />)}
        />
        <Route
          path="/editor/:documentId"
          element={protectedRoute(<EditorPage />)}
        />
        <Route
          path="/export/:documentId"
          element={protectedRoute(<ExportPage />)}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}
