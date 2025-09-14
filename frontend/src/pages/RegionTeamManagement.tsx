import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  Users,
  MapPin,
  Building2,
  AlertTriangle,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Users2,
  Building,
} from "lucide-react";
import { CreateRegionModal } from "../components/CreateRegionModal";
import { CreateTeamModal } from "../components/CreateTeamModal";
import { AssignQueueModal } from "../components/AssignQueueModal";
import { EditRegionModal } from "../components/EditRegionModal";
import { EditTeamModal } from "../components/EditTeamModal";
import { EditQueueAssignmentModal } from "../components/EditQueueAssignmentModal";

interface Region {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
}

interface Team {
  id: string;
  name: string;
  description?: string;
  regionId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  region: Region;
  queueAssignments: QueueAssignment[];
}

interface QueueAssignment {
  id: string;
  queueId: string;
  queueName: string;
  teamId: string;
  assignedAt: string;
  assignedBy?: string;
  notes?: string;
  team: Team;
}

interface UnassignedQueue {
  id: string;
  name: string;
}

// Tree structure interfaces
interface TreeNode {
  id: string;
  name: string;
  type: "region" | "team" | "queue";
  children?: TreeNode[];
  data?: any;
  isExpanded?: boolean;
}

// TreeView component
const TreeView = ({
  regions,
  teams,
  queueAssignments,
}: {
  regions: Region[];
  teams: Team[];
  queueAssignments: QueueAssignment[];
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const buildTree = (): TreeNode[] => {
    return regions.map((region) => {
      const regionTeams = teams.filter((team) => team.regionId === region.id);
      const regionQueues = queueAssignments.filter((assignment) =>
        regionTeams.some((team) => team.id === assignment.teamId)
      );

      return {
        id: region.id,
        name: region.name,
        type: "region",
        data: region,
        isExpanded: expandedNodes.has(region.id),
        children: regionTeams.map((team) => {
          const teamQueues = queueAssignments.filter(
            (assignment) => assignment.teamId === team.id
          );

          return {
            id: team.id,
            name: team.name,
            type: "team",
            data: team,
            isExpanded: expandedNodes.has(team.id),
            children: teamQueues.map((assignment) => ({
              id: assignment.id,
              name: assignment.queueName,
              type: "queue",
              data: assignment,
            })),
          };
        }),
      };
    });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = level * 20;

    const getIcon = () => {
      switch (node.type) {
        case "region":
          return isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-600" />
          ) : (
            <Folder className="w-4 h-4 text-blue-600" />
          );
        case "team":
          return <Users2 className="w-4 h-4 text-green-600" />;
        case "queue":
          return <Building className="w-4 h-4 text-purple-600" />;
        default:
          return null;
      }
    };

    const getStatusBadge = () => {
      if (node.type === "region") {
        return (
          <span
            className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              node.data.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {node.data.isActive ? "Active" : "Inactive"}
          </span>
        );
      }
      if (node.type === "team") {
        return (
          <span
            className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              node.data.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {node.data.isActive ? "Active" : "Inactive"}
          </span>
        );
      }
      return null;
    };

    const getCountBadge = () => {
      if (node.type === "region" && node.children) {
        const teamCount = node.children.length;
        const queueCount = node.children.reduce(
          (total, team) => total + (team.children ? team.children.length : 0),
          0
        );
        return (
          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
            {teamCount} teams, {queueCount} queues
          </span>
        );
      }
      if (node.type === "team" && node.children) {
        return (
          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
            {node.children.length} queues
          </span>
        );
      }
      return null;
    };

    return (
      <div key={node.id}>
        <div
          className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer rounded-md"
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            <div className="mr-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}
          {!hasChildren && <div className="w-6" />}

          <div className="flex items-center flex-1">
            {getIcon()}
            <span className="ml-2 font-medium text-gray-900">{node.name}</span>
            {getStatusBadge()}
            {getCountBadge()}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Organizational Structure
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Hierarchical view of regions, teams, and queue assignments
        </p>
      </div>
      <div className="p-6">
        {tree.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📁</div>
            <p className="text-gray-500">No organizational structure found</p>
            <p className="text-sm text-gray-400 mt-1">
              Create regions and teams to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
};

export function RegionTeamManagement() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [queueAssignments, setQueueAssignments] = useState<QueueAssignment[]>(
    []
  );
  const [unassignedQueues, setUnassignedQueues] = useState<UnassignedQueue[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Modal states
  const [showCreateRegion, setShowCreateRegion] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAssignQueue, setShowAssignQueue] = useState(false);
  const [showEditRegion, setShowEditRegion] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [showEditAssignment, setShowEditAssignment] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<UnassignedQueue | null>(
    null
  );
  const [selectedAssignment, setSelectedAssignment] =
    useState<QueueAssignment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regionsRes, teamsRes, assignmentsRes, unassignedRes] =
        await Promise.all([
          fetch("/api/v1/regions"),
          fetch("/api/v1/teams"),
          fetch("/api/v1/queue-assignments"),
          fetch("/api/v1/queue-assignments/unassigned"),
        ]);

      if (regionsRes.ok) {
        const regionsData = await regionsRes.json();
        setRegions(regionsData.data);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.data);
      }

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setQueueAssignments(assignmentsData.data);
      }

      if (unassignedRes.ok) {
        const unassignedData = await unassignedRes.json();
        setUnassignedQueues(unassignedData.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getRegionStats = () => {
    const totalRegions = regions.length;
    const activeRegions = regions.filter((r) => r.isActive).length;
    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => t.isActive).length;
    const totalQueues = queueAssignments.length;
    const unassignedCount = unassignedQueues.length;

    return {
      totalRegions,
      activeRegions,
      totalTeams,
      activeTeams,
      totalQueues,
      unassignedCount,
    };
  };

  const handleEditRegion = (region: Region) => {
    setSelectedRegion(region);
    setShowEditRegion(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setShowEditTeam(true);
  };

  const handleEditAssignment = (assignment: QueueAssignment) => {
    setSelectedAssignment(assignment);
    setShowEditAssignment(true);
  };

  const handleAssignQueue = (queue: UnassignedQueue) => {
    setSelectedQueue(queue);
    setShowAssignQueue(true);
  };

  const handleDeleteRegion = async (regionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this region? This will also delete all teams in this region."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/regions/${regionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Region deleted successfully");
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete region");
      }
    } catch (error) {
      console.error("Error deleting region:", error);
      toast.error("Failed to delete region");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this team? This will also unassign all queues from this team."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/teams/${teamId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Team deleted successfully");
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete team");
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
    }
  };

  const stats = getRegionStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Region & Team Management
          </h1>
          <p className="text-gray-600">
            Manage organizational structure and queue assignments
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateRegion(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Region
          </button>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Team
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Regions</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalRegions}
              </p>
              <p className="text-xs text-green-600">
                {stats.activeRegions} active
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalTeams}
              </p>
              <p className="text-xs text-green-600">
                {stats.activeTeams} active
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Assigned Queues
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalQueues}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Unassigned Queues
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.unassignedCount}
              </p>
              <p className="text-xs text-orange-600">Need attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", name: "Overview", count: null },
            { id: "regions", name: "Regions", count: stats.totalRegions },
            { id: "teams", name: "Teams", count: stats.totalTeams },
            {
              id: "assignments",
              name: "Queue Assignments",
              count: stats.totalQueues,
            },
            {
              id: "unassigned",
              name: "Unassigned Queues",
              count: stats.unassignedCount,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.name}
              {tab.count !== null && (
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    tab.id === "unassigned" && tab.count > 0
                      ? "bg-orange-100 text-orange-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Tree Structure View */}
            <TreeView
              regions={regions}
              teams={teams}
              queueAssignments={queueAssignments}
            />

            {/* Unassigned Queues Alert */}
            {stats.unassignedCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-800">
                      {stats.unassignedCount} unassigned queues need attention
                    </h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Click on the "Unassigned Queues" tab to assign them to
                      teams.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "regions" && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Regions</h3>
            </div>
            <div className="p-6">
              {regions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No regions found
                </p>
              ) : (
                <div className="space-y-4">
                  {regions.map((region) => (
                    <div key={region.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {region.name}
                          </h4>
                          {region.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {region.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {region.teams?.length || 0} teams • Created{" "}
                            {new Date(region.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              region.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {region.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            onClick={() => handleEditRegion(region)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRegion(region.id)}
                            className="text-red-600 hover:text-red-800 text-sm flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Teams</h3>
            </div>
            <div className="p-6">
              {teams.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No teams found</p>
              ) : (
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {team.name}
                          </h4>
                          {team.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {team.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {team.region?.name} •{" "}
                            {team.queueAssignments?.length || 0} queues •
                            Created{" "}
                            {new Date(team.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              team.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {team.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            onClick={() => handleEditTeam(team)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-red-600 hover:text-red-800 text-sm flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Queue Assignments
              </h3>
            </div>
            <div className="p-6">
              {queueAssignments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No queue assignments found
                </p>
              ) : (
                <div className="space-y-4">
                  {queueAssignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {assignment.queueName}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Assigned to {assignment.team?.name} (
                            {assignment.team?.region?.name})
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Assigned{" "}
                            {new Date(
                              assignment.assignedAt
                            ).toLocaleDateString()}
                            {assignment.assignedBy &&
                              ` by ${assignment.assignedBy}`}
                          </p>
                          {assignment.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              Notes: {assignment.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditAssignment(assignment)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "unassigned" && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Unassigned Queues
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                These queues from Genesys need to be assigned to teams
              </p>
            </div>
            <div className="p-6">
              {unassignedQueues.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-600 text-4xl mb-2">✓</div>
                  <p className="text-gray-500">All queues are assigned!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unassignedQueues.map((queue) => (
                    <div
                      key={queue.id}
                      className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {queue.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Queue ID: {queue.id}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAssignQueue(queue)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Assign to Team
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRegionModal
        isOpen={showCreateRegion}
        onClose={() => setShowCreateRegion(false)}
        onSuccess={fetchData}
      />

      <CreateTeamModal
        isOpen={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        onSuccess={fetchData}
      />

      <AssignQueueModal
        isOpen={showAssignQueue}
        onClose={() => setShowAssignQueue(false)}
        onSuccess={fetchData}
        queue={selectedQueue}
      />

      <EditRegionModal
        isOpen={showEditRegion}
        onClose={() => setShowEditRegion(false)}
        onSuccess={fetchData}
        region={selectedRegion}
      />

      <EditTeamModal
        isOpen={showEditTeam}
        onClose={() => setShowEditTeam(false)}
        onSuccess={fetchData}
        team={selectedTeam}
      />

      <EditQueueAssignmentModal
        isOpen={showEditAssignment}
        onClose={() => setShowEditAssignment(false)}
        onSuccess={fetchData}
        assignment={selectedAssignment}
      />
    </div>
  );
}
