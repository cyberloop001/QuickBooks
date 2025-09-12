import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";

interface Region {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface EditRegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  region: Region | null;
}

export function EditRegionModal({ isOpen, onClose, onSuccess, region }: EditRegionModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (region) {
      setFormData({
        name: region.name,
        description: region.description || "",
        isActive: region.isActive
      });
    }
  }, [region]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Region name is required");
      return;
    }

    if (!region) {
      toast.error("No region selected");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/v1/regions/${region.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Region updated successfully");
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update region");
      }
    } catch (error) {
      console.error("Error updating region:", error);
      toast.error("Failed to update region");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleDelete = async () => {
    if (!region) return;

    if (!confirm(`Are you sure you want to delete the region "${region.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/v1/regions/${region.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Region deleted successfully");
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete region");
      }
    } catch (error) {
      console.error("Error deleting region:", error);
      toast.error("Failed to delete region");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !region) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Edit Region</h3>
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
                Region Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., North America"
                required
              />
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
                placeholder="Optional description of the region"
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Region"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
