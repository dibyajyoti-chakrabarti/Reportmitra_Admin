import { useEffect, useState } from "react";
import { listUsers, toggleUserStatus } from "../api";
import { Power, PowerOff, AlertCircle, RefreshCw } from "lucide-react";

const AccountActivation = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const userList = await listUsers();
      setUsers(userList);
    } catch (err) {
      setError("Failed to load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    setProcessing(true);
    setError("");
    try {
      await toggleUserStatus(user.userid);
      setConfirmModal(null);
      loadUsers();
    } catch (err) {
      setError(err.message || "Failed to update user status");
    } finally {
      setProcessing(false);
    }
  };

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  return (
    <div className="flex flex-col justify-center items-center h-[88vh]">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">
            Account Activation & Deactivation
          </h1>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg 
                     font-semibold transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Power className="w-4 h-4" />
            Active Accounts ({activeUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("inactive")}
            className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeTab === "inactive"
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <PowerOff className="w-4 h-4" />
            Inactive Accounts ({inactiveUsers.length})
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow border p-6">
          {activeTab === "active" && (
            <div>
              <p className="text-gray-600 mb-4">
                Active accounts can log in and access the system. Click "Deactivate" to prevent a user from logging in.
              </p>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading users…</div>
              ) : activeUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No active users found
                </div>
              ) : (
                <div className="space-y-3">
                  {activeUsers.map((user) => (
                    <div
                      key={user.userid}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg">{user.userid}</p>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      <button
                        onClick={() => setConfirmModal(user)}
                        className="px-5 py-2.5 bg-red-600 text-white rounded-lg
                                 hover:bg-red-700 transition flex items-center gap-2
                                 font-bold shadow-sm hover:shadow-md"
                      >
                        <PowerOff className="w-4 h-4" />
                        Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "inactive" && (
            <div>
              <p className="text-gray-600 mb-4">
                Inactive accounts cannot log in. Click "Activate" to restore access for a user.
              </p>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading users…</div>
              ) : inactiveUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No inactive users found
                </div>
              ) : (
                <div className="space-y-3">
                  {inactiveUsers.map((user) => (
                    <div
                      key={user.userid}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg text-gray-600">{user.userid}</p>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full font-semibold">
                            Inactive
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      <button
                        onClick={() => setConfirmModal(user)}
                        className="px-5 py-2.5 bg-green-600 text-white rounded-lg
                                 hover:bg-green-700 transition flex items-center gap-2
                                 font-bold shadow-sm hover:shadow-md"
                      >
                        <Power className="w-4 h-4" />
                        Activate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    confirmModal.is_active ? "bg-red-100" : "bg-green-100"
                  }`}
                >
                  {confirmModal.is_active ? (
                    <PowerOff className="w-6 h-6 text-red-600" />
                  ) : (
                    <Power className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Confirm {confirmModal.is_active ? "Deactivation" : "Activation"}
                </h2>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="font-bold text-gray-900 mb-1">{confirmModal.userid}</p>
                <p className="text-sm text-gray-700">{confirmModal.full_name}</p>
                <p className="text-xs text-gray-500">{confirmModal.email}</p>
              </div>

              <p className="text-gray-700 mb-6">
                {confirmModal.is_active ? (
                  <>
                    <span className="text-red-600 font-bold">
                      This user will not be able to log in
                    </span>{" "}
                    until their account is reactivated.
                  </>
                ) : (
                  <>
                    <span className="text-green-600 font-bold">
                      This user will be able to log in again
                    </span>{" "}
                    and access the system.
                  </>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleToggleStatus(confirmModal)}
                  disabled={processing}
                  className={`flex-1 py-2.5 rounded-lg font-bold transition disabled:opacity-50 ${
                    confirmModal.is_active
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {processing
                    ? "Processing..."
                    : confirmModal.is_active
                    ? "Deactivate"
                    : "Activate"}
                </button>
                <button
                  onClick={() => setConfirmModal(null)}
                  disabled={processing}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg
                           font-bold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountActivation;