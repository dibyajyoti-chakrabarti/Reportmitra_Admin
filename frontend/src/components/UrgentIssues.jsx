import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIssues } from "../api";
import { AlertTriangle } from "lucide-react";

const UrgentIssues = () => {
  const navigate = useNavigate();

  const [urgentIssues, setUrgentIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssues("escalated")
      .then((data) => {
        if (!mounted) return;
        setUrgentIssues(data);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Failed to load urgent issues");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="text-red-600" />
        <h1 className="text-3xl font-bold text-black">
          Urgent Issues
        </h1>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 bg-gray-50 px-6 py-3 font-semibold text-sm text-gray-700 border-b">
          <div>Tracking ID</div>
          <div>Issue Title</div>
          <div>Issue Date</div>
          <div>Location</div>
          <div>Status</div>
        </div>

        {loading && (
          <div className="px-6 py-12 flex flex-col items-center">
            <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading urgent issues...</p>
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && urgentIssues.length === 0 && (
          <div className="px-6 py-4 text-gray-500 text-sm">
            No urgent issues at the moment.
          </div>
        )}

        {!loading &&
          !error &&
          urgentIssues.map((issue) => (
            <div
              key={issue.tracking_id}
              onClick={() =>
                navigate(`/dashboard/issues/${issue.tracking_id}`)
              }
              className="grid grid-cols-5 gap-4 px-6 py-4 border-b hover:bg-red-50 cursor-pointer"
            >
              <div className="font-mono text-sm">
                {issue.tracking_id}
              </div>

              <div className="font-medium">
                {issue.issue_title}
              </div>

              <div className="text-gray-600 text-sm">
                {new Date(issue.issue_date).toLocaleDateString()}
              </div>

              <div>{issue.location}</div>

              <div>
                <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                  escalated
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default UrgentIssues;