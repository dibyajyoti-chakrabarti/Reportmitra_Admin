import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getIssueDetail,
  updateIssueStatus,
  getPresignedUpload,
  resolveIssue,
  downloadIssuePDF,
  getCurrentUser,
} from "../api";
import { Camera, ArrowLeft, Download } from "lucide-react";

const IssueDetail = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [file, setFile] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  /* -------------------------------- effects -------------------------------- */

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getIssueDetail(trackingId)
      .then((data) => mounted && setIssue(data))
      .catch(() => mounted && setError("Failed to load issue details"))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [trackingId]);

  useEffect(() => {
    if (issue?.image_presigned_url) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [issue?.image_presigned_url]);

  useEffect(() => {
    if (!showResolveModal) return;

    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => alert("Failed to load user info"));
  }, [showResolveModal]);

  useEffect(() => {
    if (!showImagePreview) return;

    const onKeyDown = (e) => e.key === "Escape" && setShowImagePreview(false);
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showImagePreview]);

  /* ----------------------------- action handlers ----------------------------- */

  const handleDownloadPDF = async () => {
    try {
      const blob = await downloadIssuePDF(issue.tracking_id);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `issue_${issue.tracking_id}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF");
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!issue || newStatus === issue.status) return;

    if (issue.status === "pending" && newStatus !== "in_progress") return;
    if (issue.status === "in_progress" && newStatus === "pending") return;
    if (issue.status === "escalated" && newStatus !== "resolved") return;

    if (newStatus === "resolved") {
      setShowResolveModal(true);
      return;
    }

    try {
      if (newStatus === "escalated") {
        await updateIssueStatus(issue.tracking_id, "escalated");
        navigate("/dashboard/issues");
        return;
      }

      const updated = await updateIssueStatus(issue.tracking_id, newStatus);
      setIssue((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleResolve = async () => {
    if (!file) {
      alert("Please upload a completion image");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setResolving(true);
    try {
      const { url, key } = await getPresignedUpload(file);

      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      await resolveIssue(issue.tracking_id, key);
      navigate("/dashboard/history");
    } catch {
      alert("Failed to resolve issue");
    } finally {
      setResolving(false);
      setShowResolveModal(false);
    }
  };

  /* --------------------------------- states --------------------------------- */

  if (loading) return <div className="text-gray-600">Loading issue…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!issue) return null;

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <div className="flex justify-center items-center h-[83vh]">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{issue.issue_title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Tracking ID:{" "}
              <span className="font-mono">{issue.tracking_id}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 text-sm px-3 py-1 border rounded hover:bg-gray-100"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm px-3 py-1 border rounded hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2 text-sm mb-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>

            <span
              className={`px-2 h-7 inline-flex items-center rounded text-xs font-medium ${
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

            {issue.status !== "resolved" && (
              <select
                disabled={showResolveModal}
                value={issue.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-7 border rounded px-2 text-xs bg-white"
              >
                <option value="pending" disabled={issue.status !== "pending"}>
                  Pending
                </option>

                <option
                  value="in_progress"
                  disabled={issue.status !== "pending"}
                >
                  In Progress
                </option>

                <option
                  value="escalated"
                  disabled={issue.status !== "in_progress"}
                >
                  Escalated
                </option>

                <option
                  value="resolved"
                  disabled={
                    !["in_progress", "escalated"].includes(issue.status)
                  }
                >
                  Resolved
                </option>
              </select>
            )}
          </div>

          <div>
            <span className="font-semibold">Department:</span>{" "}
            {issue.department}
          </div>
          <div>
            <span className="font-semibold">Location:</span> {issue.location}
          </div>
          <div>
            <span className="font-semibold">Reported On:</span>{" "}
            {new Date(issue.issue_date).toLocaleString()}
          </div>
        </div>

        {/* Description + Image */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Description</h2>

          <div className="grid grid-cols-1 md:grid-cols-[63%_35%] gap-6">
            <div className="border rounded p-4 bg-gray-50 min-h-[220px]">
              <p className="text-sm text-gray-700 whitespace-pre-line break-words">
                {issue.issue_description}
              </p>
            </div>

            <div className="border rounded bg-gray-100 min-h-[220px] flex items-center justify-center relative">
              {issue.image_presigned_url && !imageError ? (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={issue.image_presigned_url}
                    alt="Issue"
                    onClick={() => setShowImagePreview(true)}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageError(true)}
                    className="max-h-[260px] object-contain cursor-zoom-in"
                  />
                </>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">No issue image available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[420px] p-6">
              <h2 className="text-lg font-semibold mb-4">Proof of Work</h2>

              <div className="space-y-4 text-sm">
                <input
                  readOnly
                  disabled
                  value={
                    currentUser
                      ? `${currentUser.full_name} (ID: ${currentUser.userid})`
                      : ""
                  }
                  className="w-full border px-3 py-2 bg-gray-100 rounded"
                />

                <input
                  readOnly
                  disabled
                  value={new Date().toLocaleString()}
                  className="w-full border px-3 py-2 bg-gray-100 rounded"
                />

                <input
                  readOnly
                  disabled
                  value={currentUser?.department || ""}
                  className="w-full border px-3 py-2 bg-gray-100 rounded"
                />

                <input
                  id="completion-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />

                <label
                  htmlFor="completion-upload"
                  className="inline-block cursor-pointer px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100"
                >
                  Choose Image
                </label>

                {file && (
                  <div className="mt-2 text-xs text-gray-600">
                    Selected: <span className="font-medium">{file.name}</span>
                  </div>
                )}
              </div>

              {/* Image preview (separate block ABOVE buttons) */}
              {file && (
                <div className="mt-4 flex justify-center">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="max-h-40 rounded border"
                  />
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={handleResolve}
                  disabled={resolving || !file}
                  className={`px-5 py-2 rounded text-white ${
                    resolving || !file
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-black hover:bg-gray-900"
                  }`}
                >
                  {resolving ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDetail;
