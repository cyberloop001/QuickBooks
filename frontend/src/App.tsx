import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { BillingJobs } from "./pages/BillingJobs";
import { Clients } from "./pages/Clients";
import { QBOSetup } from "./pages/QBOSetup";
import { QBOCallback } from "./pages/QBOCallback";
import { GenesysIntegration } from "./pages/GenesysIntegration";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { useAuthStore } from "./stores/authStore";

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/billing" element={<BillingJobs />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/qbo-setup" element={<QBOSetup />} />
        <Route path="/qbo-callback" element={<QBOCallback />} />
        <Route path="/genesys" element={<GenesysIntegration />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
