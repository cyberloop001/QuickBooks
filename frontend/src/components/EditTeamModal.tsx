import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";

interface Region {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  regionId: string;
  isActive: boolean;
  region: Region;
}

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  team: Team | null;
}

export function EditTeamModal({ isOpen, onClose, onSuccess, team }: EditTeamModalProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    regionId: "",
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRegions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || "",
        regionId: team.regionId,
        isActive: team.isActive
      });
    }
  }, [team]);

  const fetchRegions = async () => {
    try {
      setLoadingRegions(true);
      const response = await fetch("/api/v1/regions");
      if (response.ok) {
        const data = await response.json();
        setRegions(data.data);
      }
    } catch (error) {
      console.error("Error fetching regions:", error);
      toast.error("Failed to load regions");
    } finally {
      setLoadingRegions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Team name is required");
      return;
    }

    if (!formData.regionId) {
      toast.error("Please select a region");
      return;
    }

    if (!team) {
      toast.error("No team selected");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/v1/teams/${team.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Team updated successfully");
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update team");
      }
    } catch (error) {
      console.error("Error updating team:", error);
      toast.error("Failed to update team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleDelete = async () => {
    if (!team) return;

    if (!confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/v1/teams/${team.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Team deleted successfully");
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete team");
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Edit Team</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Team Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Customer Support - NA"
                required
              />
            </div>

            <div>
              <label htmlFor="regionId" className="block text-sm font-medium text-gray-700">
                Region *
              </label>
              <select
                id="regionId"
                name="regionId"
                value={formData.regionId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                disabled={loadingRegions}
              >
                <option value="">Select a region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
              {loadingRegions && (
                <p className="mt-1 text-sm text-gray-500">Loading regions...</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Optional description of the team"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || loadingRegions}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Team"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
