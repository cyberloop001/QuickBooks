import { useState, useEffect } from "react";
import { Play, RefreshCw, X, Eye, Search } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface BillingJob {
  id: string;
  jobId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  type: "monthly" | "manual" | "dry_run";
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalInvoices: number;
  successfulInvoices: number;
  failedInvoices: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface RunJobRequest {
  startDate: string;
  endDate: string;
  isDryRun: boolean;
  clientId?: string;
}

export function BillingJobs() {
  const [jobs, setJobs] = useState<BillingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BillingJob | null>(null);
  const [showRunJobModal, setShowRunJobModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRunningJob, setIsRunningJob] = useState(false);

  useEffect(() => {
    fetchBillingJobs();
  }, []);

  const fetchBillingJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/v1/billing/jobs");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setJobs(data.data || []);
      } else {
        throw new Error(data.error || "Failed to fetch billing jobs");
      }
    } catch (error) {
      console.error("Error fetching billing jobs:", error);
      toast.error("Failed to load billing jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const runBillingJob = async (jobRequest: RunJobRequest) => {
    try {
      setIsRunningJob(true);

      const response = await fetch("/api/v1/billing/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriodStart: jobRequest.startDate,
          billingPeriodEnd: jobRequest.endDate,
          isDryRun: jobRequest.isDryRun,
          clientId: jobRequest.clientId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start billing job");
      }

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Billing job started successfully! Job ID: ${data.data.jobId}`
        );
        setShowRunJobModal(false);

        // Refresh the jobs list to show the new job
        setTimeout(() => {
          fetchBillingJobs();
        }, 1000);
      } else {
        throw new Error(data.error || "Failed to start billing job");
      }
    } catch (error) {
      console.error("Error running billing job:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start billing job"
      );
    } finally {
      setIsRunningJob(false);
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/v1/billing-jobs/${jobId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to retry job");
      }

      const data = await response.json();

      if (data.success) {
        toast.success(`Job retry initiated for ${jobId}`);
        // Refresh the jobs list
        fetchBillingJobs();
      } else {
        throw new Error(data.error || "Failed to retry job");
      }
    } catch (error) {
      console.error("Error retrying job:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to retry job"
      );
    }
  };

  const cancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this job?")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/billing-jobs/${jobId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel job");
      }

      const data = await response.json();

      if (data.success) {
        toast.success(`Job cancelled for ${jobId}`);
        // Refresh the jobs list
        fetchBillingJobs();
      } else {
        throw new Error(data.error || "Failed to cancel job");
      }
    } catch (error) {
      console.error("Error cancelling job:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel job"
      );
    }
  };

  const refreshJobs = async () => {
    setIsRefreshing(true);
    await fetchBillingJobs();
    setIsRefreshing(false);
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
        <div className="flex items-center space-x-3">
          <button
            onClick={refreshJobs}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={() => setShowRunJobModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Play className="h-4 w-4 mr-2" />
            Run New Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[job.status]
                      }`}
                    >
                      {statusIcons[job.status]} {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {job.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(job.startDate), "MMM dd")} -{" "}
                      {format(new Date(job.endDate), "MMM dd, yyyy")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {job.successfulInvoices} created
                      {job.failedInvoices > 0 && (
                        <span className="text-red-600 ml-2">
                          • {job.failedInvoices} failed
                        </span>
                      )}
                    </div>
                    {job.totalAmount > 0 && (
                      <div className="text-sm text-gray-500">
                        ${job.totalAmount.toLocaleString()}
                      </div>
                    )}
                    {job.totalInvoices > 0 && (
                      <div className="text-xs text-gray-400">
                        Total: {job.totalInvoices} invoices
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
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {job.status === "failed" && (
                        <button
                          onClick={() => retryJob(job.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Retry Job"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      {(job.status === "pending" ||
                        job.status === "in_progress") && (
                        <button
                          onClick={() => cancelJob(job.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Job"
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
                  runBillingJob({
                    startDate: formData.get("startDate") as string,
                    endDate: formData.get("endDate") as string,
                    isDryRun: formData.get("isDryRun") === "on",
                  });
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
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
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
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
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
                    disabled={isRunningJob}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRunningJob}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunningJob ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Job
                      </>
                    )}
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
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {selectedJob.jobId}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                      statusColors[selectedJob.status]
                    }`}
                  >
                    {statusIcons[selectedJob.status]}{" "}
                    {selectedJob.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  <span className="capitalize">
                    {selectedJob.type.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Period:</span>{" "}
                  {format(new Date(selectedJob.startDate), "MMM dd, yyyy")} -{" "}
                  {format(new Date(selectedJob.endDate), "MMM dd, yyyy")}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {format(
                    new Date(selectedJob.createdAt),
                    "MMM dd, yyyy HH:mm"
                  )}
                </div>
                {selectedJob.completedAt && (
                  <div>
                    <span className="font-medium">Completed:</span>{" "}
                    {format(
                      new Date(selectedJob.completedAt),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="font-medium text-gray-700 mb-2">
                    Results Summary:
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-600">Total Invoices:</span>
                      <div className="font-medium">
                        {selectedJob.totalInvoices}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Successful:</span>
                      <div className="font-medium text-green-600">
                        {selectedJob.successfulInvoices}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Failed:</span>
                      <div className="font-medium text-red-600">
                        {selectedJob.failedInvoices}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <div className="font-medium">
                        ${selectedJob.totalAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                {selectedJob.errorMessage && (
                  <div className="border-t pt-3">
                    <span className="font-medium text-red-600">
                      Error Details:
                    </span>
                    <div className="text-red-600 text-xs mt-1 bg-red-50 p-2 rounded">
                      {selectedJob.errorMessage}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
