import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import ClientPage from "@/pages/ClientPage";
import ScanPage from "@/pages/ScanPage";
import ProfilePage from "@/pages/ProfilePage";
import NotesPage from "@/pages/NotesPage";
import NoteTemplatePage from "@/pages/NoteTemplatePage";
import PublicSessionPage from "@/pages/PublicSessionPage";
import PricingPage from "@/pages/PricingPage";
import BillingPage from "@/pages/BillingPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <ClientProvider>{children}</ClientProvider>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename="/behavior-zone-app">
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/session" element={<PublicSessionPage />} />
          <Route path="/index.html" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<ClientPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/note-template" element={<NoteTemplatePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/billing" element={<BillingPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
