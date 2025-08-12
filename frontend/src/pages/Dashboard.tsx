import { useState, useEffect } from "react";
import {
  Users,
  CreditCard,
  AlertTriangle,
  Play,
  Calendar,
  DollarSign,
  Phone,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";

interface DashboardStats {
  totalClients: number;
  totalInvoices: number;
  totalAmount: number;
  activeJobs: number;
  failedJobs: number;
}

interface BillingJob {
  id: string;
  jobId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  type: "monthly" | "manual" | "dry_run";
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalAmount: number;
  invoicesCreated: number;
  invoicesFailed: number;
  createdAt: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalInvoices: 0,
    totalAmount: 0,
    activeJobs: 0,
    failedJobs: 0,
  });
  const [recentJobs, setRecentJobs] = useState<BillingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data for demo - replace with actual API calls
      setStats({
        totalClients: 24,
        totalInvoices: 156,
        totalAmount: 45230.5,
        activeJobs: 2,
        failedJobs: 1,
      });

      setRecentJobs([
        {
          id: "1",
          jobId: "BILL_2025_01_ABC123",
          status: "completed",
          type: "monthly",
          billingPeriodStart: "2025-01-01",
          billingPeriodEnd: "2025-01-31",
          totalAmount: 12540.75,
          invoicesCreated: 24,
          invoicesFailed: 0,
          createdAt: "2025-02-01T02:00:00Z",
        },
        {
          id: "2",
          jobId: "BILL_2024_12_DEF456",
          status: "completed",
          type: "monthly",
          billingPeriodStart: "2024-12-01",
          billingPeriodEnd: "2024-12-31",
          totalAmount: 11890.25,
          invoicesCreated: 24,
          invoicesFailed: 0,
          createdAt: "2025-01-01T02:00:00Z",
        },
      ]);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const runBillingJob = async () => {
    try {
      toast.success("Billing job started successfully!");
      // Add actual API call here
    } catch (error) {
      toast.error("Failed to start billing job");
    }
  };

  const chartData = [
    { month: "Oct", amount: 11200 },
    { month: "Nov", amount: 11800 },
    { month: "Dec", amount: 11890 },
    { month: "Jan", amount: 12540 },
  ];

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your phone billing system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalClients}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Invoices
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalInvoices}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-danger-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed Jobs</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.failedJobs}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <button onClick={runBillingJob} className="btn btn-primary btn-md">
            <Play className="h-4 w-4 mr-2" />
            Run Billing Job
          </button>
          <button className="btn btn-secondary btn-md">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Job
          </button>
          <button className="btn btn-secondary btn-md">
            <Phone className="h-4 w-4 mr-2" />
            Test Phone API
          </button>
        </div>
      </div>

      {/* Charts and Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Revenue
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Billing Jobs
          </h2>
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {job.jobId}
                  </span>
                  <span className={`badge ${statusColors[job.status]}`}>
                    {job.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {new Date(job.billingPeriodStart).toLocaleDateString()} -{" "}
                  {new Date(job.billingPeriodEnd).toLocaleDateString()}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {job.invoicesCreated} invoices • $
                    {job.totalAmount.toLocaleString()}
                  </span>
                  <span className="text-gray-500">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
