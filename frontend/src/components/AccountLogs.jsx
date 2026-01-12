import { useEffect, useState } from "react";
import { getActivityLogs } from "../api";
import {
  ScrollText,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Trash2,
  Power,
  PowerOff,
  LogIn,
  LogOut,
} from "lucide-react";

const AccountLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActivityLogs();
      setLogs(data);
    } catch (err) {
      setError("Failed to load activity logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionIcon = (action) => {
    switch (action) {
      case "create":
        return <UserPlus className="w-4 h-4" />;
      case "delete":
        return <Trash2 className="w-4 h-4" />;
      case "activate":
        return <Power className="w-4 h-4" />;
      case "deactivate":
        return <PowerOff className="w-4 h-4" />;
      case "login":
        return <LogIn className="w-4 h-4" />;
      case "logout":
        return <LogOut className="w-4 h-4" />;
      default:
        return <ScrollText className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "create":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "delete":
        return "bg-red-100 text-red-700 border-red-200";
      case "activate":
        return "bg-green-100 text-green-700 border-green-200";
      case "deactivate":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "login":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "logout":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.action === filter);

  const actionTypes = [
    { value: "all", label: "All Actions" },
    { value: "create", label: "Account Created" },
    { value: "delete", label: "Account Deleted" },
    { value: "activate", label: "Account Activated" },
    { value: "deactivate", label: "Account Deactivated" },
  ];

  return (
    <div className="flex flex-col h-[88vh]">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-black">Account Activity Logs</h1>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg 
                     font-semibold transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {actionTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === type.value
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Logs */}
        <div className="bg-white rounded-lg shadow border flex-1 overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b px-6 py-4">
            <p className="text-sm font-semibold text-gray-600">
              Showing {filteredLogs.length} of {logs.length} logs
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-3" />
                <p className="text-gray-500 text-sm">Loading logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No activity logs found
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-6 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`p-2 rounded-lg border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionIcon(log.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded border ${getActionColor(
                              log.action
                            )}`}
                          >
                            {log.action_display}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-900 font-medium mb-1">
                          <span className="font-bold">
                            {log.performed_by_userid}
                          </span>{" "}
                          ({log.performed_by_name || "N/A"})
                        </p>

                        <p className="text-sm text-gray-700">
                          Target: <span className="font-semibold">{log.target_user}</span>
                        </p>

                        {log.details && (
                          <p className="text-xs text-gray-600 mt-1">
                            {log.details}
                          </p>
                        )}

                        {log.ip_address && (
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountLogs;