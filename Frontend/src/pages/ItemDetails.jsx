import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { CATEGORIES, CAMPUS_LOCATIONS } from "../data/items.js";
import { api } from "../api/client.js";

export default function ItemDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Claim State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [proofDescription, setProofDescription] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState("");
  const [claimError, setClaimError] = useState("");

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    location: "",
    event_date: "",
    description: "",
    status: "open",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Check URL query params to auto-open claim or edit modal
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "claim") {
      setShowClaimModal(true);
    } else if (action === "edit") {
      setShowEditModal(true);
    }
  }, [searchParams]);

  const isReporter = user && item && user.id === item.reporter_id;
  const canModify = isReporter || isAdmin;
  const isFound = item?.report_type === "found";

  const fetchItemAndMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const itemData = await api.items.get(id);
      setItem(itemData);

      // Populate edit form initial values
      setEditForm({
        title: itemData.title,
        category: itemData.category,
        location: itemData.location,
        event_date: itemData.event_date,
        description: itemData.description,
        status: itemData.status,
      });

      // If user is reporter or admin, fetch AI matches
      if (user && (itemData.reporter_id === user.id || user.role === "admin")) {
        try {
          const matchData = await api.items.getMatches(id);
          setMatches(matchData || []);
        } catch (matchErr) {
          console.warn("Could not fetch matches:", matchErr.message);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load item details.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchItemAndMatches();
  }, [fetchItemAndMatches]);

  // Handle Ownership Claim Submission
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!proofDescription || proofDescription.trim().length < 10) {
      setClaimError("Please provide at least 10 characters describing your proof of ownership.");
      return;
    }

    try {
      setClaimLoading(true);
      setClaimError("");
      await api.claims.create({
        item_id: item.id,
        proof_description: proofDescription.trim(),
      });
      setClaimSuccess("Your ownership claim has been submitted! Campus administrators will verify your proof against the item's secret identifiers.");
      setShowClaimModal(false);
      setProofDescription("");
      fetchItemAndMatches();
    } catch (err) {
      setClaimError(err.message || "Failed to submit ownership claim.");
    } finally {
      setClaimLoading(false);
    }
  };

  // Handle Edit Report Submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || editForm.title.trim().length < 2) {
      setEditError("Title must be at least 2 characters.");
      return;
    }
    if (!editForm.description.trim() || editForm.description.trim().length < 5) {
      setEditError("Description must be at least 5 characters.");
      return;
    }

    try {
      setEditLoading(true);
      setEditError("");
      const updated = await api.items.update(item.id, editForm);
      setItem(updated);
      setShowEditModal(false);
      fetchItemAndMatches();
    } catch (err) {
      setEditError(err.message || "Failed to update item report.");
    } finally {
      setEditLoading(false);
    }
  };

  // Quick toggle status between open and resolved
  const handleToggleResolved = async () => {
    const nextStatus = item.status === "resolved" ? "open" : "resolved";
    const confirmMsg = nextStatus === "resolved"
      ? "Mark this report as RESOLVED (handed over / recovered)? It will be marked closed."
      : "Reopen this item report?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const updated = await api.items.update(item.id, { status: nextStatus });
      setItem(updated);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  // Handle Delete Report
  const handleDeleteReport = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.items.delete(item.id);
      alert("Report deleted successfully.");
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to delete report: " + err.message);
    }
  };

  // Dismiss Candidate AI Match
  const handleDismissMatch = async (matchId) => {
    try {
      await api.items.dismissMatch(item.id, matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (err) {
      alert("Failed to dismiss match: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-4 font-mono text-sm text-brand-muted">Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="card text-center p-10">
          <h2 className="text-xl text-red-600">Item Not Found</h2>
          <p className="mt-3 text-sm text-brand-muted">
            {error || "This item could not be found or has been removed."}
          </p>
          <Link to="/browse" className="btn-primary mt-6">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = item.event_date
    ? new Date(item.event_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const statusColors = {
    open: "bg-blue-100 text-blue-800",
    under_review: "bg-amber-100 text-amber-800",
    resolved: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/browse" className="font-mono text-xs font-semibold text-brand hover:underline">
          &larr; Back to Items Directory
        </Link>

        {/* Edit & Manage Options for Owner/Admin */}
        {canModify && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="btn-outline py-1 px-3 text-xs flex items-center gap-1 font-semibold"
            >
              ✏️ Edit Report
            </button>
            <button
              type="button"
              onClick={handleToggleResolved}
              className="rounded-md border border-slate-300 bg-white py-1 px-3 text-xs font-mono text-slate-700 hover:bg-slate-50"
            >
              {item.status === "resolved" ? "Reopen Item" : "✓ Mark Resolved"}
            </button>
            <button
              type="button"
              onClick={handleDeleteReport}
              className="rounded-md border border-red-200 bg-red-50 py-1 px-2.5 text-xs font-mono text-red-600 hover:bg-red-100"
              title="Delete report"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      <PageHeader
        title={item.title}
        subtitle={`${item.report_type === "found" ? "Found" : "Lost"} in ${item.location} on ${formattedDate}`}
      />

      {/* Claim Success Banner */}
      {claimSuccess && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <span className="text-lg">✓</span>
          <span>{claimSuccess}</span>
        </div>
      )}

      {/* Prominent Claim Ownership Action Bar for Found Items */}
      {isFound && (
        <div className="mb-8 rounded-2xl border border-brand/30 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-md bg-emerald-600 px-2.5 py-0.5 font-mono text-xs font-bold text-white uppercase">
                  Found Item
                </span>
                <span className="font-mono text-xs text-brand-muted">
                  Status: <strong>{item.status.replace("_", " ")}</strong>
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-brand-dark">
                Are you the rightful owner of this item?
              </h3>
              <p className="mt-1 text-xs text-brand-muted max-w-xl">
                Submit an ownership claim with secret marks, serial numbers, or contents. Once campus staff verifies your proof, you can collect your item.
              </p>
            </div>

            <div className="shrink-0">
              {item.status === "resolved" ? (
                <span className="inline-block rounded-lg bg-emerald-100 px-4 py-2 font-mono text-xs font-bold text-emerald-800">
                  ✓ Returned to Owner
                </span>
              ) : isReporter ? (
                <div className="rounded-lg bg-slate-100 px-4 py-2 text-center font-mono text-xs text-slate-600">
                  You reported this found item
                </div>
              ) : user ? (
                <button
                  type="button"
                  onClick={() => setShowClaimModal(true)}
                  className="btn-primary px-6 py-2.5 text-sm font-bold shadow-md hover:shadow-lg"
                >
                  📝 Submit Ownership Claim
                </button>
              ) : (
                <Link to="/login" className="btn-primary px-6 py-2.5 text-sm font-bold">
                  Login to Claim Item
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        {/* Left Column: Image & Details */}
        <div className="space-y-6">
          <div className="card overflow-hidden p-0">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="max-h-96 w-full object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-slate-100 text-slate-400">
                <span className="font-mono text-sm uppercase">No Image Uploaded</span>
              </div>
            )}

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold uppercase ${
                    isFound ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                  }`}
                >
                  {item.report_type}
                </span>

                <span
                  className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold uppercase ${
                    statusColors[item.status] || "bg-slate-200 text-slate-700"
                  }`}
                >
                  Status: {item.status.replace("_", " ")}
                </span>

                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-brand-dark">
                  Category: {item.category}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-sm uppercase tracking-wider text-brand-muted font-mono">
                  Description
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dark whitespace-pre-line">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <dl className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <dt className="text-brand-muted">Campus Zone</dt>
                    <dd className="mt-1 font-bold text-brand-dark">{item.location}</dd>
                  </div>
                  <div>
                    <dt className="text-brand-muted">Date of Incident</dt>
                    <dd className="mt-1 font-bold text-brand-dark">{formattedDate}</dd>
                  </div>
                </dl>
              </div>

              {/* Privacy protection notice */}
              <div className="mt-6 rounded-lg bg-slate-50 p-3.5 text-xs text-brand-muted">
                🛡️ <strong>Private Clues Guarded:</strong> Verification details (unique scratches,
                contents, lock combinations, or stickers) are securely stored and hidden from public
                view to prevent false ownership claims.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & AI Matches */}
        <div className="space-y-6">
          {/* Quick Item Management Actions (For Owner or Admin) */}
          {canModify && (
            <div className="card border-slate-200 p-5 bg-slate-50/50">
              <h4 className="text-sm font-bold text-brand-dark font-mono uppercase tracking-wider">
                Manage This Report
              </h4>
              <p className="mt-1 text-xs text-brand-muted">
                You can update the item details or mark it as resolved once recovered.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="btn-primary text-xs py-2 px-3.5 font-semibold"
                >
                  ✏️ Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleToggleResolved}
                  className="btn-outline text-xs py-2 px-3.5 font-semibold"
                >
                  {item.status === "resolved" ? "Reopen Report" : "✓ Mark as Resolved"}
                </button>
              </div>
            </div>
          )}

          {/* AI Candidate Matches Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-brand-dark">
                🤖 AI Candidate Matches
              </h3>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-brand">
                {matches.length} found
              </span>
            </div>

            <p className="mt-2 text-xs text-brand-muted">
              Semantic text embeddings (MiniLM 384-dim) and CLIP visual vectors compare this report
              against opposite {isFound ? "lost" : "found"} items.
            </p>

            {matches.length === 0 ? (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-center font-mono text-xs text-brand-muted">
                No candidate matches above threshold detected yet. You will receive an in-app alert when a counterpart item is reported.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {matches.map((m) => {
                  const matchItem = isFound ? m.lost_item : m.found_item;
                  const scorePct = Math.round(m.combined_score * 100);

                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/items/${matchItem.id}`}
                          className="font-bold text-sm text-brand hover:underline line-clamp-1"
                        >
                          {matchItem.title}
                        </Link>
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                            scorePct >= 75
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {scorePct}% Match
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-brand-muted line-clamp-2">
                        {matchItem.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-brand-muted">
                        <span>📍 {matchItem.location}</span>
                        <span>Text: {(m.text_score * 100).toFixed(0)}%</span>
                        {m.image_score !== null && (
                          <span>Image: {(m.image_score * 100).toFixed(0)}%</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                        <Link
                          to={`/items/${matchItem.id}`}
                          className="text-xs font-medium text-brand underline"
                        >
                          View Item &rarr;
                        </Link>
                        {isReporter && (
                          <button
                            type="button"
                            onClick={() => handleDismissMatch(m.id)}
                            className="text-[11px] font-mono text-slate-400 hover:text-red-600"
                          >
                            Dismiss match
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Claim Ownership Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg p-6 sm:p-8">
            <h3 className="text-xl font-bold text-brand-dark">Claim Ownership</h3>
            <p className="mt-1.5 text-xs text-brand-muted">
              Item: <strong>{item.title}</strong> &bull; Location: {item.location}
            </p>
            <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              🔍 <strong>How Verification Works:</strong> The founder logged secret clues (e.g. stickers, serial numbers, scratches, or contents). Describe specific details only the true owner would know.
            </p>

            <form onSubmit={handleClaimSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="proof_description" className="label">
                  Your Ownership Proof Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="proof_description"
                  name="proof_description"
                  required
                  minLength={10}
                  rows={4}
                  className="input"
                  placeholder="e.g., Inside the front pocket there is a red keychain, a small dent near the charging port, and my student ID card."
                  value={proofDescription}
                  onChange={(e) => setProofDescription(e.target.value)}
                  disabled={claimLoading}
                />
              </div>

              {claimError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {claimError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  disabled={claimLoading}
                  className="btn-outline px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="btn-primary px-5 py-2 text-xs font-bold"
                >
                  {claimLoading ? "Submitting Claim..." : "Submit Claim for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="card w-full max-w-xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-brand-dark">Edit Item Report</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="edit_title" className="label">
                  Item Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit_title"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  className="input"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  disabled={editLoading}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit_category" className="label">
                    Category
                  </label>
                  <select
                    id="edit_category"
                    className="input"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    disabled={editLoading}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit_location" className="label">
                    Campus Zone
                  </label>
                  <select
                    id="edit_location"
                    className="input"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    disabled={editLoading}
                  >
                    {CAMPUS_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit_event_date" className="label">
                    Date
                  </label>
                  <input
                    id="edit_event_date"
                    type="date"
                    required
                    className="input"
                    value={editForm.event_date}
                    onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                    disabled={editLoading}
                  />
                </div>

                <div>
                  <label htmlFor="edit_status" className="label">
                    Status
                  </label>
                  <select
                    id="edit_status"
                    className="input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    disabled={editLoading}
                  >
                    <option value="open">Open (Active)</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved (Returned / Closed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit_description" className="label">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="edit_description"
                  required
                  minLength={5}
                  rows={4}
                  className="input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  disabled={editLoading}
                />
              </div>

              {editError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                  className="btn-outline px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-primary px-5 py-2 text-xs font-bold"
                >
                  {editLoading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
