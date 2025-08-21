import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { redirect } from "react-router-dom";

interface QBOStatus {
  authenticated: boolean;
  hasTokens: boolean;
  environment: string;
  clientId: string;
  redirectUri: string;
}

export function QBOSetup() {
  const [status, setStatus] = useState<QBOStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetchQBOStatus();
  }, []);

  const fetchQBOStatus = async () => {
    try {
      const response = await fetch("/api/v1/qbo/status");
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
      } else {
        toast.error("Failed to fetch QBO status");
      }
    } catch (error) {
      toast.error("Failed to fetch QBO status");
    } finally {
      setIsLoading(false);
    }
  };

  const startOAuthFlow = async () => {
    try {
      const response = await fetch("/api/v1/qbo/auth");
      const data = await response.json();

      if (data.success) {
        // Open the authorization URL in a new window
        window.location.href = data.data.authUrl;
        toast.success(
          "OAuth window opened. Please complete the authorization."
        );
      } else {
        toast.error("Failed to start OAuth flow");
      }
    } catch (error) {
      toast.error("Failed to start OAuth flow");
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/api/v1/qbo/test-connection", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("QBO connection successful!");
        await fetchCompanyInfo();
      } else {
        toast.error(data.error || "Connection test failed");
      }
    } catch (error) {
      toast.error("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch("/api/v1/qbo/company-info");
      const data = await response.json();

      if (data.success) {
        setCompanyInfo(data.data);
      }
    } catch (error) {
      // Company info fetch failed, but that's okay
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch("/api/v1/qbo/refresh");
      const data = await response.json();

      if (data.success) {
        toast.success("Token refreshed successfully");
        await fetchQBOStatus();
      } else {
        toast.error("Failed to refresh token");
      }
    } catch (error) {
      toast.error("Failed to refresh token");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          QuickBooks Online Setup
        </h1>
        <p className="text-gray-600">
          Configure your QBO integration for automated billing
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div
              className={`p-2 rounded-lg ${
                status?.authenticated ? "bg-success-100" : "bg-danger-100"
              }`}
            >
              {status?.authenticated ? (
                <CheckCircle className="h-6 w-6 text-success-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-danger-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Authentication
              </p>
              <p
                className={`text-lg font-semibold ${
                  status?.authenticated ? "text-success-600" : "text-danger-600"
                }`}
              >
                {status?.authenticated ? "Connected" : "Not Connected"}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Settings className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Environment</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {status?.environment || "Not Set"}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div
              className={`p-2 rounded-lg ${
                status?.hasTokens ? "bg-success-100" : "bg-warning-100"
              }`}
            >
              <CreditCard className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tokens</p>
              <p
                className={`text-lg font-semibold ${
                  status?.hasTokens ? "text-success-600" : "text-warning-600"
                }`}
              >
                {status?.hasTokens ? "Valid" : "Missing"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Configuration Status
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Client ID</span>
            <span
              className={`text-sm font-medium ${
                status?.clientId === "configured"
                  ? "text-success-600"
                  : "text-danger-600"
              }`}
            >
              {status?.clientId === "configured"
                ? "✓ Configured"
                : "✗ Not Configured"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Redirect URI</span>
            <span
              className={`text-sm font-medium ${
                status?.redirectUri === "configured"
                  ? "text-success-600"
                  : "text-danger-600"
              }`}
            >
              {status?.redirectUri === "configured"
                ? "✓ Configured"
                : "✗ Not Configured"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">OAuth Flow</span>
            <span
              className={`text-sm font-medium ${
                status?.authenticated ? "text-success-600" : "text-warning-600"
              }`}
            >
              {status?.authenticated ? "✓ Completed" : "⚠ Pending"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          {!status?.authenticated ? (
            <button onClick={startOAuthFlow} className="btn btn-primary btn-lg">
              <ExternalLink className="h-4 w-4 mr-2" />
              Start OAuth Authorization
            </button>
          ) : (
            <>
              <button
                onClick={testConnection}
                disabled={isTesting}
                className="btn btn-success btn-lg"
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isTesting ? "Testing..." : "Test Connection"}
              </button>
            </>
          )}
          {status?.hasTokens && (
            <button onClick={refreshToken} className="btn btn-secondary btn-lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Token
            </button>
          )}
        </div>
      </div>

      {/* Company Information */}
      {companyInfo && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Company Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Company Name</p>
              <p className="text-sm text-gray-900">{companyInfo.CompanyName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Legal Name</p>
              <p className="text-sm text-gray-900">{companyInfo.LegalName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Country</p>
              <p className="text-sm text-gray-900">{companyInfo.Country}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Fiscal Year Start
              </p>
              <p className="text-sm text-gray-900">
                {companyInfo.FiscalYearStartMonth}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Setup Instructions
        </h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex items-start">
            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-1">
              1
            </span>
            <div>
              <p className="font-medium text-gray-900">Create QBO App</p>
              <p>
                Go to{" "}
                <a
                  href="https://developer.intuit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Intuit Developer Portal
                </a>{" "}
                and create a new app
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-1">
              2
            </span>
            <div>
              <p className="font-medium text-gray-900">Configure OAuth</p>
              <p>
                Set the redirect URI to:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {window.location.origin}/api/qbo/callback
                </code>
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-1">
              3
            </span>
            <div>
              <p className="font-medium text-gray-900">Update Environment</p>
              <p>Copy your Client ID and Client Secret to your .env file</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-1">
              4
            </span>
            <div>
              <p className="font-medium text-gray-900">Authorize Access</p>
              <p>
                Click "Start OAuth Authorization" above to complete the setup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Troubleshooting
        </h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900">
              OAuth Window Not Opening?
            </p>
            <p>
              Check your browser's popup blocker and ensure the redirect URI
              matches exactly
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Authorization Failing?</p>
            <p>
              Verify your Client ID, Client Secret, and redirect URI in the
              Intuit Developer Portal
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              Connection Test Failing?
            </p>
            <p>
              Try refreshing your access token or re-authorizing the application
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
