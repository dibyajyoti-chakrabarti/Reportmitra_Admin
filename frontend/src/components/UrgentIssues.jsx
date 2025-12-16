import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIssues } from "../api";

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
      .catch((err) => {
        console.error(err);
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
      <h1 className="text-3xl font-bold text-black mb-6">
        Urgent Issues
      </h1>

      {loading && (
        <div className="text-gray-500 text-sm">
          Loading urgent issues…
        </div>
      )}

      {!loading && error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && urgentIssues.length === 0 && (
        <div className="text-gray-500 text-sm">
          No urgent issues at the moment.
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {urgentIssues.map((issue) => (
            <div
              key={issue.tracking_id}
              onClick={() =>
                navigate(`/dashboard/issues/${issue.tracking_id}`)
              }
              className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600 cursor-pointer hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">⚠️</span>
                    <span className="font-mono text-sm text-gray-600">
                      {issue.tracking_id}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-black mb-2">
                    {issue.issue_title}
                  </h3>

                  <p className="text-gray-600 text-sm">
                    Location: {issue.location}
                  </p>

                  <p className="text-gray-500 text-xs mt-1">
                    Reported{" "}
                    {new Date(issue.issue_date).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/issues/${issue.tracking_id}`);
                  }}
                  className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                >
                  Take Action
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default UrgentIssues;