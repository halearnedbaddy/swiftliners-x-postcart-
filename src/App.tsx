import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminBusinesses from "./pages/admin/AdminBusinesses";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminLogin from "./pages/admin/AdminLogin";
import DashboardOverview from "./pages/DashboardOverview";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardCompliance from "./pages/DashboardCompliance";
import DashboardCollections from "./pages/DashboardCollections";
import DashboardEscrow from "./pages/DashboardEscrow";
import DashboardConditions from "./pages/DashboardConditions";
import DashboardDisbursement from "./pages/DashboardDisbursement";
import DashboardReports from "./pages/DashboardReports";
import DashboardSupport from "./pages/DashboardSupport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardOverview />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/compliance"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardCompliance />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/collections"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardCollections />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/escrow"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardEscrow />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/conditions"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardConditions />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/disbursement"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardDisbursement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardReports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/support"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardSupport />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminOverview />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/businesses"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminBusinesses />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/compliance"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminCompliance />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/transactions"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminTransactions />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
