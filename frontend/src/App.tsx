import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { authService } from './services/auth.service';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PrestamosPage = lazy(() => import('./pages/PrestamosPage').then((m) => ({ default: m.PrestamosPage })));
const PrestamoDetallePage = lazy(() => import('./pages/PrestamoDetallePage').then((m) => ({ default: m.PrestamoDetallePage })));
const OperacionesPage = lazy(() => import('./pages/OperacionesPage').then((m) => ({ default: m.OperacionesPage })));
const MovimientosPage = lazy(() => import('./pages/MovimientosPage').then((m) => ({ default: m.MovimientosPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-muted-foreground">Cargando...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos"
            element={
              <ProtectedRoute>
                <PrestamosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos/:id"
            element={
              <ProtectedRoute>
                <PrestamoDetallePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones"
            element={
              <ProtectedRoute>
                <OperacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/movimientos"
            element={
              <ProtectedRoute>
                <MovimientosPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
