import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

export default function AdminClaims() {
  const { isAdmin } = useAuth();
  const [claims, setClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Decision Modal / Form state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [decision, setDecision] = useState("approved");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.claims.listAdmin(statusFilter);
      setClaims(data || []);
    } catch (err) {
      setError(err.message || "Failed to load claims for admin verification.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchClaims();
    }
  }, [isAdmin, fetchClaims]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-xl text-red-600">Access Restricted</h2>
        <p className="mt-2 text-sm text-brand-muted">
          Only campus administrators have permission to access the claims verification console.
        </p>
        <Link to="/dashboard" className="btn-primary mt-6">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const handleOpenDecision = (claim, defaultDecision) => {
    setSelectedClaim(claim);
    setDecision(defaultDecision);
    setAdminNotes(
      defaultDecision === "approved"
        ? "Verified secret identifiers. Item is ready for handover at Campus Security."
        : "Provided proof does not match secret identifiers."
    );
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;

    try {
      setSubmitting(true);
      await api.claims.decideAdmin(selectedClaim.id, {
        status: decision,
        admin_notes: adminNotes.trim(),
      });
      setSelectedClaim(null);
      fetchClaims();
    } catch (err) {
      alert("Failed to submit decision: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-4">
        <Link to="/dashboard" className="font-mono text-xs font-semibold text-brand hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      <PageHeader
        title="Admin Claims Verification Console"
        subtitle="Compare student ownership claims against private hidden details to authorize item returns."
      />

      {/* Filter Tabs */}
      <div className="mt-8 flex gap-3 font-mono text-xs">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-4 py-2 uppercase font-bold transition ${
              statusFilter === s
                ? "bg-brand text-white shadow-sm"
                : "bg-white text-brand-muted hover:bg-slate-100"
            }`}
          >
            {s} ({claims.length && statusFilter === s ? claims.length : s})
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 font-mono text-xs text-brand-muted">Loading claims for review...</p>
      ) : claims.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-base font-semibold">No {statusFilter} claims found.</p>
          <p className="mt-1 font-mono text-xs text-brand-muted">
            All submitted claims for this status have been handled.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {claims.map((claim) => (
            <div key={claim.id} className="card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="rounded-md bg-amber-100 px-2.5 py-1 font-mono text-xs font-bold uppercase text-amber-800">
                    Status: {claim.status}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-brand-dark">
                    Target Found Item: {claim.item_title}
                  </h3>
                  <p className="mt-1 text-xs text-brand-muted">
                    Claimant: <strong>{claim.claimant_name}</strong> ({claim.claimant_email}) &bull;{" "}
                    {new Date(claim.created_at).toLocaleString()}
                  </p>
                </div>

                {claim.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDecision(claim, "approved")}
                      className="rounded-md bg-emerald-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      ✓ Approve Claim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDecision(claim, "rejected")}
                      className="rounded-md bg-red-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-red-700"
                    >
                      ✕ Reject Claim
                    </button>
                  </div>
                )}
              </div>

              {/* Side-by-Side Comparison: Secret Clues vs Claimant Proof */}
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-900">
                    🔒 Private Hidden Details (Registered by Founder)
                  </h4>
                  <p className="mt-2 text-sm text-amber-950 font-mono whitespace-pre-wrap">
                    {claim.item_hidden_details || "(No private details were entered for this item)"}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-blue-900">
                    📝 Claimant's Proof Description
                  </h4>
                  <p className="mt-2 text-sm text-blue-950 font-mono whitespace-pre-wrap">
                    {claim.proof_description}
                  </p>
                </div>
              </div>

              {claim.admin_notes && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
                  <strong>Logged Admin Remarks:</strong> {claim.admin_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg p-6 sm:p-8">
            <h3 className="text-xl font-bold">
              {decision === "approved" ? "Approve Ownership Claim" : "Reject Ownership Claim"}
            </h3>
            <p className="mt-1 text-xs text-brand-muted">
              Item: <strong>{selectedClaim.item_title}</strong> &bull; Claimant:{" "}
              <strong>{selectedClaim.claimant_name}</strong>
            </p>

            <form onSubmit={handleDecisionSubmit} className="mt-5 space-y-4">
              <div>
                <label className="label">Decision</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="decision"
                      value="approved"
                      checked={decision === "approved"}
                      onChange={() => setDecision("approved")}
                    />
                    Approve (Marks item resolved, notifies student)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="decision"
                      value="rejected"
                      checked={decision === "rejected"}
                      onChange={() => setDecision("rejected")}
                    />
                    Reject
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="admin_notes" className="label">
                  Admin Verification Remarks / Next Steps
                </label>
                <textarea
                  id="admin_notes"
                  rows={3}
                  className="input"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Instructions for collection or rejection reason..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  disabled={submitting}
                  className="btn-outline px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 font-mono text-xs font-bold text-white rounded-md ${
                    decision === "approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submitting ? "Submitting..." : `Confirm ${decision.toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
