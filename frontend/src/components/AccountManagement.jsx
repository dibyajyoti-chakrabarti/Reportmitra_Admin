import { useEffect, useState } from "react";
import { getCurrentUser, createAccount, listUsers, deleteUser } from "../api";
import { UserPlus, Trash2, AlertCircle } from "lucide-react";

const AccountManagement = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    department: "",
    email: "",
    password: "",
  });

  const generateUserId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generatePassword = () => {
    const length = Math.floor(Math.random() * 5) + 8; // 8–12
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
    let pwd = "";

    for (let i = 0; i < length; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return pwd;
  };

  // Fetch logged-in root user
  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        setFormData((prev) => ({
          ...prev,
          department: user.department,
        }));
      })
      .catch(() => {
        setError("Failed to load user info");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch users when switching to delete tab
  useEffect(() => {
    if (activeTab === "delete") {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const userList = await listUsers();
      setUsers(userList);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    // Auto-generate password once User ID becomes valid
    if (formData.userId.length === 6 && !formData.password) {
      setFormData((prev) => ({
        ...prev,
        password: generatePassword(),
      }));
    }
  }, [formData.userId]);

  const handleCreate = async () => {
    setError("");
    setFormErrors({});

    // User ID validation
    if (formData.userId.length !== 6) {
      setFormErrors({ userId: "User ID must be exactly 6 characters" });
      return;
    }

    // Email validation
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;

    if (!emailRegex.test(formData.email)) {
      setFormErrors({ email: "Enter a valid email address" });
      return;
    }

    if (!formData.password) {
      setError("Password was not generated. Please generate User ID again.");
      return;
    }

    try {
      await createAccount({
        userid: formData.userId,
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      setCreatedCreds({
        userid: formData.userId,
        password: formData.password,
      });

      setShowSuccessModal(true);

      // Clear form except department
      setFormData((prev) => ({
        ...prev,
        userId: "",
        fullName: "",
        email: "",
        password: "",
      }));
    } catch (err) {
      setError(err.message || "Failed to create account");
    }
  };

  const handleDelete = async (userid) => {
    try {
      await deleteUser(userid);
      setDeleteConfirm(null);
      loadUsers(); // Refresh list
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  const downloadCSV = () => {
    if (!createdCreds) return;

    const csvContent = `User ID,Password\n${createdCreds.userid},${createdCreds.password}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `account_credentials_${createdCreds.userid}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[85vh] bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Account Management
        </h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 justify-center">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-5 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
              activeTab === "create"
                ? "bg-black text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
          <button
            onClick={() => setActiveTab("delete")}
            className={`px-5 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
              activeTab === "delete"
                ? "bg-black text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* CREATE TAB */}
        {activeTab === "create" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-gray-600 mb-4 text-sm">
              Create new administrative accounts for your department.
            </p>

            <div className="space-y-3">
              {/* User ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  User ID
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userId: e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, ""),
                      })
                    }
                    maxLength={6}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                      formErrors.userId ? "border-red-500" : "border-gray-300"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        userId: generateUserId(),
                        password: generatePassword(),
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold
                 hover:bg-gray-100 transition"
                  >
                    Generate
                  </button>
                </div>

                {formErrors.userId && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.userId}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                             bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                    formErrors.email ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Initial Password
                </label>

                <input
                  type="text"
                  value={formData.password}
                  readOnly
                  placeholder="Auto-generated"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                   bg-gray-100 text-gray-700
                   cursor-not-allowed font-mono"
                />

                <p className="text-xs text-gray-500 mt-1">
                  This password is auto-generated and cannot be changed.
                </p>
              </div>

              <button
                onClick={handleCreate}
                className="bg-black text-white px-5 py-2.5 rounded-lg text-sm
                           font-semibold hover:bg-gray-800 transition mt-2 w-full shadow-sm"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* DELETE TAB */}
        {activeTab === "delete" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-gray-600 mb-4 text-sm">
              Delete accounts from your department. Root users cannot be deleted.
            </p>

            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No users found in your department
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.userid}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{user.userid}</p>
                      <p className="text-xs text-gray-700">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>

                    <button
                      onClick={() => setDeleteConfirm(user)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm
                               hover:bg-red-700 transition flex items-center gap-2
                               font-semibold shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div
                className="mx-auto mb-4 flex items-center justify-center
                              w-12 h-12 rounded-full bg-green-100"
              >
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Account created successfully
              </h2>

              <button
                onClick={downloadCSV}
                className="w-full bg-black text-white py-2.5
                           rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                Download CSV
              </button>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedCreds(null);
                }}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Confirm Deletion
                </h2>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete user{" "}
                <strong>{deleteConfirm.userid}</strong> (
                {deleteConfirm.full_name})? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm.userid)}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg
                           font-semibold hover:bg-red-700 transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg
                           font-semibold hover:bg-gray-300 transition"
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

export default AccountManagement;