import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Building2,
  Phone,
  CreditCard,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface CustomerProfile {
  id: string;
  qboCustomerId?: string;
  genesysQueueNames: string[];
  isActive: boolean;
  ratePerMinute: number;
  taxCode?: string;
  notes?: string;
  billDate: number;
  billTime: string;
  billingPeriodStart: number;
  billingPeriodEnd: number;
  minimumMinutes: number;
  overageRatePerMinute: number;
  qboDisplayName: string;
  qboCompanyName?: string;
  qboGivenName?: string;
  qboFamilyName?: string;
  qboMiddleName?: string;
  qboTitle?: string;
  qboSuffix?: string;
  qboPrimaryEmailAddr?: string;
  qboPrimaryPhone?: string;
  qboLine1?: string;
  qboCity?: string;
  qboCountrySubDivisionCode?: string;
  qboPostalCode?: string;
  qboCountry?: string;
  qboMetadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface CustomerProfileFilters {
  search: string;
  isActive?: boolean;
  hasQboCustomerId?: boolean;
  hasGenesysQueues?: boolean;
  queueName?: string;
}

export function CustomerProfiles() {
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<CustomerProfileFilters>({
    search: "",
    isActive: undefined,
    hasQboCustomerId: undefined,
    hasGenesysQueues: undefined,
    queueName: undefined,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CustomerProfile | null>(
    null
  );
  const [showStats, setShowStats] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerProfiles();
  }, [pagination.page, pagination.limit, filters]);

  const fetchCustomerProfiles = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.search) params.append("search", filters.search);
      if (filters.isActive !== undefined)
        params.append("isActive", filters.isActive.toString());
      if (filters.hasQboCustomerId !== undefined)
        params.append("hasQboCustomerId", filters.hasQboCustomerId.toString());
      if (filters.hasGenesysQueues !== undefined)
        params.append("hasGenesysQueues", filters.hasGenesysQueues.toString());
      if (
        filters.queueName &&
        filters.queueName !== "complete" &&
        filters.queueName !== "partial" &&
        filters.queueName !== "minimal"
      ) {
        params.append("queueName", filters.queueName);
      }

      const response = await fetch(`/api/v1/customer-profiles?${params}`);
      const data = await response.json();

      if (data.success) {
        let filteredProfiles = data.data;

        // Apply profile completeness filter on the frontend
        if (filters.queueName === "complete") {
          filteredProfiles = filteredProfiles.filter(
            (p: CustomerProfile) => getCompletionScore(p) >= 80
          );
        } else if (filters.queueName === "partial") {
          filteredProfiles = filteredProfiles.filter(
            (p: CustomerProfile) =>
              getCompletionScore(p) >= 40 && getCompletionScore(p) < 80
          );
        } else if (filters.queueName === "minimal") {
          filteredProfiles = filteredProfiles.filter(
            (p: CustomerProfile) => getCompletionScore(p) < 40
          );
        }

        setCustomerProfiles(filteredProfiles);
        setPagination((prev) => ({
          ...prev,
          total: filteredProfiles.length,
          pages: Math.ceil(filteredProfiles.length / pagination.limit),
        }));
      } else {
        toast.error("Failed to fetch customer profiles");
      }
    } catch (error) {
      console.error("Error fetching customer profiles:", error);
      toast.error("Failed to fetch customer profiles");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (
    key: keyof CustomerProfileFilters,
    value: any
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      isActive: undefined,
      hasQboCustomerId: undefined,
      hasGenesysQueues: undefined,
      queueName: undefined,
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCustomerProfiles();
    setIsRefreshing(false);
  };

  const addCustomerProfile = async (
    profile: Omit<CustomerProfile, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const response = await fetch("/api/v1/customer-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setShowModal(false);
        toast.success("Customer profile created successfully");
        fetchCustomerProfiles();
      } else {
        const error = await response.json();
        console.log("error", error);
        toast.error(error.errors[0].msg || "Failed to create customer profile");
      }
    } catch (error) {
      console.error("Error creating customer profile:", error);
      toast.error("Failed to create customer profile");
    }
  };

  const updateCustomerProfile = async (
    id: string,
    profile: Partial<CustomerProfile>
  ) => {
    try {
      const response = await fetch(`/api/v1/customer-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingProfile(null);
        toast.success("Customer profile updated successfully");
        fetchCustomerProfiles();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update customer profile");
      }
    } catch (error) {
      console.error("Error updating customer profile:", error);
      toast.error("Failed to update customer profile");
    }
  };

  const deleteCustomerProfile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer profile?"))
      return;

    try {
      const response = await fetch(`/api/v1/customer-profiles/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Customer profile deleted successfully");
        fetchCustomerProfiles();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete customer profile");
      }
    } catch (error) {
      console.error("Error deleting customer profile:", error);
      toast.error("Failed to delete customer profile");
    }
  };

  const getStatusBadge = (profile: CustomerProfile) => {
    if (!profile.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Inactive
        </span>
      );
    }
    if (!profile.qboCustomerId) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          No QBO Mapping
        </span>
      );
    }
    if (!profile.genesysQueueNames || profile.genesysQueueNames.length === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          No Queues
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  const getCompletionScore = (profile: CustomerProfile) => {
    let score = 0;
    let total = 0;

    // Basic profile information
    if (profile.qboDisplayName) {
      score++;
      total++;
    }
    if (profile.qboCompanyName) {
      score++;
      total++;
    }
    if (profile.qboGivenName) {
      score++;
      total++;
    }
    if (profile.qboFamilyName) {
      score++;
      total++;
    }
    if (profile.qboPrimaryEmailAddr) {
      score++;
      total++;
    }
    if (profile.qboPrimaryPhone) {
      score++;
      total++;
    }
    if (profile.qboLine1) {
      score++;
      total++;
    }
    if (profile.qboCity) {
      score++;
      total++;
    }
    if (profile.qboCountrySubDivisionCode) {
      score++;
      total++;
    }
    if (profile.qboPostalCode) {
      score++;
      total++;
    }
    if (profile.qboCountry) {
      score++;
      total++;
    }

    // Genesys integration
    if (profile.genesysQueueNames && profile.genesysQueueNames.length > 0) {
      score++;
      total++;
    }

    return total > 0 ? Math.round((score / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Profiles
          </h1>
          <p className="text-gray-600">
            Manage customer profiles that bridge Genesys queues and QuickBooks
            customers
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer Profile
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Profiles
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pagination.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Profiles
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {customerProfiles.filter((p) => p.isActive).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Phone className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Queues
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {customerProfiles.reduce(
                      (acc, p) => acc + (p.genesysQueueNames?.length || 0),
                      0
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    QBO Mapped
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {customerProfiles.filter((p) => p.qboCustomerId).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Edit className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Complete Profiles
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {
                      customerProfiles.filter(
                        (p) => getCompletionScore(p) >= 80
                      ).length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, QBO ID, or email..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={
                filters.isActive === undefined
                  ? ""
                  : filters.isActive.toString()
              }
              onChange={(e) =>
                handleFilterChange(
                  "isActive",
                  e.target.value === "" ? undefined : e.target.value === "true"
                )
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QBO Mapping
            </label>
            <select
              value={
                filters.hasQboCustomerId === undefined
                  ? ""
                  : filters.hasQboCustomerId.toString()
              }
              onChange={(e) =>
                handleFilterChange(
                  "hasQboCustomerId",
                  e.target.value === "" ? undefined : e.target.value === "true"
                )
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All</option>
              <option value="true">Has QBO ID</option>
              <option value="false">No QBO ID</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Queue Status
            </label>
            <select
              value={
                filters.hasGenesysQueues === undefined
                  ? ""
                  : filters.hasGenesysQueues.toString()
              }
              onChange={(e) =>
                handleFilterChange(
                  "hasGenesysQueues",
                  e.target.value === "" ? undefined : e.target.value === "true"
                )
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All</option>
              <option value="true">Has Queues</option>
              <option value="false">No Queues</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Completeness
            </label>
            <select
              value={filters.queueName || ""}
              onChange={(e) =>
                handleFilterChange("queueName", e.target.value || undefined)
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Profiles</option>
              <option value="complete">Complete (80%+)</option>
              <option value="partial">Partial (40-79%)</option>
              <option value="minimal">Minimal (0-39%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Profiles Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Profiles ({pagination.total})
            </h3>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Genesys Queues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QBO Mapping
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate/Min
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading customer profiles...
                  </td>
                </tr>
              ) : customerProfiles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No customer profiles found
                  </td>
                </tr>
              ) : (
                customerProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {profile.qboDisplayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {profile.qboPrimaryEmailAddr || "No email"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {profile.qboPrimaryPhone || "No phone"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {profile.qboLine1
                            ? `${profile.qboLine1}, ${profile.qboCity || ""}, ${
                                profile.qboCountrySubDivisionCode || ""
                              } ${
                                profile.qboPostalCode
                                  ? `, ${profile.qboPostalCode}`
                                  : ""
                              } ${profile.qboCountry || ""}`
                            : "No address"}
                        </div>
                        {profile.qboCompanyName && (
                          <div className="text-xs text-blue-600 mt-1">
                            Company: {profile.qboCompanyName}
                          </div>
                        )}
                        {profile.qboGivenName && profile.qboFamilyName && (
                          <div className="text-xs text-gray-600 mt-1">
                            {profile.qboTitle && `${profile.qboTitle} `}
                            {profile.qboGivenName}{" "}
                            {profile.qboMiddleName &&
                              `${profile.qboMiddleName} `}
                            {profile.qboFamilyName}
                            {profile.qboSuffix && `, ${profile.qboSuffix}`}
                          </div>
                        )}
                        <div className="mt-1">
                          <div className="flex items-center group relative">
                            <div className="text-xs text-gray-400 mr-2">
                              Profile Complete:
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{
                                  width: `${getCompletionScore(profile)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 ml-2">
                              {getCompletionScore(profile)}%
                            </span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                              <div className="font-medium mb-1">
                                Profile Completion Details:
                              </div>
                              <div>
                                • QBO Display Name:{" "}
                                {profile.qboDisplayName ? "✓" : "✗"}
                              </div>
                              <div>
                                • QBO Company:{" "}
                                {profile.qboCompanyName ? "✓" : "✗"}
                              </div>
                              <div>
                                • QBO Personal:{" "}
                                {profile.qboGivenName ? "✓" : "✗"}{" "}
                                {profile.qboFamilyName ? "✓" : "✗"}
                              </div>
                              <div>
                                • QBO Contact:{" "}
                                {profile.qboPrimaryEmailAddr ? "✓" : "✗"}{" "}
                                {profile.qboPrimaryPhone ? "✓" : "✗"}
                              </div>
                              <div>
                                • QBO Address: {profile.qboLine1 ? "✓" : "✗"}{" "}
                                {profile.qboCity ? "✓" : "✗"}
                              </div>
                              <div>
                                • Genesys:{" "}
                                {profile.genesysQueueNames?.length > 0
                                  ? "✓"
                                  : "✗"}
                              </div>
                              <div className="mt-1 text-gray-300">
                                Hover for details
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {profile.genesysQueueNames &&
                        profile.genesysQueueNames.length > 0 ? (
                          profile.genesysQueueNames.map((queue, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              {queue}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">
                            No queues assigned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {profile.qboCustomerId ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {profile.qboCustomerId}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Not mapped
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {profile.qboDisplayName}
                      </div>
                      {profile.qboCompanyName &&
                        profile.qboCompanyName !== profile.qboDisplayName && (
                          <div className="text-xs text-blue-600 mt-1">
                            {profile.qboCompanyName}
                          </div>
                        )}
                      {profile.qboGivenName && profile.qboFamilyName && (
                        <div className="text-xs text-gray-600 mt-1">
                          {profile.qboTitle && `${profile.qboTitle} `}
                          {profile.qboGivenName}{" "}
                          {profile.qboMiddleName && `${profile.qboMiddleName} `}
                          {profile.qboFamilyName}
                          {profile.qboSuffix && `, ${profile.qboSuffix}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium text-gray-900">
                          Bill: Day {profile.billDate} at {profile.billTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          Period: {profile.billingPeriodStart} -{" "}
                          {profile.billingPeriodEnd}
                        </div>
                        <div className="text-xs text-gray-500">
                          Min: {profile.minimumMinutes} min
                        </div>
                        <div className="text-xs text-gray-500">
                          Overage: ${profile.overageRatePerMinute}/min
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${profile.ratePerMinute}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(profile)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingProfile(profile);
                            setShowModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit Profile"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowStats(profile.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Stats"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCustomerProfile(profile.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <CustomerProfileModal
          profile={editingProfile}
          onSave={
            editingProfile
              ? (profile) => updateCustomerProfile(editingProfile.id, profile)
              : addCustomerProfile
          }
          onClose={() => {
            setShowModal(false);
            setEditingProfile(null);
          }}
        />
      )}

      {/* Stats Modal */}
      {showStats && (
        <StatsModal profileId={showStats} onClose={() => setShowStats(null)} />
      )}
    </div>
  );
}

// Customer Profile Modal Component
interface CustomerProfileModalProps {
  profile?: CustomerProfile | null;
  onSave: (
    profile: Omit<CustomerProfile, "id" | "createdAt" | "updatedAt">
  ) => void;
  onClose: () => void;
}

function CustomerProfileModal({
  profile,
  onSave,
  onClose,
}: CustomerProfileModalProps) {
  const [formData, setFormData] = useState({
    qboCustomerId: profile?.qboCustomerId || "",
    genesysQueueNames: profile?.genesysQueueNames || [],
    isActive: profile?.isActive ?? true,
    ratePerMinute: profile?.ratePerMinute || 1.0,
    taxCode: profile?.taxCode || "",
    notes: profile?.notes || "",
    billDate: profile?.billDate || 1,
    billTime: profile?.billTime || "02:00",
    billingPeriodStart: profile?.billingPeriodStart || 1,
    billingPeriodEnd: profile?.billingPeriodEnd || 31,
    minimumMinutes: profile?.minimumMinutes || 0,
    overageRatePerMinute: profile?.overageRatePerMinute || 1.0,
    qboDisplayName: profile?.qboDisplayName || "",
    qboCompanyName: profile?.qboCompanyName || "",
    qboGivenName: profile?.qboGivenName || "",
    qboFamilyName: profile?.qboFamilyName || "",
    qboMiddleName: profile?.qboMiddleName || "",
    qboTitle: profile?.qboTitle || "",
    qboSuffix: profile?.qboSuffix || "",
    qboPrimaryEmailAddr: profile?.qboPrimaryEmailAddr || "",
    qboPrimaryPhone: profile?.qboPrimaryPhone || "",
    qboLine1: profile?.qboLine1 || "",
    qboCity: profile?.qboCity || "",
    qboCountrySubDivisionCode: profile?.qboCountrySubDivisionCode || "",
    qboPostalCode: profile?.qboPostalCode || "",
    qboCountry: profile?.qboCountry || "US",
    qboMetadata: profile?.qboMetadata || {},
  });

  const [newQueue, setNewQueue] = useState("");
  const [qboSearchResult, setQboSearchResult] = useState<any>(null);
  const [isSearchingQBO, setIsSearchingQBO] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.genesysQueueNames.length === 0) {
      toast.error("At least one Genesys queue name is required");
      return;
    }

    if (!formData.qboDisplayName.trim()) {
      toast.error("QBO Display Name is required for QuickBooks integration");
      return;
    }

    onSave(formData);
  };

  const addQueue = () => {
    if (
      newQueue.trim() &&
      !formData.genesysQueueNames.includes(newQueue.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        genesysQueueNames: [...prev.genesysQueueNames, newQueue.trim()],
      }));
      setNewQueue("");
    }
  };

  const removeQueue = (queueToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      genesysQueueNames: prev.genesysQueueNames.filter(
        (q) => q !== queueToRemove
      ),
    }));
  };

  const handleSearchQBOCustomer = async () => {
    if (!formData.qboDisplayName.trim()) {
      toast.error("Please enter a display name to search for");
      return;
    }

    setIsSearchingQBO(true);
    try {
      const response = await fetch(
        `/api/v1/qbo/customers/search/display-name?displayName=${encodeURIComponent(
          formData.qboDisplayName
        )}`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.found) {
          setQboSearchResult(result.data);
          toast.success(`Found QBO customer: ${result.data.DisplayName}`);
        } else {
          setQboSearchResult(null);
          toast.success("No QBO customer found with that display name");
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to search QBO customers");
      }
    } catch (error) {
      toast.error("Failed to search QBO customers");
      console.error("QBO search error:", error);
    } finally {
      setIsSearchingQBO(false);
    }
  };

  const handleConnectQBOCustomer = async (qboCustomerId: string) => {
    try {
      // Update the form data with the found QBO customer ID
      setFormData((prev) => ({
        ...prev,
        qboCustomerId,
      }));

      setQboSearchResult(null);
      toast.success("QBO Customer ID updated in form");
    } catch (error) {
      toast.error("Failed to connect QBO customer");
      console.error("QBO connection error:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {profile ? "Edit Customer Profile" : "Add Customer Profile"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 bg-gray-100 rounded-md p-1 hover:text-gray-600 hover:bg-gray-200 transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-green-400 mb-3">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.qboDisplayName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboDisplayName: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Required for QBO integration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Customer ID
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.qboCustomerId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          qboCustomerId: e.target.value,
                        }))
                      }
                      disabled={true}
                      className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                      placeholder="Optional"
                    />
                  </div>
                  {/* Manual QBO Customer Search */}
                  <div>
                    {qboSearchResult ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleConnectQBOCustomer(qboSearchResult.Id)
                        }
                        className="mt-2 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Connect to This Customer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSearchQBOCustomer}
                        disabled={
                          !formData.qboDisplayName.trim() || isSearchingQBO
                        }
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSearchingQBO
                          ? "Searching..."
                          : "Search QBO Customer ID"}
                      </button>
                    )}
                  </div>
                </div>
                {qboSearchResult && (
                  <p className="text-sm text-green-800 mt-2 text-right">
                    <strong>Found QBO Customer:</strong>{" "}
                    {qboSearchResult.DisplayName} (ID: {qboSearchResult.Id})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Company Name
                </label>
                <input
                  type="text"
                  value={formData.qboCompanyName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboCompanyName: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Given Name
                </label>
                <input
                  type="text"
                  value={formData.qboGivenName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboGivenName: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional - First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Family Name
                </label>
                <input
                  type="text"
                  value={formData.qboFamilyName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboFamilyName: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional - Last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Middle Name
                </label>
                <input
                  type="text"
                  value={formData.qboMiddleName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboMiddleName: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Title
                </label>
                <input
                  type="text"
                  value={formData.qboTitle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboTitle: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional - Mr, Mrs, Dr, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Suffix
                </label>
                <input
                  type="text"
                  value={formData.qboSuffix}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboSuffix: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional - Jr, Sr, III, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Primary Email
                </label>
                <input
                  type="email"
                  value={formData.qboPrimaryEmailAddr}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboPrimaryEmailAddr: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Primary Phone
                </label>
                <input
                  type="text"
                  value={formData.qboPrimaryPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboPrimaryPhone: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rate Per Minute *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.ratePerMinute}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ratePerMinute: parseFloat(e.target.value),
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax Code
                </label>
                <input
                  type="text"
                  value={formData.taxCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      taxCode: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          {/* Billing Configuration Fields */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-green-400 mb-3">
              Billing Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bill Date (Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  value={formData.billDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billDate: parseInt(e.target.value, 10),
                    })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Day of month to bill (1-31)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bill Time
                </label>
                <input
                  type="time"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  value={formData.billTime}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billTime: e.target.value,
                    })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Time of day to run billing (24-hour format)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Billing Period Start (Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billingPeriodStart}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingPeriodStart: parseInt(e.target.value, 10),
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Day billing period starts (1-31)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Billing Period End (Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billingPeriodEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingPeriodEnd: parseInt(e.target.value, 10),
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Day billing period ends (1-31)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minimumMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minimumMinutes: parseInt(e.target.value, 10),
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minutes included in base rate
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Overage Rate Per Minute
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.overageRatePerMinute}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      overageRatePerMinute: parseFloat(e.target.value),
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Rate for minutes over minimum
                </p>
              </div>
            </div>
          </div>

          {/* QBO Address Fields */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-green-400 mb-3">
              QuickBooks Address Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Street Address (Line 1)
                </label>
                <input
                  type="text"
                  value={formData.qboLine1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboLine1: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  value={formData.qboCity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboCity: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.qboCountrySubDivisionCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboCountrySubDivisionCode: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="State or province code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.qboPostalCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboPostalCode: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Postal code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.qboCountry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qboCountry: e.target.value,
                    }))
                  }
                  className="mt-1 pl-2 block w-full border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Country code (e.g., US, CA)"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Genesys Queue Names *
            </label>
            <div className="mt-1 flex space-x-2">
              <input
                type="text"
                value={newQueue}
                onChange={(e) => setNewQueue(e.target.value)}
                placeholder="Enter queue name"
                className="flex-1 pl-2 border-gray-300 rounded-md h-8 shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addQueue())
                }
              />
              <button
                type="button"
                onClick={addQueue}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.genesysQueueNames.map((queue, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {queue}
                  <button
                    type="button"
                    onClick={() => removeQueue(queue)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              className="mt-1 pl-2 block w-full border-gray-300 rounded-md shadow-sm focus:outline-gray-500 focus:ring-gray-500 focus:border-gray-500"
              placeholder="Optional notes about this customer"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm text-gray-900"
            >
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {profile ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Stats Modal Component
interface StatsModalProps {
  profileId: string;
  onClose: () => void;
}

function StatsModal({ profileId, onClose }: StatsModalProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [profileId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `/api/v1/customer-profiles/${profileId}/stats`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Customer Profile Statistics
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading statistics...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">
                  Total Calls
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalCalls}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">
                  Total Minutes
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalMinutes}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">
                  Total Amount
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.totalAmount}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">
                  Avg Call Duration
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.averageCallDuration} min
                </div>
              </div>
            </div>

            {stats.lastCallDate && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">
                  Last Call Date
                </div>
                <div className="text-lg text-gray-900">
                  {new Date(stats.lastCallDate).toLocaleDateString()}
                </div>
              </div>
            )}

            {stats.queueUsage && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Queue Usage Breakdown
                </h4>
                <div className="space-y-2">
                  {Object.entries(stats.queueUsage).map(
                    ([queueName, usage]: [string, any]) => (
                      <div
                        key={queueName}
                        className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">
                          {queueName}
                        </span>
                        <div className="text-sm text-gray-600">
                          {usage.calls} calls • {usage.minutes} min • $
                          {usage.amount}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* QBO Metadata Section */}
            {stats.qboMetadata && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  QuickBooks Integration Details
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        QBO Company:
                      </span>
                      <div className="text-gray-900">
                        {stats.qboMetadata.qboCompanyName || "Not set"}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        QBO Display Name:
                      </span>
                      <div className="text-gray-900">
                        {stats.qboMetadata.qboDisplayName || "Not set"}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        QBO Primary Email:
                      </span>
                      <div className="text-gray-900">
                        {stats.qboMetadata.qboPrimaryEmailAddr || "Not set"}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        QBO Primary Phone:
                      </span>
                      <div className="text-gray-900">
                        {stats.qboMetadata.qboPrimaryPhone || "Not set"}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        QBO Personal Name:
                      </span>
                      <div className="text-gray-900">
                        {stats.qboMetadata.qboTitle &&
                          `${stats.qboMetadata.qboTitle} `}
                        {stats.qboMetadata.qboGivenName || ""}{" "}
                        {stats.qboMetadata.qboMiddleName &&
                          `${stats.qboMetadata.qboMiddleName} `}
                        {stats.qboMetadata.qboFamilyName || ""}
                        {stats.qboMetadata.qboSuffix &&
                          `, ${stats.qboMetadata.qboSuffix}`}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        QBO Address:
                      </span>
                      <div className="text-gray-900">
                        {stats.qboMetadata.qboLine1
                          ? `${stats.qboMetadata.qboLine1}, ${
                              stats.qboMetadata.qboCity || ""
                            }, ${
                              stats.qboMetadata.qboCountrySubDivisionCode || ""
                            } ${stats.qboMetadata.qboPostalCode || ""} ${
                              stats.qboMetadata.qboCountry || ""
                            }`
                          : "Not set"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No statistics available for this customer profile.
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
