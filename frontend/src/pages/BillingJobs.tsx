import { useState, useEffect } from "react";
import { Play, RefreshCw, X, Eye, Search } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

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
  errorMessage?: string;
}

export function BillingJobs() {
  const [jobs, setJobs] = useState<BillingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<BillingJob | null>(null);
  const [showRunJobModal, setShowRunJobModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchBillingJobs();
  }, []);

  const fetchBillingJobs = async () => {
    try {
      // Mock data - replace with actual API call
      const mockJobs: BillingJob[] = [
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
        {
          id: "3",
          jobId: "BILL_2024_11_GHI789",
          status: "failed",
          type: "monthly",
          billingPeriodStart: "2024-11-01",
          billingPeriodEnd: "2024-11-30",
          totalAmount: 0,
          invoicesCreated: 0,
          invoicesFailed: 24,
          createdAt: "2024-12-01T02:00:00Z",
          errorMessage: "QBO API connection failed",
        },
      ];
      setJobs(mockJobs);
    } catch (error) {
      toast.error("Failed to load billing jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const runBillingJob = async (
    startDate: string,
    endDate: string,
    isDryRun: boolean = false
  ) => {
    try {
      toast.success(
        `Billing job started for ${startDate} to ${endDate}${
          isDryRun ? " (Dry Run)" : ""
        }`
      );
      setShowRunJobModal(false);
      // Add actual API call here
    } catch (error) {
      toast.error("Failed to start billing job");
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      toast.success(`Job retry initiated for ${jobId}`);
      // Add actual API call here
    } catch (error) {
      toast.error("Failed to retry job");
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      toast.success(`Job cancelled for ${jobId}`);
      // Add actual API call here
    } catch (error) {
      toast.error("Failed to cancel job");
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.jobId
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    pending: "⏳",
    in_progress: "🔄",
    completed: "✅",
    failed: "❌",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Jobs</h1>
          <p className="text-gray-600">
            Manage and monitor billing job execution
          </p>
        </div>
        <button
          onClick={() => setShowRunJobModal(true)}
          className="btn btn-primary btn-md"
        >
          <Play className="h-4 w-4 mr-2" />
          Run New Job
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {job.jobId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${statusColors[job.status]}`}>
                      {statusIcons[job.status]} {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {job.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(job.billingPeriodStart), "MMM dd")} -{" "}
                      {format(new Date(job.billingPeriodEnd), "MMM dd, yyyy")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {job.invoicesCreated} created
                      {job.invoicesFailed > 0 && (
                        <span className="text-danger-600 ml-2">
                          • {job.invoicesFailed} failed
                        </span>
                      )}
                    </div>
                    {job.totalAmount > 0 && (
                      <div className="text-sm text-gray-500">
                        ${job.totalAmount.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(job.createdAt), "MMM dd, yyyy")}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(job.createdAt), "HH:mm")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {job.status === "failed" && (
                        <button
                          onClick={() => retryJob(job.id)}
                          className="text-warning-600 hover:text-warning-900"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      {(job.status === "pending" ||
                        job.status === "in_progress") && (
                        <button
                          onClick={() => cancelJob(job.id)}
                          className="text-danger-600 hover:text-danger-900"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Job Modal */}
      {showRunJobModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Run Billing Job
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  runBillingJob(
                    formData.get("startDate") as string,
                    formData.get("endDate") as string,
                    formData.get("isDryRun") === "on"
                  );
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      required
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      required
                      className="input mt-1"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isDryRun"
                      id="isDryRun"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isDryRun"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Dry Run (no invoices created)
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowRunJobModal(false)}
                    className="btn btn-secondary btn-md"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-md">
                    Run Job
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Job Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Job ID:</span>{" "}
                  {selectedJob.jobId}
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span
                    className={`badge ${statusColors[selectedJob.status]} ml-2`}
                  >
                    {selectedJob.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Type:</span> {selectedJob.type}
                </div>
                <div>
                  <span className="font-medium">Period:</span>{" "}
                  {format(
                    new Date(selectedJob.billingPeriodStart),
                    "MMM dd, yyyy"
                  )}{" "}
                  -{" "}
                  {format(
                    new Date(selectedJob.billingPeriodEnd),
                    "MMM dd, yyyy"
                  )}
                </div>
                <div>
                  <span className="font-medium">Invoices Created:</span>{" "}
                  {selectedJob.invoicesCreated}
                </div>
                <div>
                  <span className="font-medium">Invoices Failed:</span>{" "}
                  {selectedJob.invoicesFailed}
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span> $
                  {selectedJob.totalAmount.toLocaleString()}
                </div>
                {selectedJob.errorMessage && (
                  <div>
                    <span className="font-medium text-danger-600">Error:</span>{" "}
                    {selectedJob.errorMessage}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="btn btn-secondary btn-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
