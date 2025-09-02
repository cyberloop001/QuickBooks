import { useState, useEffect } from "react";
import {
  Play,
  RefreshCw,
  X,
  Eye,
  Search,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { ReactElement } from "react";

interface BillingJob {
  id: string;
  jobId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  type: "MONTHLY" | "MANUAL" | "DRY_RUN";
  startDate: string;
  endDate: string;
  totalCustomers: number;
  totalInvoices: number;
  totalAmount: number;
  successfulInvoices: number;
  failedInvoices: number;
  error?: string;
  metadata?: any;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface RunJobRequest {
  startDate: string;
  endDate: string;
  isDryRun: boolean;
  selectedQueues?: string[];
  clientId?: string;
}

interface QueueInfo {
  name: string;
  customers: Array<{
    customerId: string;
    qboDisplayName: string;
    qboCompanyName: string;
    ratePerMinute: number;
    minimumMinutes: number;
    overageRatePerMinute: number;
  }>;
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
  const [availableQueues, setAvailableQueues] = useState<QueueInfo[]>([]);
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [isLoadingQueues, setIsLoadingQueues] = useState(false);

  useEffect(() => {
    fetchBillingJobs();
    fetchAvailableQueues();
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

  const fetchAvailableQueues = async () => {
    try {
      setIsLoadingQueues(true);
      const response = await fetch("/api/v1/billing/queues");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAvailableQueues(data.data.queues || []);
        // Initialize with all queues selected by default
        setSelectedQueues(data.data.queues.map((q: QueueInfo) => q.name) || []);
      } else {
        throw new Error(data.error || "Failed to fetch available queues");
      }
    } catch (error) {
      console.error("Error fetching available queues:", error);
      toast.error("Failed to load available queues");
    } finally {
      setIsLoadingQueues(false);
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
          selectedQueues: jobRequest.selectedQueues || [],
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
        closeRunJobModal();

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
      const response = await fetch(`/api/v1/billing/retry/${jobId}`, {
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
      const response = await fetch(`/api/v1/billing/jobs/${jobId}`, {
        method: "DELETE",
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
    PENDING: "bg-yellow-100 text-yellow-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };

  const statusIcons: Record<string, ReactElement> = {
    PENDING: <Clock className="h-3 w-3" />,
    IN_PROGRESS: <Loader2 className="h-3 w-3 animate-spin" />,
    COMPLETED: <CheckCircle className="h-3 w-3" />,
    FAILED: <AlertCircle className="h-3 w-3" />,
    CANCELLED: <Ban className="h-3 w-3" />,
  };

  const statusLabels = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
  };

  const getStatusDisplay = (status: string) => {
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  const getStatusLabel = (status: string) => {
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  const toggleQueueSelection = (queueName: string) => {
    setSelectedQueues((prev) =>
      prev.includes(queueName)
        ? prev.filter((q) => q !== queueName)
        : [...prev, queueName]
    );
  };

  const openRunJobModal = () => {
    // Reset selected queues to all available queues by default
    setSelectedQueues(availableQueues.map((q) => q.name));
    setShowRunJobModal(true);
  };

  const closeRunJobModal = () => {
    setShowRunJobModal(false);
    setSelectedQueues([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse"></div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Jobs</h1>
          <p className="text-gray-600">
            Manage and monitor billing job execution
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={refreshJobs}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={openRunJobModal}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Play className="h-4 w-4 mr-2" />
            Run New Job
          </button>
        </div>
      </div>

      {/* Refresh Indicator */}
      {isRefreshing && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin mr-2" />
            <span className="text-sm text-blue-800">
              Refreshing billing jobs...
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 block w-full border-gray-300 rounded-md shadow-sm focus:outline-gray-300 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-auto border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No billing jobs found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Get started by running your first billing job."}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <div className="mt-6">
                <button
                  onClick={openRunJobModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run First Job
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="space-y-3 p-4">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {job.jobId}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {format(
                            new Date(job.createdAt),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                          statusColors[job.status] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getStatusLabel(job.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <div className="font-medium">
                          {job.type === "MONTHLY"
                            ? "Monthly"
                            : job.type === "MANUAL"
                            ? "Manual"
                            : "Dry Run"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Period:</span>
                        <div className="font-medium">
                          {format(new Date(job.startDate), "MMM dd")} -{" "}
                          {format(new Date(job.endDate), "MMM dd")}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-2">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Invoices:</span>
                          <div className="font-medium">{job.totalInvoices}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Success:</span>
                          <div className="font-medium text-green-600">
                            {job.successfulInvoices}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Failed:</span>
                          <div className="font-medium text-red-600">
                            {job.failedInvoices}
                          </div>
                        </div>
                      </div>
                      {job.totalAmount > 0 && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-600">Amount: </span>
                          <span className="font-medium">
                            ${job.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-primary-600 hover:text-primary-900 p-1"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {job.status === "FAILED" && (
                        <button
                          onClick={() => retryJob(job.id)}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title="Retry Job"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      {(job.status === "PENDING" ||
                        job.status === "IN_PROGRESS") && (
                        <button
                          onClick={() => cancelJob(job.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Cancel Job"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Job ID</span>
                      <span className="sm:hidden">ID</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Type</span>
                      <span className="sm:hidden">Type</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Period</span>
                      <span className="sm:hidden">Period</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Results</span>
                      <span className="sm:hidden">Results</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Created</span>
                      <span className="sm:hidden">Date</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Actions</span>
                      <span className="sm:hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          <span className="hidden sm:inline">{job.jobId}</span>
                          <span className="sm:hidden">
                            {job.jobId.substring(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            statusColors[job.status] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {getStatusLabel(job.status)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {job.type === "MONTHLY"
                            ? "Monthly"
                            : job.type === "MANUAL"
                            ? "Manual"
                            : "Dry Run"}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {format(new Date(job.startDate), "MMM dd")} -{" "}
                          {format(new Date(job.endDate), "MMM dd, yyyy")}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {job.successfulInvoices} created
                          {job.failedInvoices > 0 && (
                            <span className="text-red-600 ml-2">
                              • {job.failedInvoices} failed
                            </span>
                          )}
                        </div>
                        {job.totalAmount > 0 && (
                          <div className="text-xs text-gray-500">
                            ${job.totalAmount.toLocaleString()}
                          </div>
                        )}
                        {job.totalInvoices > 0 && (
                          <div className="text-xs text-gray-400">
                            Total: {job.totalInvoices} invoices
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {format(new Date(job.createdAt), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {format(new Date(job.createdAt), "HH:mm")}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="text-primary-600 hover:text-primary-900 p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {job.status === "FAILED" && (
                            <button
                              onClick={() => retryJob(job.id)}
                              className="text-yellow-600 hover:text-yellow-900 p-1"
                              title="Retry Job"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          {(job.status === "PENDING" ||
                            job.status === "IN_PROGRESS") && (
                            <button
                              onClick={() => cancelJob(job.id)}
                              className="text-red-600 hover:text-red-900 p-1"
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
          </>
        )}
      </div>

      {/* Run Job Modal */}
      {showRunJobModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
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
                    selectedQueues: selectedQueues,
                  });
                }}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

                  {/* Queue Selection */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Queues to Bill
                      </label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedQueues(
                              availableQueues.map((q) => q.name)
                            )
                          }
                          className="text-xs text-primary-600 hover:text-primary-800 underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedQueues([])}
                          className="text-xs text-gray-600 hover:text-gray-800 underline"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    {isLoadingQueues ? (
                      <div className="text-sm text-gray-500">
                        Loading queues...
                      </div>
                    ) : availableQueues.length === 0 ? (
                      <div className="text-sm text-red-500">
                        No queues available
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                        {availableQueues.map((queue) => (
                          <div
                            key={queue.name}
                            className="flex items-start space-x-3"
                          >
                            <input
                              type="checkbox"
                              id={`queue-${queue.name}`}
                              checked={selectedQueues.includes(queue.name)}
                              onChange={() => toggleQueueSelection(queue.name)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`queue-${queue.name}`}
                                className="text-sm font-medium text-gray-900 cursor-pointer block"
                              >
                                {queue.name}
                              </label>
                              <div className="text-xs text-gray-500 mt-1">
                                {queue.customers.map((customer, idx) => (
                                  <div
                                    key={customer.customerId}
                                    className="mb-1"
                                  >
                                    <span className="font-medium truncate block">
                                      {customer.qboDisplayName ||
                                        customer.qboCompanyName}
                                    </span>
                                    {customer.ratePerMinute > 0 && (
                                      <span className="text-gray-400 block sm:inline sm:ml-2">
                                        (${customer.ratePerMinute}/min,{" "}
                                        {customer.minimumMinutes} min min)
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {selectedQueues.length} of {availableQueues.length} queues
                      selected
                    </div>

                    {/* Billing Summary */}
                    {selectedQueues.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Billing Summary
                        </h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          {selectedQueues.map((queueName) => {
                            const queue = availableQueues.find(
                              (q) => q.name === queueName
                            );
                            if (!queue) return null;

                            return (
                              <div
                                key={queueName}
                                className="flex flex-col sm:flex-row sm:justify-between gap-1"
                              >
                                <span className="font-medium">
                                  {queueName}:
                                </span>
                                <span className="text-gray-500">
                                  {queue.customers.length} customer
                                  {queue.customers.length !== 1 ? "s" : ""}
                                  {queue.customers.some(
                                    (c) => c.ratePerMinute > 0
                                  ) && (
                                    <span className="ml-2">
                                      ($
                                      {Math.min(
                                        ...queue.customers
                                          .map((c) => c.ratePerMinute)
                                          .filter((r) => r > 0)
                                      )}
                                      /min min)
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex flex-col sm:flex-row sm:justify-between text-sm font-medium">
                            <span>Total:</span>
                            <span>
                              {selectedQueues.length} queue
                              {selectedQueues.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeRunJobModal}
                    disabled={isRunningJob}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRunningJob || selectedQueues.length === 0}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white w-full max-w-sm sm:max-w-md md:max-w-lg max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Job Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Job ID:</span>{" "}
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded break-all">
                    {selectedJob.jobId}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                      statusColors[
                        selectedJob.status as keyof typeof statusColors
                      ] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <span className="mr-1.5 flex-shrink-0">
                      {statusIcons[
                        selectedJob.status as keyof typeof statusIcons
                      ] || <Clock className="h-3 w-3" />}
                    </span>
                    {getStatusDisplay(selectedJob.status)}
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
                  <div className="text-xs text-gray-600 mt-1">
                    {format(new Date(selectedJob.startDate), "MMM dd, yyyy")} -{" "}
                    {format(new Date(selectedJob.endDate), "MMM dd, yyyy")}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  <div className="text-xs text-gray-600 mt-1">
                    {format(
                      new Date(selectedJob.createdAt),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </div>
                </div>
                {selectedJob.completedAt && (
                  <div>
                    <span className="font-medium">Completed:</span>{" "}
                    <div className="text-xs text-gray-600 mt-1">
                      {format(
                        new Date(selectedJob.completedAt),
                        "MMM dd, yyyy HH:mm"
                      )}
                    </div>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="font-medium text-gray-700 mb-2">
                    Results Summary:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                {selectedJob.error && (
                  <div className="border-t pt-3">
                    <span className="font-medium text-red-600">
                      Error Details:
                    </span>
                    <div className="text-red-600 text-xs mt-1 bg-red-50 p-2 rounded break-words">
                      {selectedJob.error}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
