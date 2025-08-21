import { useState, useEffect } from "react";
import {
  Activity,
  CreditCard,
  Users,
  Phone,
  Database,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  PhoneCall,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface DashboardOverview {
  clients: {
    total: number;
  };
  billing: {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalInvoices: number;
    totalRevenue: number;
  };
  usage: {
    totalMinutes: number;
    totalCalls: number;
  };
  system: {
    qbo: any;
    genesys: any;
    scheduler: any;
  };
  config: {
    timezone: string;
    ratePerMinute: number;
    currency: string;
  };
}

interface BillingJob {
  id: string;
  jobId: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  totalClients: number;
  totalInvoices: number;
  totalAmount: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface SystemStatus {
  qbo: any;
  genesys: any;
  scheduler: any;
  overall: {
    healthy: boolean;
    issues: string[];
  };
}

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [billingJobs, setBillingJobs] = useState<BillingJob[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, jobsRes, statusRes] = await Promise.all([
        fetch("/api/v1/dashboard/overview"),
        fetch("/api/v1/dashboard/billing-jobs?limit=10"),
        fetch("/api/v1/dashboard/system-status"),
      ]);

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData.data);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setBillingJobs(jobsData.data.jobs);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSystemStatus(statusData.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const testSystemConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/dashboard/system-status/test", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("System connections tested successfully");
        fetchDashboardData(); // Refresh data
      } else {
        toast.error("System connection test failed");
      }
    } catch (error) {
      toast.error("Failed to test system connections");
    } finally {
      setLoading(false);
    }
  };

  const runManualBilling = async () => {
    const startDate = format(new Date().setDate(1), "yyyy-MM-dd");
    const endDate = format(new Date(), "yyyy-MM-dd");

    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/dashboard/billing-jobs/run?startDate=${startDate}&endDate=${endDate}&isDryRun=true`,
        { method: "POST" }
      );
      const data = await response.json();

      if (data.success) {
        toast.success("Manual billing job started successfully");
        fetchDashboardData(); // Refresh data
      } else {
        toast.error("Failed to start manual billing job");
      }
    } catch (error) {
      toast.error("Failed to start manual billing job");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSystemHealthColor = (healthy: boolean) => {
    return healthy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  if (!overview || !systemStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">System overview and monitoring</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={testSystemConnections}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <Activity className="h-4 w-4 mr-2" />
            Test Connections
          </button>
          <button
            onClick={runManualBilling}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Run Billing
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">System Health</h3>
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSystemHealthColor(
                systemStatus.overall.healthy
              )}`}
            >
              {systemStatus.overall.healthy ? "Healthy" : "Issues"}
            </span>
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">
              {systemStatus.overall.issues.length}
            </div>
            <p className="text-xs text-gray-500">Active issues</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Clients</h3>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">{overview.clients.total}</div>
            <p className="text-xs text-gray-500">Active clients</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Revenue</h3>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">
              ${overview.billing.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">All time</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Phone Usage</h3>
            <PhoneCall className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">
              {overview.usage.totalMinutes}
            </div>
            <p className="text-xs text-gray-500">Minutes this month</p>
          </div>
        </div>
      </div>

      {/* Company Information Quick View */}
      {systemStatus?.qbo?.authenticated && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Company Information
            </h3>
            <Link
              to="/company-info"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Full Details →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">Company</p>
              <p className="text-sm font-semibold text-gray-900">
                {systemStatus.qbo.companyName || "QuickBooks Online"}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">Environment</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {systemStatus.qbo.environment || "Production"}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">Status</p>
              <p className="text-sm font-semibold text-green-600">Connected</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {["overview", "billing", "system", "usage"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Billing Summary */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="pb-2">
                  <h3 className="text-lg font-medium flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Billing Summary
                  </h3>
                </div>
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {overview.billing.totalJobs}
                      </div>
                      <p className="text-sm text-blue-600">Total Jobs</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {overview.billing.successfulJobs}
                      </div>
                      <p className="text-sm text-green-600">Successful</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {overview.billing.failedJobs}
                      </div>
                      <p className="text-sm text-red-600">Failed</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {overview.billing.totalInvoices}
                      </div>
                      <p className="text-sm text-purple-600">Invoices</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Configuration */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="pb-2">
                  <h3 className="text-lg font-medium flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    System Configuration
                  </h3>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Timezone:</span>
                    <span className="font-medium">
                      {overview.config.timezone}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Rate per minute:
                    </span>
                    <span className="font-medium">
                      ${overview.config.ratePerMinute}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Currency:</span>
                    <span className="font-medium">
                      {overview.config.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Next billing run:
                    </span>
                    <span className="font-medium">
                      {systemStatus.scheduler.nextRun
                        ? format(
                            new Date(systemStatus.scheduler.nextRun),
                            "MMM dd, yyyy HH:mm"
                          )
                        : "Not scheduled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="pb-2">
                <h3 className="text-lg font-medium">Recent Billing Jobs</h3>
              </div>
              <div className="pt-4">
                <div className="space-y-4">
                  {billingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium">{job.jobId}</h3>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              job.status
                            )}`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {format(new Date(job.startDate), "MMM dd")} -{" "}
                          {format(new Date(job.endDate), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {job.totalClients} clients • {job.totalInvoices}{" "}
                          invoices • ${job.totalAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {format(new Date(job.createdAt), "MMM dd, HH:mm")}
                        </p>
                        {job.error && (
                          <p className="text-xs text-red-600 mt-1">
                            {job.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* QBO Status */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="pb-2">
                  <h3 className="text-lg font-medium flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    QuickBooks Online
                  </h3>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    {systemStatus.qbo.isAuthenticated ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {systemStatus.qbo.isAuthenticated
                        ? "Connected"
                        : "Disconnected"}
                    </span>
                  </div>
                  {systemStatus.qbo.expiresIn && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Expires in {systemStatus.qbo.expiresIn}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Genesys Status */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="pb-2">
                  <h3 className="text-lg font-medium flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Genesys Cloud
                  </h3>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    {systemStatus.genesys.hasValidToken ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {systemStatus.genesys.hasValidToken
                        ? "Connected"
                        : "Disconnected"}
                    </span>
                  </div>
                  {systemStatus.genesys.tokenExpiresAt && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Expires{" "}
                        {format(
                          new Date(systemStatus.genesys.tokenExpiresAt),
                          "MMM dd, HH:mm"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Scheduler Status */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="pb-2">
                  <h3 className="text-lg font-medium flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Billing Scheduler
                  </h3>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    {systemStatus.scheduler.isSchedulerActive ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {systemStatus.scheduler.isSchedulerActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                  {systemStatus.scheduler.nextRun && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Next run{" "}
                        {format(
                          new Date(systemStatus.scheduler.nextRun),
                          "MMM dd, HH:mm"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Issues */}
            {systemStatus.overall.issues.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow border border-red-200">
                <div className="pb-2">
                  <h3 className="text-lg font-medium flex items-center text-red-800">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    System Issues
                  </h3>
                </div>
                <div className="pt-4">
                  <ul className="space-y-2">
                    {systemStatus.overall.issues.map((issue, index) => (
                      <li
                        key={index}
                        className="flex items-center space-x-2 text-red-700"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "usage" && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="pb-2">
                <h3 className="text-lg font-medium flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Usage Analytics
                </h3>
              </div>
              <div className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {overview.usage.totalCalls}
                    </div>
                    <p className="text-sm text-blue-600">Total Calls</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {overview.usage.totalMinutes}
                    </div>
                    <p className="text-sm text-green-600">Total Minutes</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      $
                      {(
                        overview.usage.totalMinutes *
                        overview.config.ratePerMinute
                      ).toFixed(2)}
                    </div>
                    <p className="text-sm text-purple-600">Estimated Revenue</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
