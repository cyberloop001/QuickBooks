import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { QBOSetup } from "./pages/QBOSetup";
import { QBOCallback } from "./pages/QBOCallback";
import { GenesysIntegration } from "./pages/GenesysIntegration";
import { CompanyInfo } from "./pages/CompanyInfo";
import { BillingJobs } from "./pages/BillingJobs";
import { CustomerProfiles } from "./pages/CustomerProfiles";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { useAuthStore } from "./stores/authStore";
import { Toaster } from "react-hot-toast";

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/qbo-callback" element={<QBOCallback />} />

        {isAuthenticated ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="qbo-setup" element={<QBOSetup />} />
            <Route path="genesys" element={<GenesysIntegration />} />
            <Route path="company-info" element={<CompanyInfo />} />
            <Route path="billing-jobs" element={<BillingJobs />} />
            <Route path="customer-profiles" element={<CustomerProfiles />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </>
  );
}

export default App;
