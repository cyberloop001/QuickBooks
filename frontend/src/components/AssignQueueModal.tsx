import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";

interface Team {
  id: string;
  name: string;
  region: {
    id: string;
    name: string;
  };
}

interface UnassignedQueue {
  id: string;
  name: string;
}

interface AssignQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  queue: UnassignedQueue | null;
}

export function AssignQueueModal({ isOpen, onClose, onSuccess, queue }: AssignQueueModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    teamId: "",
    assignedBy: "",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const response = await fetch("/api/v1/teams");
      if (response.ok) {
        const data = await response.json();
        setTeams(data.data);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.teamId) {
      toast.error("Please select a team");
      return;
    }

    if (!queue) {
      toast.error("No queue selected");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/v1/queue-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queueId: queue.id,
          queueName: queue.name,
          teamId: formData.teamId,
          assignedBy: formData.assignedBy || undefined,
          notes: formData.notes || undefined
        }),
      });

      if (response.ok) {
        toast.success("Queue assigned successfully");
        setFormData({ teamId: "", assignedBy: "", notes: "" });
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to assign queue");
      }
    } catch (error) {
      console.error("Error assigning queue:", error);
      toast.error("Failed to assign queue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen || !queue) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Assign Queue to Team</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-700">Queue</p>
              <p className="text-sm text-gray-900">{queue.name}</p>
              <p className="text-xs text-gray-500">ID: {queue.id}</p>
            </div>

            <div>
              <label htmlFor="teamId" className="block text-sm font-medium text-gray-700">
                Team *
              </label>
              <select
                id="teamId"
                name="teamId"
                value={formData.teamId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                disabled={loadingTeams}
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.region.name})
                  </option>
                ))}
              </select>
              {loadingTeams && (
                <p className="mt-1 text-sm text-gray-500">Loading teams...</p>
              )}
            </div>

            <div>
              <label htmlFor="assignedBy" className="block text-sm font-medium text-gray-700">
                Assigned By
              </label>
              <input
                type="text"
                id="assignedBy"
                name="assignedBy"
                value={formData.assignedBy}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Your name (optional)"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Optional notes about this assignment"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loadingTeams}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Assigning..." : "Assign Queue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
