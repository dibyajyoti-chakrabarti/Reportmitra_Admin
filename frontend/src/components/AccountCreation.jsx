import { useEffect, useState } from "react";
import { getCurrentUser, createAccount } from "../api";

const AccountCreation = () => {
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

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

  // Fetch logged-in rootuser
  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (!mounted) return;

        setFormData((prev) => ({
          ...prev,
          department: user.department, // auto-fill
        }));
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load user info");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

const handleCreate = async () => {
  setFormErrors({});

  // 🔒 Frontend validation (fast feedback)
  if (formData.userId.length !== 6) {
    setFormErrors({ userId: "User ID must be exactly 6 characters" });
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

    setFormData((prev) => ({
      ...prev,
      userId: "",
      fullName: "",
      password: "",
    }));

    setFormData((prev) => ({
      ...prev,
      userId: "",
      fullName: "",
      email: "",
      password: "",
    }));
  } catch (err) {
    // Backend validation errors (DRF style)
    try {
      const parsed = JSON.parse(
        err.message.replace(/^createAccount failed: \d+\s*/, "")
      );
      setFormErrors(parsed);
    } catch {
      setFormErrors({ general: "Failed to create account" });
    }
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
    return <div className="text-gray-500">Loading…</div>;
  }
const handleUserIdChange = (e) => {
  let value = e.target.value.toUpperCase();

  // Allow only A–Z and 0–9
  value = value.replace(/[^A-Z0-9]/g, "");

  // Max 6 characters
  if (value.length > 6) {
    value = value.slice(0, 6);
  }

  setFormData({ ...formData, userId: value });
};

  return (
    <div className="flex flex-col justify-center items-center h-[83vh]">
      <h1 className="text-3xl font-bold text-black mb-6">Account Creation</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-xl border">
        <p className="text-gray-600 mb-6">
          Create new administrative accounts for your department.
        </p>

        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        <div className="space-y-3">
          {/* User ID */}
          <div>
            <label className="block text-sm font-semibold mb-1">User ID</label>

            <div className="flex gap-2">
              <input
                type="text"
                value={formData.userId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    userId: e.target.value.toUpperCase(),
                  })
                }
                className="flex-1 px-3 py-2 border rounded focus:border-black"
                placeholder="Auto-generate or enter manually"
              />

              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, userId: generateUserId() })
                }
                className="px-3 py-2 border rounded text-sm font-semibold
                 hover:bg-gray-100 transition"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full px-3 py-2 border rounded focus:border-black"
            />
          </div>

          {/* Department (LOCKED) */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border rounded focus:border-black"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Initial Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 border rounded focus:border-black"
            />
          </div>

          <button
            onClick={handleCreate}
            className="bg-black text-white px-6 py-3 rounded font-semibold hover:bg-gray-800 mt-4"
          >
            Create Account
          </button>
        </div>
      </div>
{showSuccessModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
      
      {/* Success Icon */}
      <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
        <svg
          className="w-6 h-6 text-green-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Account created successfully
      </h2>

      {/* Action */}
      <button
        onClick={downloadCSV}
        className="w-full bg-black text-white py-2.5 rounded-md font-medium hover:bg-gray-800 transition"
      >
        Download CSV
      </button>

      {/* Subtle close */}
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


    </div>
  );
};

export default AccountCreation;
