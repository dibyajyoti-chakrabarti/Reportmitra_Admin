import { useOutletContext } from "react-router-dom";
import { UserCircle, IdCard, Building2, Mail } from "lucide-react";

export default function Profile() {
  const { user } = useOutletContext();

  if (!user) {
    return <div className="text-black">Loading profile...</div>;
  }

  return (
    <div className="flex justify-center items-start h-[83vh] px-6 pt-10">
      <div className="w-full max-w-3xl">
        {/* Page title */}
        <h1 className="text-3xl font-bold text-black mb-8 text-center">
          My Profile
        </h1>

        {/* Main card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border-1">
          {/* Header */}
          <div className="flex items-center gap-6 px-8 py-6 border-b">
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gray-100">
              <UserCircle className="w-16 h-16 text-gray-500" />
            </div>

            <div>
              <div className="flex items-center gap-3">
  <h2 className="text-2xl font-bold text-black">
    {user.fullName || "—"}
  </h2>

  {/* Role badge */}
  {user.isRoot ? (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold
                     bg-black text-white ml-3">
      ROOT ADMIN
    </span>
  ) : (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold
                     bg-gray-200 text-gray-800 ml-3">
      ADMIN
    </span>
  )}
</div>

              <p className="text-gray-600">{user.department || "—"}</p>
            </div>
          </div>

          {/* Details */}
          <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User ID */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <IdCard className="w-4 h-4" />
                User ID
              </div>
              <div className="text-black">{user.userId || "—"}</div>
            </div>

            {/* Full Name */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <UserCircle className="w-4 h-4" />
                Full Name
              </div>
              <div className="text-black">{user.fullName || "—"}</div>
            </div>

            {/* Email */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4" />
                Email
              </div>
              <div className="text-black break-all">{user.email || "—"}</div>
            </div>

            {/* Department */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4" />
                Department
              </div>
              <div className="text-black">{user.department || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
