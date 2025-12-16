import { useEffect, useState } from "react";
import { getIssues } from "../api";
import { useNavigate } from "react-router-dom";

const IssueList = () => {
  const [issues, setIssues] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch issues whenever status changes
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssues(statusFilter)
      .then((data) => {
        if (!mounted) return;
        setIssues(data);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setError("Failed to load issues");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [statusFilter]);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">Issue List</h1>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-5 gap-4 bg-gray-50 px-6 py-3 font-semibold text-sm text-gray-700 border-b">
          <div>Issue ID</div>
          <div>Issue Title</div>
          <div>Status</div>
          <div>Date</div>
          <div>Issue Description</div>
        </div>

        {loading && (
          <div className="px-6 py-4 text-gray-500 text-sm">
            Loading issues…
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && issues.length === 0 && (
          <div className="px-6 py-4 text-gray-500 text-sm">
            No issues found.
          </div>
        )}

        {!loading &&
          !error &&
          issues.map((issue) => (
            <div
            key={issue.tracking_id}
            onClick={() =>
              navigate(`/dashboard/issues/${issue.tracking_id}`)
            }
            className="grid grid-cols-5 gap-4 px-6 py-4 border-b hover:bg-gray-50 cursor-pointer"
            >
              <div className="font-mono text-sm">
                {issue.tracking_id}
              </div>

              <div>{issue.issue_title}</div>

              <div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    issue.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : issue.status === "in_progress"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {issue.status.replace("_", " ")}
                </span>
              </div>
              <div className="text-gray-600 text-sm">
                {new Date(issue.issue_date).toLocaleDateString()}
              </div>
              
              <div>
                  {issue.issue_description}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default IssueList;