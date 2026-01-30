import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PaymentPage } from "./pages/PaymentPage";
import { HomePage } from "./pages/HomePage";
import { SellerDashboard } from "./pages/SellerDashboard";
import { BuyerDashboard } from "./pages/BuyerDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminSetupPage } from "./pages/AdminSetupPage";
import { LegalPage } from "./pages/LegalPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { StoreFrontPage } from "./pages/StoreFrontPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { BuyerOrderDetailPage } from "./pages/BuyerOrderDetailPage";
import { OrderTrackingPage } from "./pages/OrderTrackingPage";
import { PaymentCallbackPage } from "./pages/PaymentCallbackPage";

function App() {
  return (
    <SupabaseAuthProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/buyer" element={<BuyerDashboard />} />
        <Route path="/buyer/orders/:transactionId" element={<BuyerOrderDetailPage />} />
        <Route path="/track/:transactionId" element={<OrderTrackingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
         <Route path="/admin/setup" element={<AdminSetupPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/pay/:transactionId" element={<PaymentPage />} />
        <Route path="/buy/:linkId" element={<PaymentPage />} />
        <Route path="/link/:linkId" element={<PaymentPage />} />
        <Route path="/payment/callback" element={<PaymentCallbackPage />} />
        <Route path="/store/:storeSlug" element={<StoreFrontPage />} />
        <Route path="/store/:storeSlug/product/:productId" element={<ProductDetailPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <PWAInstallPrompt />
      </BrowserRouter>
    </SupabaseAuthProvider>
  );
}

export default App;