import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getIssueDetail,
  updateIssueStatus,
  getPresignedUpload,
  resolveIssue,
} from "../api";

const IssueDetail = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // NEW (minimal additions)
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [file, setFile] = useState(null);
  const [resolving, setResolving] = useState(false);

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

  const handleStatusChange = async (newStatus) => {
    if (newStatus === issue.status) return;

    // RESOLVED → open modal
    if (newStatus === "resolved") {
      setShowResolveModal(true);
      return;
    }

    try {
      await updateIssueStatus(issue.tracking_id, newStatus);
      setIssue({ ...issue, status: newStatus });
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleResolve = async () => {
    if (!file) {
      alert("Please upload an image");
      return;
    }

    setResolving(true);
    try {
      // 1. Get presigned URL
      const { url, key } = await getPresignedUpload(file);

      // 2. Upload to S3
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Mark issue resolved in backend
      await resolveIssue(issue.tracking_id, key);

      // 4. Redirect to history
      navigate("/dashboard/history");
    } catch (err) {
      console.error(err);
      alert("Failed to resolve issue");
    } finally {
      setResolving(false);
      setShowResolveModal(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading issue details…</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!issue) return null;

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{issue.issue_title}</h1>
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
        <div className="flex items-center gap-3">
          <span className="font-semibold">Status:</span>

          {/* Status badge */}
          <span
            className={`px-2 py-1 rounded text-xs ${
              issue.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : issue.status === "in_progress"
                ? "bg-blue-100 text-blue-800"
                : issue.status === "escalated"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {issue.status.replace("_", " ")}
          </span>

          {/* Status dropdown */}
          {issue.status !== "resolved" && (
            <select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          )}
        </div>
        <div>
          <span className="font-semibold">Department:</span> {issue.department}
        </div>

        <div>
          <span className="font-semibold">Location:</span> {issue.location}
        </div>

        <div>
          <span className="font-semibold">Reported On:</span>{" "}
          {new Date(issue.issue_date).toLocaleString()}
        </div>

      </div>

      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Description</h2>
        <p className="text-gray-700 whitespace-pre-line">
          {issue.issue_description}
        </p>
      </div>

      

      {/* Completion Image */}
      {issue.completion_url && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Completion Proof</h2>
          <img
            src={issue.completion_url}
            alt="Completed"
            className="max-h-[400px] rounded border"
          />
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-lg font-semibold mb-4">
              Upload Completion Image
            </h2>

            <div className="space-y-3">
              {/* Hidden file input */}
              <input
                id="completion-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />

              {/* Visible button */}
              <label
                htmlFor="completion-upload"
                className="inline-block cursor-pointer px-4 py-2 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-sm"
              >
                Choose Completion Image
              </label>

              {/* Selected file name */}
              {file && (
                <div className="text-sm text-gray-600">
                  Selected: <span className="font-medium">{file.name}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                disabled={resolving}
                onClick={handleResolve}
                className="px-4 py-1 bg-black text-white rounded"
              >
                {resolving ? "Resolving…" : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetail;
