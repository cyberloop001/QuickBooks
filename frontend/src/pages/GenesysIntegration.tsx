import React, { useState, useEffect } from "react";
import {
  CalendarIcon,
  PhoneIcon,
  UsersIcon,
  BarChart3Icon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import Pagination from "../components/Pagination";

interface GenesysStatus {
  isConnected: boolean;
  hasValidToken: boolean;
  tokenExpiresAt?: string;
}

interface GenesysUser {
  id: string;
  name: string;
  email: string;
  division: {
    id: string;
    name: string;
  };
  department?: string;
  title?: string;
}

interface GenesysQueue {
  id: string;
  name: string;
  description?: string;
  division: {
    id: string;
    name: string;
  };
}

interface CallRecord {
  conversationId: string;
  startTime: string;
  endTime: string;
  duration: number;
  userId?: string;
  queueId?: string;
  direction: string;
  mediaType: string;
  wrapUpCode?: string;
  recordingId?: string;
}

interface CallAnalytics {
  totalCalls: number;
  totalMinutes: number;
  averageCallDuration: number;
  callsByDate: Record<string, number>;
  callsByUser: Record<string, number>;
  callsByQueue: Record<string, number>;
}

export function GenesysIntegration() {
  const [status, setStatus] = useState<GenesysStatus | null>(null);
  const [users, setUsers] = useState<GenesysUser[]>([]);
  const [queues, setQueues] = useState<GenesysQueue[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [startDate, setStartDate] = useState(
    format(new Date().setDate(1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(20);
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [queuesPage, setQueuesPage] = useState(1);
  const [queuesLimit, setQueuesLimit] = useState(20);
  const [queuesPagination, setQueuesPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Call records pagination state
  const [callRecordsPage, setCallRecordsPage] = useState(1);
  const [callRecordsLimit, setCallRecordsLimit] = useState(25);
  const [callRecordsPagination, setCallRecordsPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });

  // Loading states for individual tabs
  const [usersLoading, setUsersLoading] = useState(false);
  const [queuesLoading, setQueuesLoading] = useState(false);
  const [callRecordsLoading, setCallRecordsLoading] = useState(false);

  // Filter and sort state for call records
  const [callRecordsFilters, setCallRecordsFilters] = useState({
    direction: "",
    durationRange: "",
  });
  const [callRecordsSort, setCallRecordsSort] = useState("startTime");
  const [filteredCallRecords, setFilteredCallRecords] = useState<CallRecord[]>(
    []
  );

  useEffect(() => {
    fetchStatus();
    fetchUsers(usersPage, usersLimit);
    fetchQueues(queuesPage, queuesLimit);
  }, [usersPage, usersLimit, queuesPage, queuesLimit]);

  // Separate useEffect for call records to avoid unnecessary calls
  useEffect(() => {
    if (activeTab === "calls") {
      fetchCallRecords(callRecordsPage, callRecordsLimit);
    }
  }, [callRecordsPage, callRecordsLimit, startDate, endDate]);

  // Apply filters and sorting to call records
  useEffect(() => {
    let filtered = [...callRecords];

    // Apply direction filter
    if (callRecordsFilters.direction) {
      filtered = filtered.filter(
        (call) => call.direction === callRecordsFilters.direction
      );
    }

    // Apply duration range filter
    if (callRecordsFilters.durationRange) {
      filtered = filtered.filter((call) => {
        const duration = call.duration;
        switch (callRecordsFilters.durationRange) {
          case "0-30":
            return duration >= 0 && duration <= 30;
          case "30-60":
            return duration > 30 && duration <= 60;
          case "1-5":
            return duration > 60 && duration <= 300;
          case "5+":
            return duration > 300;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (callRecordsSort) {
        case "startTime":
          return (
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
        case "duration":
          return b.duration - a.duration;
        case "direction":
          return a.direction.localeCompare(b.direction);
        default:
          return 0;
      }
    });

    setFilteredCallRecords(filtered);
  }, [callRecords, callRecordsFilters, callRecordsSort]);

  // Pagination handlers
  const handleUsersPageChange = (page: number) => {
    setUsersPage(page);
  };

  const handleUsersLimitChange = (limit: number) => {
    setUsersLimit(limit);
    setUsersPage(1); // Reset to first page when changing limit
  };

  const handleQueuesPageChange = (page: number) => {
    setQueuesPage(page);
  };

  const handleQueuesLimitChange = (limit: number) => {
    setQueuesLimit(limit);
    setQueuesPage(1); // Reset to first page when changing limit
  };

  // Call records pagination handlers
  const handleCallRecordsPageChange = (page: number) => {
    setCallRecordsPage(page);
  };

  const handleCallRecordsLimitChange = (limit: number) => {
    setCallRecordsLimit(limit);
    setCallRecordsPage(1); // Reset to first page when changing limit
  };

  // Reset pagination and filters when date range changes
  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);

    // Reset pagination and filters for call records
    setCallRecordsPage(1);
    setCallRecordsFilters({ direction: "", durationRange: "" });
    setCallRecordsSort("startTime");

    // Clear call records when date changes
    setCallRecords([]);
    setCallRecordsPagination((prev) => ({ ...prev, total: 0, pages: 0 }));
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/v1/genesys/status");
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/genesys/test-connection", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.data.message);
        fetchStatus(); // Refresh status
      } else {
        toast.error(data.error || "Connection test failed");
      }
    } catch (error) {
      toast.error("Failed to test connection");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page = usersPage, limit = usersLimit) => {
    setUsersLoading(true);
    try {
      const response = await fetch(
        `/api/v1/genesys/users?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
        if (data.pagination) {
          setUsersPagination(data.pagination);
        }
      } else {
        toast.error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchQueues = async (page = queuesPage, limit = queuesLimit) => {
    setQueuesLoading(true);
    try {
      const response = await fetch(
        `/api/v1/genesys/queues?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setQueues(data.data);
        if (data.pagination) {
          setQueuesPagination(data.pagination);
        }
      } else {
        toast.error(data.error || "Failed to fetch queues");
      }
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch queues"
      );
    } finally {
      setQueuesLoading(false);
    }
  };

  const fetchCallRecords = async (
    page = callRecordsPage,
    limit = callRecordsLimit
  ) => {
    setCallRecordsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/genesys/call-records?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCallRecords(data.data.callRecords);
        if (data.data.pagination) {
          setCallRecordsPagination(data.data.pagination);
        }
        toast.success(`Retrieved ${data.data.callRecords.length} call records`);
      } else {
        toast.error(data.error || "Failed to fetch call records");
      }
    } catch (error) {
      console.error("Failed to fetch call records:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch call records"
      );
    } finally {
      setCallRecordsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/genesys/analytics?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
        toast.success("Analytics retrieved successfully");
      } else {
        toast.error(data.error || "Failed to fetch analytics");
      }
    } catch (error) {
      toast.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getStatusText = (isConnected: boolean) => {
    return isConnected ? "Connected" : "Disconnected";
  };

  // CSV Export function
  const exportCallRecordsToCSV = () => {
    if (filteredCallRecords.length === 0) {
      toast.error("No call records to export");
      return;
    }

    const headers = [
      "Conversation ID",
      "Start Time",
      "End Time",
      "Duration (seconds)",
      "Duration (minutes)",
      "Direction",
      "Media Type",
      "User ID",
      "Queue ID",
      "Wrap-up Code",
      "Recording ID",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredCallRecords.map((call) =>
        [
          call.conversationId,
          call.startTime,
          call.endTime,
          call.duration,
          (call.duration / 60).toFixed(2),
          call.direction,
          call.mediaType,
          call.userId || "",
          call.queueId || "",
          call.wrapUpCode || "",
          call.recordingId || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `call-records-${startDate}-to-${endDate}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredCallRecords.length} call records to CSV`);
  };

  // Show detailed analytics for filtered call records
  const showCallRecordsAnalytics = () => {
    if (filteredCallRecords.length === 0) {
      toast.error("No call records to analyze");
      return;
    }

    // Calculate analytics for filtered data
    const totalCalls = filteredCallRecords.length;
    const totalDuration = filteredCallRecords.reduce(
      (sum, call) => sum + call.duration,
      0
    );
    const totalMinutes = Math.round((totalDuration / 60) * 100) / 100;
    const averageDuration =
      totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    const callsByDirection = filteredCallRecords.reduce((acc, call) => {
      acc[call.direction] = (acc[call.direction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const callsByDuration = filteredCallRecords.reduce((acc, call) => {
      const minutes = Math.ceil(call.duration / 60);
      if (minutes <= 1) acc["0-1 min"] = (acc["0-1 min"] || 0) + 1;
      else if (minutes <= 5) acc["1-5 min"] = (acc["1-5 min"] || 0) + 1;
      else if (minutes <= 15) acc["5-15 min"] = (acc["5-15 min"] || 0) + 1;
      else acc["15+ min"] = (acc["15+ min"] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Show analytics in a toast or modal (for now, just show in console and toast)
    console.log("Call Records Analytics:", {
      totalCalls,
      totalMinutes,
      averageDuration,
      callsByDirection,
      callsByDuration,
    });

    toast.success(
      `Analytics: ${totalCalls} calls, ${totalMinutes} minutes, avg ${averageDuration}s`
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Genesys Cloud Integration</h1>
          <p className="text-gray-600">
            Manage your Genesys Cloud phone system integration
          </p>
        </div>
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Connection"}
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Connection Status</h3>
            <PhoneIcon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            {status ? (
              <div className="space-y-2">
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    status.isConnected
                  )}`}
                >
                  {getStatusText(status.isConnected)}
                </span>
                {status.tokenExpiresAt && (
                  <p className="text-xs text-gray-500">
                    Token expires:{" "}
                    {format(
                      new Date(status.tokenExpiresAt),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading...</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Users</h3>
            <UsersIcon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">{usersPagination.total}</div>
            <p className="text-xs text-gray-500">Active agents</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Queues</h3>
            <BarChart3Icon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">{queuesPagination.total}</div>
            <p className="text-xs text-gray-500">Routing queues</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Call Records</h3>
            <PhoneIcon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold">
              {callRecordsPagination.total}
            </div>
            <p className="text-xs text-gray-500">Call records</p>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium mb-4">Date Range</h3>
        <div className="flex items-center space-x-4">
          <div className="space-y-2">
            <label htmlFor="startDate" className="block text-sm font-medium">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleDateRangeChange(e.target.value, endDate)
              }
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="endDate" className="block text-sm font-medium">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleDateRangeChange(startDate, e.target.value)
              }
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex space-x-2 pt-6">
            <button
              onClick={() =>
                fetchCallRecords(callRecordsPage, callRecordsLimit)
              }
              disabled={callRecordsLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              Get Call Records
            </button>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <BarChart3Icon className="h-4 w-4 mr-2" />
                  Get Analytics
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {["users", "queues", "calls", "analytics"].map((tab) => (
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

        {activeTab === "users" && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Users (Agents)</h3>
              <button
                onClick={() => fetchUsers(usersPage, usersLimit)}
                disabled={usersLoading}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {usersLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="space-y-4">
              {usersLoading ? (
                <p className="text-center text-gray-500 py-8">
                  Loading users...
                </p>
              ) : users.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No users found.
                </p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        {user.department && `${user.department} • `}
                        {user.division.name}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      {user.id}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={usersPagination.page}
                totalPages={usersPagination.pages}
                totalItems={usersPagination.total}
                itemsPerPage={usersPagination.limit}
                onPageChange={handleUsersPageChange}
                onItemsPerPageChange={handleUsersLimitChange}
                showItemsPerPage={true}
              />
            </div>
          </div>
        )}

        {activeTab === "queues" && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Queues</h3>
              <button
                onClick={() => fetchQueues(queuesPage, queuesLimit)}
                disabled={queuesLoading}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {queuesLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="space-y-4">
              {queuesLoading ? (
                <p className="text-center text-gray-500 py-8">
                  Loading queues...
                </p>
              ) : queues.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No queues found.
                </p>
              ) : (
                queues.map((queue) => (
                  <div
                    key={queue.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{queue.name}</h3>
                      {queue.description && (
                        <p className="text-sm text-gray-600">
                          {queue.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {queue.division.name}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      {queue.id}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={queuesPagination.page}
                totalPages={queuesPagination.pages}
                totalItems={queuesPagination.total}
                itemsPerPage={queuesPagination.limit}
                onPageChange={handleQueuesPageChange}
                onItemsPerPageChange={handleQueuesLimitChange}
                showItemsPerPage={true}
              />
            </div>
          </div>
        )}

        {activeTab === "calls" && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Call Records</h3>
              <button
                onClick={() =>
                  fetchCallRecords(callRecordsPage, callRecordsLimit)
                }
                disabled={callRecordsLoading}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {callRecordsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {/* Call Records Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredCallRecords.length}
                </div>
                <div className="text-sm text-gray-600">Filtered Calls</div>
                <div className="text-xs text-gray-500">
                  of {callRecordsPagination.total} total
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredCallRecords.reduce(
                    (sum, call) => sum + call.duration,
                    0
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Seconds</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    filteredCallRecords.reduce(
                      (sum, call) => sum + call.duration,
                      0
                    ) / 60
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {
                    new Set(
                      filteredCallRecords
                        .map((call) => call.userId)
                        .filter(Boolean)
                    ).size
                  }
                </div>
                <div className="text-sm text-gray-600">Unique Users</div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {filteredCallRecords.length} of {callRecordsPagination.total}{" "}
              calls shown
              {callRecordsFilters.direction || callRecordsFilters.durationRange
                ? ` (filtered by ${
                    callRecordsFilters.direction ? "direction" : ""
                  }${
                    callRecordsFilters.direction &&
                    callRecordsFilters.durationRange
                      ? " and "
                      : ""
                  }${callRecordsFilters.durationRange ? "duration" : ""})`
                : ""}
            </p>

            {/* Call Records Filters and Sorting */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">
                  Filters & Sorting
                </h4>
                {(callRecordsFilters.direction ||
                  callRecordsFilters.durationRange) && (
                  <button
                    onClick={() => {
                      setCallRecordsFilters({
                        direction: "",
                        durationRange: "",
                      });
                      setCallRecordsSort("startTime");
                    }}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direction
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={callRecordsFilters.direction}
                    onChange={(e) => {
                      setCallRecordsFilters((prev) => ({
                        ...prev,
                        direction: e.target.value,
                      }));
                    }}
                  >
                    <option value="">All Directions</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration Range
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={callRecordsFilters.durationRange}
                    onChange={(e) => {
                      setCallRecordsFilters((prev) => ({
                        ...prev,
                        durationRange: e.target.value,
                      }));
                    }}
                  >
                    <option value="">All Durations</option>
                    <option value="0-30">0-30 seconds</option>
                    <option value="30-60">30-60 seconds</option>
                    <option value="1-5">1-5 minutes</option>
                    <option value="5+">5+ minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={callRecordsSort}
                    onChange={(e) => {
                      setCallRecordsSort(e.target.value);
                    }}
                  >
                    <option value="startTime">Start Time</option>
                    <option value="duration">Duration</option>
                    <option value="direction">Direction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Actions
                  </label>
                  <div className="flex space-x-2">
                    <button
                      className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      onClick={exportCallRecordsToCSV}
                    >
                      Export CSV
                    </button>
                    <button
                      className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      onClick={showCallRecordsAnalytics}
                    >
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {callRecordsLoading ? (
                <div className="text-center py-12">
                  <Loader2Icon className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Loading call records...</p>
                  <p className="text-sm text-gray-400 mt-2">
                    This may take a few moments for large datasets
                  </p>
                </div>
              ) : filteredCallRecords.length === 0 ? (
                <div className="text-center py-12">
                  <PhoneIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No call records found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Try adjusting your date range or filters
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => fetchCallRecords(1, callRecordsLimit)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Refresh Data
                    </button>
                  </div>
                </div>
              ) : (
                filteredCallRecords.map((call) => (
                  <div
                    key={call.conversationId}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Call Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {call.conversationId.substring(0, 8)}...
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              call.direction === "inbound"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {call.direction}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {call.mediaType}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(
                            new Date(call.startTime),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Call Details */}
                    <div className="p-4 space-y-3">
                      {/* Time and Duration */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Start Time
                          </label>
                          <p className="text-sm text-gray-900">
                            {format(
                              new Date(call.startTime),
                              "MMM dd, yyyy HH:mm:ss"
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            End Time
                          </label>
                          <p className="text-sm text-gray-900">
                            {format(
                              new Date(call.endTime),
                              "MMM dd, yyyy HH:mm:ss"
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Duration
                          </label>
                          <p className="text-sm text-gray-900">
                            {Math.round(call.duration / 60)}m{" "}
                            {call.duration % 60}s
                            <span className="text-gray-500 ml-1">
                              ({call.duration}s)
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* User and Queue Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {call.userId && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              User ID
                            </label>
                            <p className="text-sm text-gray-900 font-mono">
                              {call.userId}
                            </p>
                          </div>
                        )}
                        {call.queueId && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Queue ID
                            </label>
                            <p className="text-sm text-gray-900 font-mono">
                              {call.queueId}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Additional Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {call.wrapUpCode && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Wrap-up Code
                            </label>
                            <p className="text-sm text-gray-900">
                              {call.wrapUpCode}
                            </p>
                          </div>
                        )}
                        {call.recordingId && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Recording ID
                            </label>
                            <p className="text-sm text-gray-900 font-mono">
                              {call.recordingId.substring(0, 8)}...
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Call ID */}
                      <div className="pt-2 border-t">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Full Conversation ID
                        </label>
                        <p className="text-sm text-gray-900 font-mono break-all">
                          {call.conversationId}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={callRecordsPagination.page}
                totalPages={callRecordsPagination.pages}
                totalItems={callRecordsPagination.total}
                itemsPerPage={callRecordsPagination.limit}
                onPageChange={handleCallRecordsPageChange}
                onItemsPerPageChange={handleCallRecordsLimitChange}
                showItemsPerPage={true}
              />
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Call Analytics</h3>
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <BarChart3Icon className="h-4 w-4 mr-2" />
                    Refresh Analytics
                  </>
                )}
              </button>
            </div>

            {analytics ? (
              <div className="space-y-8">
                {/* Summary Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">
                          Total Calls
                        </p>
                        <p className="text-3xl font-bold text-blue-900">
                          {analytics.totalCalls.toLocaleString()}
                        </p>
                      </div>
                      <PhoneIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-blue-700">All time calls</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">
                          Total Minutes
                        </p>
                        <p className="text-3xl font-bold text-green-900">
                          {analytics.totalMinutes.toLocaleString()}
                        </p>
                      </div>
                      <CalendarIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-green-700">
                        Total call duration
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">
                          Avg Duration
                        </p>
                        <p className="text-3xl font-bold text-purple-900">
                          {analytics.averageCallDuration}
                        </p>
                      </div>
                      <BarChart3Icon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-purple-700">
                        Minutes per call
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">
                          Active Users
                        </p>
                        <p className="text-3xl font-bold text-orange-900">
                          {Object.keys(analytics.callsByUser).length}
                        </p>
                      </div>
                      <UsersIcon className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-orange-700">
                        Users with calls
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calls by Date */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-medium mb-4 flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
                      Calls by Date
                    </h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {Object.entries(analytics.callsByDate)
                        .sort(
                          ([a], [b]) =>
                            new Date(b).getTime() - new Date(a).getTime()
                        )
                        .slice(0, 20)
                        .map(([date, count]) => (
                          <div
                            key={date}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-medium">
                                {format(new Date(date), "MMM dd, yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      (count /
                                        Math.max(
                                          ...Object.values(
                                            analytics.callsByDate
                                          )
                                        )) *
                                      100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                                {count} calls
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    {Object.keys(analytics.callsByDate).length > 20 && (
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Showing top 20 dates. Use date range filters to see
                        more.
                      </p>
                    )}
                  </div>

                  {/* Calls by User */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-medium mb-4 flex items-center">
                      <UsersIcon className="h-5 w-5 mr-2 text-gray-600" />
                      Calls by User
                    </h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {Object.entries(analytics.callsByUser)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 15)
                        .map(([userId, count]) => (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="font-mono text-sm">
                                {userId.substring(0, 8)}...
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      (count /
                                        Math.max(
                                          ...Object.values(
                                            analytics.callsByUser
                                          )
                                        )) *
                                      100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                                {count} calls
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    {Object.keys(analytics.callsByUser).length > 15 && (
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Showing top 15 users. Use user filters to see more.
                      </p>
                    )}
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Queue Performance */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-medium mb-4 flex items-center">
                      <BarChart3Icon className="h-5 w-5 mr-2 text-gray-600" />
                      Queue Performance
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(analytics.callsByQueue)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8)
                        .map(([queueId, count]) => (
                          <div
                            key={queueId}
                            className="flex items-center justify-between p-2 bg-white rounded border"
                          >
                            <span className="font-mono text-sm text-gray-600">
                              {queueId.substring(0, 8)}...
                            </span>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Call Duration Distribution */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-medium mb-4">
                      Duration Distribution
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">0-1 min</span>
                        <span className="text-sm font-medium">
                          {
                            filteredCallRecords.filter(
                              (call) => call.duration <= 60
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">1-5 min</span>
                        <span className="text-sm font-medium">
                          {
                            filteredCallRecords.filter(
                              (call) =>
                                call.duration > 60 && call.duration <= 300
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">5-15 min</span>
                        <span className="text-sm font-medium">
                          {
                            filteredCallRecords.filter(
                              (call) =>
                                call.duration > 300 && call.duration <= 900
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">15+ min</span>
                        <span className="text-sm font-medium">
                          {
                            filteredCallRecords.filter(
                              (call) => call.duration > 900
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-medium mb-4">
                      Performance Metrics
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Peak Call Hour</p>
                        <p className="text-lg font-semibold">
                          {(() => {
                            const hourCounts = new Array(24).fill(0);
                            filteredCallRecords.forEach((call) => {
                              const hour = new Date(call.startTime).getHours();
                              hourCounts[hour]++;
                            });
                            const peakHour = hourCounts.indexOf(
                              Math.max(...hourCounts)
                            );
                            return `${peakHour}:00 - ${peakHour + 1}:00`;
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Busiest Day</p>
                        <p className="text-lg font-semibold">
                          {(() => {
                            const dayCounts = new Array(7).fill(0);
                            filteredCallRecords.forEach((call) => {
                              const day = new Date(call.startTime).getDay();
                              dayCounts[day]++;
                            });
                            const days = [
                              "Sun",
                              "Mon",
                              "Tue",
                              "Wed",
                              "Thu",
                              "Fri",
                              "Sat",
                            ];
                            const busiestDay = dayCounts.indexOf(
                              Math.max(...dayCounts)
                            );
                            return days[busiestDay];
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-medium mb-4 text-blue-900">
                    Export & Reports
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={exportCallRecordsToCSV}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                      <BarChart3Icon className="h-4 w-4 mr-2" />
                      Export Analytics to CSV
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Generate PDF report
                        toast.success("PDF report generation coming soon!");
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Generate PDF Report
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Schedule reports
                        toast.success("Report scheduling coming soon!");
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                    >
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      Schedule Reports
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3Icon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Analytics Data
                </h3>
                <p className="text-gray-500 mb-6">
                  Select a date range and click "Get Analytics" to view
                  comprehensive call analytics
                </p>
                <button
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader2Icon className="h-5 w-5 mr-2 animate-spin" />
                      Loading Analytics...
                    </>
                  ) : (
                    <>
                      <BarChart3Icon className="h-5 w-5 mr-2" />
                      Get Analytics
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
