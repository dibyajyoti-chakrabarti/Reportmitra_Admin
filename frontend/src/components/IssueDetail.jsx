import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getIssueDetail,
  updateIssueStatus,
  getPresignedUpload,
  resolveIssue,
} from "../api";
import { Camera, ArrowLeft } from "lucide-react";
import { Download } from "lucide-react";
import { downloadIssuePDF, getCurrentUser } from "../api";

const IssueDetail = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // NEW (minimal additions)
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [file, setFile] = useState(null);
  const [resolving, setResolving] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      const blob = await downloadIssuePDF(issue.tracking_id);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `issue_${issue.tracking_id}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF");
    }
  };

  useEffect(() => {
    if (!showResolveModal) return;

    getCurrentUser()
      .then((data) => setCurrentUser(data))
      .catch((err) => {
        console.error(err);
        alert("Failed to load user info");
      });
  }, [showResolveModal]);

  useEffect(() => {
    if (issue?.image_presigned_url) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [issue?.image_presigned_url]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowImagePreview(false);
      }
    };

    if (showImagePreview) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showImagePreview]);

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
    if (!issue || newStatus === issue.status) return;

    // 🚫 pending → only in_progress
    if (issue.status === "pending" && newStatus !== "in_progress") return;

    // 🚫 in_progress → cannot go back to pending
    if (issue.status === "in_progress" && newStatus === "pending") return;

    // 🚫 escalated → ONLY resolved allowed
    if (
      issue.status === "escalated" &&
      newStatus !== "resolved"
    ) {
      return;
    }

    // ✅ resolved flow (modal)
    if (newStatus === "resolved") {
      setShowResolveModal(true);
      return;
    }

    try {
      // ✅ escalation → update + redirect
      if (newStatus === "escalated") {
        await updateIssueStatus(issue.tracking_id, "escalated");
        navigate("/dashboard/issues");
        return;
      }

      // ✅ normal update (pending → in_progress)
      const updated = await updateIssueStatus(
        issue.tracking_id,
        newStatus
      );

      setIssue((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update status");
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
    <div className="flex justify-center items-center h-[83vh]">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow p-6 border-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {issue.issue_title}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Tracking ID:{" "}
              <span className="font-mono">{issue.tracking_id}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 text-sm px-3 py-1 border rounded hover:bg-gray-100 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
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
          className="border rounded px-3 py-2 text-sm"
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
          <span className="font-semibold">Department:</span> {issue.department}
        </div>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm px-3 py-1 border rounded hover:bg-gray-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="space-y-2 text-sm mb-6">
          {/* Status row (unchanged, stays first) */}
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>

            <span
              className={`inline-flex items-center px-2 h-7 rounded text-xs font-medium ${
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
                value={issue.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-7 border border-gray-300 rounded px-2 text-xs bg-white"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
              </select>
            )}
          </div>

          <div>
            <span className="font-semibold">Department:</span>{" "}
            <span>{issue.department}</span>
          </div>

          <div>
            <span className="font-semibold">Location:</span>{" "}
            <span>{issue.location}</span>
          </div>

          <div>
            <span className="font-semibold">Reported On:</span>{" "}
            <span>{new Date(issue.issue_date).toLocaleString()}</span>
          </div>
        </div>

        {/* Description + Issue Image */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Description</h2>

          <div className="grid grid-cols-1 md:grid-cols-[63%_35%] gap-6">
            {/* Left: Issue Description */}
            <div className="border rounded-md p-4 bg-gray-50 min-h-[220px]">
              <p className="text-gray-700 whitespace-pre-line break-words text-sm leading-relaxed">
                {issue.issue_description}
              </p>
            </div>

            {/* Right: Issue Image */}
            <div className="border rounded-md bg-gray-100 flex items-center justify-center min-h-[220px] relative">
              {issue.image_presigned_url && !imageError ? (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="h-8 w-8 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
                    </div>
                  )}

                  <img
                    src={issue.image_presigned_url}
                    alt="Issue"
                    onClick={() => setShowImagePreview(true)}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                    className={`max-h-[260px] object-contain rounded cursor-zoom-in ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">No issue image available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-[420px] p-6">
              {/* Header */}
              <h2 className="text-lg font-semibold mb-4">Proof of Work</h2>

              {/* Form body */}
              <div className="space-y-4 text-sm">
                {/* Done by */}
                <div>
                  <label className="block font-medium mb-1">Done By</label>
                  <input
                    type="text"
                    value={
                      currentUser
                        ? `${currentUser.full_name} (USER ID: ${currentUser.userid})`
                        : ""
                    }
                    readOnly
                    disabled
                    className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Completed on */}
                <div>
                  <label className="block font-medium mb-1">Completed On</label>
                  <input
                    type="text"
                    value={new Date().toLocaleString()}
                    readOnly
                    disabled
                    className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Departments */}
                <div>
                  <label className="block font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={currentUser?.department || ""}
                    readOnly
                    disabled
                    className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Image upload */}
                <div>
                  <label className="block font-medium mb-2">
                    Completion Image
                  </label>

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
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="px-5 py-2 bg-black text-white rounded text-sm"
                >
                  {resolving ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showImagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setShowImagePreview(false)}
        >
          <img
            src={issue.image_presigned_url}
            alt="Issue Fullscreen"
            className="h-[65vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default IssueDetail;
