import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getIssueDetail } from "../api";

const IssueDetail = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssueDetail(trackingId)
      .then((data) => {
        if (!mounted) return;
        setIssue(data);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setError("Failed to load issue details");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [trackingId]);

  if (loading) {
    return (
      <div className="text-gray-600">
        Loading issue details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600">
        {error}
      </div>
    );
  }

  if (!issue) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {issue.issue_title}
          </h1>
          <p className="text-sm text-gray-500">
            Tracking ID: <span className="font-mono">{issue.tracking_id}</span>
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="text-sm px-3 py-1 border rounded hover:bg-gray-100"
        >
          ← Back
        </button>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <span className="font-semibold">Status:</span>{" "}
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

        <div>
          <span className="font-semibold">Department:</span>{" "}
          {issue.department}
        </div>

        <div>
          <span className="font-semibold">Location:</span>{" "}
          {issue.location}
        </div>

        <div>
          <span className="font-semibold">Reported On:</span>{" "}
          {new Date(issue.issue_date).toLocaleString()}
        </div>

        <div>
          <span className="font-semibold">Confidence Score:</span>{" "}
          {issue.confidence_score.toFixed(2)}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">
          Description
        </h2>
        <p className="text-gray-700 whitespace-pre-line">
          {issue.issue_description}
        </p>
      </div>

      {/* Image */}
      {issue.image_url && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            Reported Image
          </h2>
          <img
            src={issue.image_url}
            alt="Issue"
            className="max-h-[400px] rounded border"
          />
        </div>
      )}

      {/* Completion Image (future-proof) */}
      {issue.completion_url && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            Completion Proof
          </h2>
          <img
            src={issue.completion_url}
            alt="Completed"
            className="max-h-[400px] rounded border"
          />
        </div>
      )}
    </div>
  );
};

export default IssueDetail;
