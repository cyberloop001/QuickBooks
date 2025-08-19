import React, { useState, useEffect } from "react";
import {
  CalendarIcon,
  PhoneIcon,
  UsersIcon,
  BarChart3Icon,
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

  // Loading states for individual tabs
  const [usersLoading, setUsersLoading] = useState(false);
  const [queuesLoading, setQueuesLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchUsers(usersPage, usersLimit);
    fetchQueues(queuesPage, queuesLimit);
  }, [usersPage, usersLimit, queuesPage, queuesLimit]);

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
      toast.error("Failed to fetch users");
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
      toast.error("Failed to fetch queues");
    } finally {
      setQueuesLoading(false);
    }
  };

  const fetchCallRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/genesys/call-records?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      if (data.success) {
        setCallRecords(data.data.callRecords);
        toast.success(`Retrieved ${data.data.callRecords.length} call records`);
      } else {
        toast.error(data.error || "Failed to fetch call records");
      }
    } catch (error) {
      toast.error("Failed to fetch call records");
    } finally {
      setLoading(false);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                setStartDate(e.target.value)
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
                setEndDate(e.target.value)
              }
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex space-x-2 pt-6">
            <button
              onClick={fetchCallRecords}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Get Call Records
            </button>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center"
            >
              <BarChart3Icon className="h-4 w-4 mr-2" />
              Get Analytics
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
            <h3 className="text-lg font-medium mb-4">Call Records</h3>
            <p className="text-sm text-gray-600 mb-4">
              {callRecords.length} calls found for the selected date range
            </p>
            <div className="space-y-4">
              {callRecords.map((call) => (
                <div
                  key={call.conversationId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">
                      Call {call.conversationId.substring(0, 8)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {format(new Date(call.startTime), "MMM dd, yyyy HH:mm")} -
                      {format(new Date(call.endTime), "HH:mm")}
                    </p>
                    <p className="text-xs text-gray-500">
                      Duration: {Math.round(call.duration / 60)} minutes •{" "}
                      {call.direction}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 text-xs font-medium border border-gray-300 text-gray-700 rounded">
                      {call.mediaType}
                    </span>
                    {call.userId && (
                      <p className="text-xs text-gray-500 mt-1">
                        User: {call.userId.substring(0, 8)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium mb-4">Call Analytics</h3>
            {analytics ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {analytics.totalCalls}
                    </div>
                    <p className="text-sm text-gray-600">Total Calls</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {analytics.totalMinutes}
                    </div>
                    <p className="text-sm text-gray-600">Total Minutes</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {analytics.averageCallDuration}
                    </div>
                    <p className="text-sm text-gray-600">Avg Duration (min)</p>
                  </div>
                </div>

                {/* Calls by Date */}
                <div>
                  <h3 className="font-medium mb-3">Calls by Date</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.callsByDate)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, count]) => (
                        <div
                          key={date}
                          className="flex justify-between items-center p-2 border rounded"
                        >
                          <span>{format(new Date(date), "MMM dd, yyyy")}</span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {count} calls
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Select a date range and click "Get Analytics" to view call
                analytics
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
