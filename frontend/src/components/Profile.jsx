import { useOutletContext } from "react-router-dom";

export default function Profile() {
  const { user } = useOutletContext();

  // Safety guard (important during first render)
  if (!user) {
    return <div className="text-black">Loading profile...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-black"></div>

          <div>
            <h2 className="text-2xl font-bold text-black">
              {user.fullName || "—"}
            </h2>
            <p className="text-gray-600">
              {user.department || "—"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              User ID
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded border border-gray-200">
              {user.userId || "—"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded border border-gray-200">
              {user.fullName || "—"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Department
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded border border-gray-200">
              {user.department || "—"}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
