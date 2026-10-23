import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/login/LoginPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ForbiddenPage } from './components/common/ForbiddenPage';
import { NotFoundPage } from './components/common/NotFoundPage';
import { DemoBanner } from './components/common/DemoBanner';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AiAssistantDrawer } from './components/ai/AiAssistantDrawer';
import { authService } from './services/authService';

// Institution pages
import { InstitutionDashboard } from './components/institution/InstitutionDashboard';
import { StudentDirectoryPage } from './components/institution/StudentDirectoryPage';
import { BulkUploadPage } from './components/institution/BulkUploadPage';
import { SeatMatrixPage } from './components/institution/SeatMatrixPage';
import { ReportsPage } from './components/institution/ReportsPage';

// AICTE pages
import { AicteDashboard } from './components/aicte/AicteDashboard';
import { InstitutionListPage } from './components/aicte/InstitutionListPage';
import { DuplicateResolutionPage } from './components/aicte/DuplicateResolutionPage';
import { AicteAdminPage } from './components/aicte/AicteAdminPage';

// Verifier page
import { VerifierPortalPage } from './components/verifier/VerifierPortalPage';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-slate-800">
      <DemoBanner />
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <Outlet />
        </main>
      </div>
      <AiAssistantDrawer />
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={authService.getDefaultPathForRole(user.role)} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Protected Institution Admin Routes */}
        <Route
          path="/institution"
          element={
            <ProtectedRoute allowedRoles={['institution_admin']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<InstitutionDashboard />} />
          <Route path="students" element={<StudentDirectoryPage />} />
          <Route path="upload" element={<BulkUploadPage />} />
          <Route path="seat-matrix" element={<SeatMatrixPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route index element={<Navigate to="/institution/dashboard" replace />} />
        </Route>

        {/* Protected AICTE Officer Routes */}
        <Route
          path="/aicte"
          element={
            <ProtectedRoute allowedRoles={['aicte_officer', 'aicte_admin']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AicteDashboard />} />
          <Route path="institutions" element={<InstitutionListPage />} />
          <Route path="duplicates" element={<DuplicateResolutionPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={['aicte_admin']}>
                <AicteAdminPage />
              </ProtectedRoute>
            }
          />
          <Route index element={<Navigate to="/aicte/dashboard" replace />} />
        </Route>

        {/* Protected Verifier Desk Routes */}
        <Route
          path="/verifier"
          element={
            <ProtectedRoute allowedRoles={['verifier', 'institution_admin', 'aicte_officer', 'aicte_admin']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="portal" element={<VerifierPortalPage />} />
          <Route index element={<Navigate to="/verifier/portal" replace />} />
        </Route>

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
