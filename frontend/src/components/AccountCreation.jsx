import { useEffect, useState } from "react";
import { getCurrentUser, createAccount } from "../api";

const AccountCreation = () => {
  const [loading, setLoading] = useState(true);
const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    department: "",
    email: "",
    password: "",
  });

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

    alert("Account created successfully");

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
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">
        Account Creation
      </h1>

      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <p className="text-gray-600 mb-6">
          Create new administrative accounts for your department.
        </p>

        {formErrors.general && (
  <div className="text-red-600 text-sm mb-4">
    {formErrors.general}
  </div>
)}


        <div className="space-y-4">
          {/* User ID */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              User ID
            </label>
            <input
  type="text"
  value={formData.userId}
  onChange={handleUserIdChange}
  maxLength={6}
  className={`w-full px-4 py-3 border rounded focus:border-black ${
    formErrors.userId ? "border-red-500" : ""
  }`}
/>

{formErrors.userId && (
  <p className="text-red-500 text-xs mt-1">
    {formErrors.userId}
  </p>
)}

          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full px-4 py-3 border rounded focus:border-black"
            />
          </div>

          {/* Department (LOCKED) */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              disabled
              className="w-full px-4 py-3 border rounded bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 border rounded focus:border-black"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Initial Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-3 border rounded focus:border-black"
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
    </div>
  );
};

export default AccountCreation;
