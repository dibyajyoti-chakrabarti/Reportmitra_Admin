import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIssues } from "../api";

const IssueHistory = () => {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    //  Fetch ONLY resolved issues
    getIssues("resolved")
      .then((data) => {
        if (!mounted) return;
        setHistory(data);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setError("Failed to load issue history");
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
        Issue History
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-4 gap-4 bg-gray-50 px-6 py-3 font-semibold text-sm text-gray-700 border-b">
          <div>Issue ID</div>
          <div>Title</div>
          <div>Status</div>
          <div>Resolved Date</div>
        </div>

        {loading && (
          <div className="px-6 py-4 text-gray-500 text-sm">
            Loading issue history…
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="px-6 py-4 text-gray-500 text-sm">
            No resolved issues yet.
          </div>
        )}

        {!loading &&
          !error &&
          history.map((item) => (
            <div
              key={item.tracking_id}
              onClick={() =>
                navigate(`/dashboard/issues/${item.tracking_id}`)
              }
              className="grid grid-cols-4 gap-4 px-6 py-4 border-b hover:bg-gray-50 cursor-pointer"
            >
              <div className="font-mono text-sm">
                {item.tracking_id}
              </div>

              <div>{item.issue_title}</div>

              <div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Resolved
                </span>
              </div>

              <div className="text-gray-600 text-sm">
                {new Date(item.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default IssueHistory;
