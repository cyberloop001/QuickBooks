import { useState, useEffect } from "react";
import {
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
  scheduler: {
    billing: {
      isRunning: boolean;
      totalScheduledJobs: number;
      scheduledJobs: Array<{
        customerId: string;
        billDate: number;
        nextRun: Date;
      }>;
      timezone: string;
    };
  };
  overall: {
    healthy: boolean;
    issues: string[];
  };
}

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [billingJobs, setBillingJobs] = useState<BillingJob[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [qboStatus, setQBOStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, jobsRes, statusRes, qboStatusRes] = await Promise.all(
        [
          fetch("/api/v1/dashboard/overview"),
          fetch("/api/v1/dashboard/billing-jobs?limit=10"),
          fetch("/api/v1/dashboard/system-status"),
          fetch("/api/v1/qbo/status"),
        ]
      );

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

      if (qboStatusRes.ok) {
        const qboStatusData = await qboStatusRes.json();
        setQBOStatus(qboStatusData.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
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
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">System Health</h3>
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSystemHealthColor(
                systemStatus.overall.healthy && qboStatus?.connected
              )}`}
            >
              {systemStatus.overall.healthy && qboStatus?.connected
                ? "Healthy"
                : "Issues"}
            </span>
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">
              {systemStatus.overall.issues.length +
                (qboStatus?.connected === false ? 1 : 0)}
            </div>
            <p className="text-xs text-gray-500">Active issues</p>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span>Genesys:</span>
              {systemStatus.genesys.hasValidToken ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-red-600" />
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span>Scheduler:</span>
              {systemStatus.scheduler.billing?.totalScheduledJobs > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-red-600" />
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span>QBO:</span>
              {qboStatus?.connected ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-red-600" />
              )}
            </div>
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
              ${overview.billing.totalRevenue}
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

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Billing Schedules</h3>
            <Calendar className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">
              {systemStatus.scheduler.billing?.totalScheduledJobs || 0}
            </div>
            <p className="text-xs text-gray-500">Active schedules</p>
          </div>
        </div>
      </div>

      {/* Company Information Quick View */}
      {qboStatus?.authenticated && (
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
                {qboStatus.companyInfo?.companyName || "QuickBooks Online"}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs font-medium text-gray-600">Environment</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {qboStatus.environment || "Production"}
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
            {["overview", "billing", "schedules", "system", "usage"].map(
              (tab) => (
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
              )
            )}
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
                      {systemStatus.scheduler.billing?.scheduledJobs?.length > 0
                        ? format(
                            new Date(
                              systemStatus.scheduler.billing.scheduledJobs[0].nextRun
                            ),
                            "MMM dd, yyyy HH:mm"
                          )
                        : "No schedules"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Billing Schedules */}
            {systemStatus.scheduler.billing?.scheduledJobs?.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="pb-2">
                  <h3 className="text-lg font-medium flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Customer Billing Schedules
                  </h3>
                </div>
                <div className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemStatus.scheduler.billing.scheduledJobs
                      .slice(0, 6)
                      .map((schedule, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              Customer {schedule.customerId.slice(0, 8)}...
                            </span>
                            <span className="text-xs text-gray-500">
                              Day {schedule.billDate}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Next:{" "}
                            {format(
                              new Date(schedule.nextRun),
                              "MMM dd, HH:mm"
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {systemStatus.scheduler.billing.scheduledJobs.length > 6 && (
                    <div className="text-center mt-4">
                      <span className="text-sm text-gray-500">
                        +
                        {systemStatus.scheduler.billing.scheduledJobs.length -
                          6}{" "}
                        more schedules
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                          invoices • ${job.totalAmount}
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

        {activeTab === "schedules" && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="pb-2">
                <h3 className="text-lg font-medium flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Customer Billing Schedules
                </h3>
              </div>
              <div className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemStatus.scheduler.billing?.scheduledJobs?.map(
                    (schedule, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            Customer {schedule.customerId.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-gray-500">
                            Day {schedule.billDate}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Next:{" "}
                          {format(new Date(schedule.nextRun), "MMM dd, HH:mm")}
                        </div>
                      </div>
                    )
                  )}
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
                    {qboStatus?.connected ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {qboStatus?.connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>

                  {qboStatus?.companyInfo && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="font-medium">
                        Company: {qboStatus.companyInfo.companyName}
                      </div>
                      <div>
                        Environment: {qboStatus.companyInfo.environment}
                      </div>
                    </div>
                  )}

                  {qboStatus?.tokenStatus?.expiresIn && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Token expires in {qboStatus.tokenStatus.expiresIn}
                      </span>
                    </div>
                  )}

                  {qboStatus?.connected === false && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      QBO connection failed - billing integration may be
                      affected
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
                    <Calendar className="h-5 w-4 mr-2" />
                    Billing Scheduler
                  </h3>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    {systemStatus.scheduler.billing?.totalScheduledJobs > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {systemStatus.scheduler.billing?.totalScheduledJobs > 0
                        ? "Active"
                        : "No schedules"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {systemStatus.scheduler.billing?.totalScheduledJobs || 0}{" "}
                      customer schedules
                    </span>
                  </div>
                  {systemStatus.scheduler.billing?.isRunning && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-600">
                        Processing billing...
                      </span>
                    </div>
                  )}
                  {systemStatus.scheduler.billing?.scheduledJobs?.length >
                    0 && (
                    <div className="text-xs text-gray-500">
                      Next run:{" "}
                      {format(
                        new Date(
                          systemStatus.scheduler.billing.scheduledJobs[0].nextRun
                        ),
                        "MMM dd, HH:mm"
                      )}
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
