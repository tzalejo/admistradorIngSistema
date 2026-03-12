import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { PrestamosPage } from './pages/PrestamosPage';
import { PrestamoDetallePage } from './pages/PrestamoDetallePage';
import { OperacionesPage } from './pages/OperacionesPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { LoginPage } from './pages/LoginPage';
import { authService } from './services/auth.service';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
