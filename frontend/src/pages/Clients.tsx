import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Phone,
  Building,
  Filter,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

interface Client {
  id: string;
  name: string;
  genesysClientId: string;
  qboCustomerId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isActive: boolean;
  ratePerMinute: number;
  taxCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ClientFilters {
  search: string;
  isActive: boolean | null;
  hasQboCustomerId: boolean | null;
}

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<ClientFilters>({
    search: "",
    isActive: null,
    hasQboCustomerId: null,
  });

  useEffect(() => {
    fetchClients();
  }, [pagination.page, pagination.limit, filters]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.search) {
        params.append("search", filters.search);
      }
      if (filters.isActive !== null) {
        params.append("isActive", filters.isActive.toString());
      }
      if (filters.hasQboCustomerId !== null) {
        params.append("hasQboCustomerId", filters.hasQboCustomerId.toString());
      }

      const response = await fetch(`/api/v1/clients?${params}`);
      const data = await response.json();

      if (data.success) {
        setClients(data.data);
        setPagination(data.pagination);
      } else {
        toast.error(data.error || "Failed to load clients");
      }
    } catch (error) {
      toast.error("Failed to load clients");
      console.error("Error fetching clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClients = async () => {
    setIsRefreshing(true);
    await fetchClients();
    setIsRefreshing(false);
  };

  const addClient = async (
    clientData: Omit<Client, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Client added successfully");
        setShowAddModal(false);
        fetchClients(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to add client");
      }
    } catch (error) {
      toast.error("Failed to add client");
      console.error("Error adding client:", error);
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const response = await fetch(`/api/v1/clients/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Client updated successfully");
        setEditingClient(null);
        fetchClients(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to update client");
      }
    } catch (error) {
      toast.error("Failed to update client");
      console.error("Error updating client:", error);
    }
  };

  const deleteClient = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        const response = await fetch(`/api/v1/clients/${id}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (data.success) {
          toast.success("Client deleted successfully");
          fetchClients(); // Refresh the list
        } else {
          toast.error(data.error || "Failed to delete client");
        }
      } catch (error) {
        toast.error("Failed to delete client");
        console.error("Error deleting client:", error);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleFilterChange = (key: keyof ClientFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      isActive: null,
      hasQboCustomerId: null,
    });
    setSearchTerm("");
    setPagination((prev) => ({ ...prev, page: 1 }));
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">
            Manage client mappings between phone system and QuickBooks
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshClients}
            disabled={isRefreshing}
            className="btn btn-secondary btn-md"
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.isActive === null ? "" : filters.isActive.toString()}
            onChange={(e) =>
              handleFilterChange(
                "isActive",
                e.target.value === "" ? null : e.target.value === "true"
              )
            }
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {/* QBO Customer ID Filter */}
          <select
            value={
              filters.hasQboCustomerId === null
                ? ""
                : filters.hasQboCustomerId.toString()
            }
            onChange={(e) =>
              handleFilterChange(
                "hasQboCustomerId",
                e.target.value === "" ? null : e.target.value === "true"
              )
            }
            className="input"
          >
            <option value="">All QBO Status</option>
            <option value="true">Has QBO ID</option>
            <option value="false">No QBO ID</option>
          </select>

          {/* Clear Filters */}
          <button onClick={clearFilters} className="btn btn-secondary btn-sm">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone System ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QBO Customer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
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
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {filters.search ||
                    filters.isActive !== null ||
                    filters.hasQboCustomerId !== null
                      ? "No clients match the current filters"
                      : "No clients found. Add your first client to get started."}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <Building className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.address
                              ? `${client.address}, ${client.city || ""}`
                              : "No address"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {client.genesysClientId}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {client.qboCustomerId || (
                          <span className="text-gray-400 italic">
                            Not mapped
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.email || "No email"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {client.phone || "No phone"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        ${client.ratePerMinute}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`badge ${
                          client.isActive ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {client.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingClient(client)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit client"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteClient(client.id)}
                          className="text-danger-600 hover:text-danger-900"
                          title="Delete client"
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
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}
                    </span>{" "}
                    of <span className="font-medium">{pagination.total}</span>{" "}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="btn btn-secondary btn-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from(
                      { length: pagination.pages },
                      (_, i) => i + 1
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`btn btn-sm ${
                          page === pagination.page
                            ? "btn-primary"
                            : "btn-secondary"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="btn btn-secondary btn-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <ClientModal
          onSave={addClient}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <ClientModal
          client={editingClient}
          onSave={(clientData) => updateClient(editingClient.id, clientData)}
          onCancel={() => setEditingClient(null)}
        />
      )}
    </div>
  );
}

interface ClientModalProps {
  client?: Client;
  onSave: (clientData: Omit<Client, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

function ClientModal({ client, onSave, onCancel }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: client?.name || "",
    genesysClientId: client?.genesysClientId || "",
    qboCustomerId: client?.qboCustomerId || "",
    email: client?.email || "",
    phone: client?.phone || "",
    address: client?.address || "",
    city: client?.city || "",
    state: client?.state || "",
    zipCode: client?.zipCode || "",
    country: client?.country || "US",
    isActive: client?.isActive ?? true,
    ratePerMinute: client?.ratePerMinute || 0,
    taxCode: client?.taxCode || "",
    notes: client?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {client ? "Edit Client" : "Add New Client"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone System Client ID
                </label>
                <input
                  type="text"
                  value={formData.genesysClientId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      genesysClientId: e.target.value,
                    })
                  }
                  required
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  QBO Customer ID
                </label>
                <input
                  type="text"
                  value={formData.qboCustomerId}
                  onChange={(e) =>
                    setFormData({ ...formData, qboCustomerId: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="input mt-1"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rate Per Minute
                </label>
                <input
                  type="number"
                  value={formData.ratePerMinute}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ratePerMinute: parseFloat(e.target.value),
                    })
                  }
                  className="input mt-1"
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
                    setFormData({ ...formData, taxCode: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="input mt-1"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isActive"
                className="ml-2 block text-sm text-gray-900"
              >
                Active Client
              </label>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-md">
                {client ? "Update Client" : "Add Client"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
