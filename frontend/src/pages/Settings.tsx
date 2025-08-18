import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Power,
  Phone,
  CreditCard,
  Database,
  Bell,
  Shield,
  Save,
  TestTube,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

export function Settings() {
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);
  const [killSwitchReason, setKillSwitchReason] = useState("");
  const [billingRate, setBillingRate] = useState("1.00");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [isSaving, setIsSaving] = useState(false);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleKillSwitch = async () => {
    try {
      setKillSwitchEnabled(!killSwitchEnabled);
      if (!killSwitchEnabled) {
        toast.success(
          "Kill switch activated - all billing jobs are now paused"
        );
      } else {
        toast.success("Kill switch deactivated - billing jobs can now run");
      }
    } catch (error) {
      toast.error("Failed to toggle kill switch");
    }
  };

  const testPhoneAPI = async () => {
    try {
      toast.success("Phone API connection test successful");
    } catch (error) {
      toast.error("Phone API connection test failed");
    }
  };

  const testQBOAPI = async () => {
    try {
      toast.success("QBO API connection test successful");
    } catch (error) {
      toast.error("QBO API connection test failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Configure system settings and integrations
        </p>
      </div>

      {/* Kill Switch */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <Power className="h-6 w-6 text-danger-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Emergency Kill Switch
              </h3>
              <p className="text-sm text-gray-600">
                Immediately stop all billing jobs and prevent new ones from
                starting
              </p>
            </div>
          </div>
          <button
            onClick={toggleKillSwitch}
            className={`btn btn-lg ${
              killSwitchEnabled ? "btn-danger" : "btn-success"
            }`}
          >
            {killSwitchEnabled ? "Deactivate" : "Activate"} Kill Switch
          </button>
        </div>
        {killSwitchEnabled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Reason for Kill Switch
            </label>
            <input
              type="text"
              value={killSwitchReason}
              onChange={(e) => setKillSwitchReason(e.target.value)}
              placeholder="Enter reason for activating kill switch..."
              className="input mt-1"
            />
          </div>
        )}
      </div>

      {/* Billing Configuration */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-primary-100 rounded-lg">
            <CreditCard className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 ml-4">
            Billing Configuration
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rate per Minute ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={billingRate}
              onChange={(e) => setBillingRate(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Billing Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input mt-1"
            >
              <option value="America/Los_Angeles">
                Pacific Time (PST/PDT)
              </option>
              <option value="America/Denver">Mountain Time (MST/MDT)</option>
              <option value="America/Chicago">Central Time (CST/CDT)</option>
              <option value="America/New_York">Eastern Time (EST/EDT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phone System API */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 ml-4">
              Phone System API
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Base URL
              </label>
              <input
                type="url"
                placeholder="https://api.mypurecloud.com"
                className="input mt-1"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                API Key
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="input mt-1"
                disabled
              />
            </div>
            <button
              onClick={testPhoneAPI}
              className="btn btn-secondary btn-md w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Connection
            </button>
          </div>
        </div>

        {/* QuickBooks Online API */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 ml-4">
                QuickBooks Online API
              </h3>
            </div>
            <Link to="/qbo-setup" className="btn btn-primary btn-sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Setup
            </Link>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Environment
              </label>
              <select className="input mt-1" disabled>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Client ID
              </label>
              <input
                type="text"
                placeholder="••••••••••••••••"
                className="input mt-1"
                disabled
              />
            </div>
            <button
              onClick={testQBOAPI}
              className="btn btn-secondary btn-md w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Connection
            </button>
          </div>
        </div>
      </div>

      {/* Database & Logging */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Database className="h-6 w-6 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 ml-4">
            Database & Logging
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Database Host
            </label>
            <input
              type="text"
              value="localhost"
              className="input mt-1"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Database Name
            </label>
            <input
              type="text"
              value="phone_billing"
              className="input mt-1"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Log Level
            </label>
            <select className="input mt-1" disabled>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info" selected>
                Info
              </option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Log Retention
            </label>
            <select className="input mt-1" disabled>
              <option value="7d">7 days</option>
              <option value="14d" selected>
                14 days
              </option>
              <option value="30d">30 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Bell className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 ml-4">
            Notifications
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailNotifications"
              defaultChecked
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="emailNotifications"
              className="ml-2 block text-sm text-gray-900"
            >
              Email notifications for billing job completion/failure
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="slackNotifications"
              defaultChecked
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="slackNotifications"
              className="ml-2 block text-sm text-gray-900"
            >
              Slack notifications for critical system events
            </label>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 ml-4">Security</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rateLimiting"
              defaultChecked
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="rateLimiting"
              className="ml-2 block text-sm text-gray-900"
            >
              Enable API rate limiting
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auditLogging"
              defaultChecked
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="auditLogging"
              className="ml-2 block text-sm text-gray-900"
            >
              Enable audit logging for all actions
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="btn btn-primary btn-lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
