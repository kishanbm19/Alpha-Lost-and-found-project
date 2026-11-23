import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const [myItems, setMyItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ lost: 0, found: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reports"); // "reports" | "claims" | "notifications"

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [itemsData, claimsData, notifsData, lostList, foundList] = await Promise.all([
          api.items.getMy().catch(() => []),
          api.claims.getMy().catch(() => []),
          api.notifications.list().catch(() => []),
          api.items.list({ report_type: "lost", limit: 1 }).catch(() => ({ total: 0 })),
          api.items.list({ report_type: "found", limit: 1 }).catch(() => ({ total: 0 })),
        ]);

        setMyItems(itemsData || []);
        setMyClaims(claimsData || []);
        setNotifications(notifsData || []);
        setCounts({
          lost: lostList.total || 0,
          found: foundList.total || 0,
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const markNotificationRead = async (notifId) => {
    try {
      await api.notifications.markAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.warn("Failed to mark notification read:", err.message);
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  const claimStatusBadge = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };

  const itemStatusBadge = {
    open: "bg-blue-100 text-blue-800",
    under_review: "bg-amber-100 text-amber-800",
    resolved: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title={`Welcome, ${user?.full_name || "Student"}!`}
          subtitle="Manage your reported belongings, check ownership claims, and view AI matches."
        />
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-mono text-xs font-bold uppercase ${
              isAdmin ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
            }`}
          >
            {isAdmin ? "Campus Administrator" : "Student"}
          </span>
          {isAdmin && (
            <Link to="/admin/claims" className="btn-primary text-xs py-2 px-3">
              Review Pending Claims &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/browse?report_type=lost" className="card transition hover:shadow-md">
          <p className="font-mono text-xs text-brand-muted">Campus Lost Items</p>
          <p className="mt-2 font-mono text-3xl font-bold text-amber-600">
            {loading ? "..." : counts.lost}
          </p>
          <p className="mt-1 text-xs text-brand-muted">Currently active</p>
        </Link>

        <Link to="/browse?report_type=found" className="card transition hover:shadow-md">
          <p className="font-mono text-xs text-brand-muted">Campus Found Items</p>
          <p className="mt-2 font-mono text-3xl font-bold text-emerald-600">
            {loading ? "..." : counts.found}
          </p>
          <p className="mt-1 text-xs text-brand-muted">Awaiting claim</p>
        </Link>

        <div className="card">
          <p className="font-mono text-xs text-brand-muted">My Submitted Reports</p>
          <p className="mt-2 font-mono text-3xl font-bold text-brand">
            {loading ? "..." : myItems.length}
          </p>
          <p className="mt-1 text-xs text-brand-muted">Lost &amp; found items</p>
        </div>

        <div className="card">
          <p className="font-mono text-xs text-brand-muted">My Ownership Claims</p>
          <p className="mt-2 font-mono text-3xl font-bold text-purple-600">
            {loading ? "..." : myClaims.length}
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            {myClaims.filter((c) => c.status === "pending").length} pending review
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/report-lost" className="btn-primary">
          + Report Lost Item
        </Link>
        <Link to="/report-found" className="btn-outline">
          + Report Found Item
        </Link>
        <Link to="/browse" className="btn-outline">
          Browse All Items
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="mt-12 border-b border-slate-200">
        <nav className="flex gap-6 font-mono text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`pb-3 font-semibold transition ${
              activeTab === "reports"
                ? "border-b-2 border-brand text-brand"
                : "text-brand-muted hover:text-brand-dark"
            }`}
          >
            My Reports ({myItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("claims")}
            className={`pb-3 font-semibold transition ${
              activeTab === "claims"
                ? "border-b-2 border-brand text-brand"
                : "text-brand-muted hover:text-brand-dark"
            }`}
          >
            My Claims ({myClaims.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 pb-3 font-semibold transition ${
              activeTab === "notifications"
                ? "border-b-2 border-brand text-brand"
                : "text-brand-muted hover:text-brand-dark"
            }`}
          >
            Notifications
            {unreadNotifsCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.2 text-[10px] text-white font-bold">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div>
            {loading ? (
              <p className="font-mono text-xs text-brand-muted py-6">Loading reports...</p>
            ) : myItems.length === 0 ? (
              <div className="card py-10 text-center">
                <p className="text-sm font-semibold">You have not submitted any reports yet.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link to="/report-lost" className="btn-primary text-xs">
                    Report Lost Item
                  </Link>
                  <Link to="/report-found" className="btn-outline text-xs">
                    Report Found Item
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myItems.map((item) => (
                  <div key={item.id} className="card flex flex-col justify-between p-5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            item.report_type === "found"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.report_type}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                            itemStatusBadge[item.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>

                      <h4 className="mt-3 font-bold text-base line-clamp-1">{item.title}</h4>
                      <p className="mt-1 text-xs text-brand-muted line-clamp-2">
                        {item.description}
                      </p>
                      <p className="mt-3 font-mono text-[11px] text-brand-dark/70">
                        📍 {item.location} &bull; 📅 {item.event_date}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        to={`/items/${item.id}`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        AI Matches &rarr;
                      </Link>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/items/${item.id}?action=edit`}
                          className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          ✏️ Edit
                        </Link>
                        <Link
                          to={`/items/${item.id}`}
                          className="rounded bg-brand-light/50 px-2 py-1 font-mono text-[11px] font-semibold text-brand hover:bg-brand-light transition"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Claims Tab */}
        {activeTab === "claims" && (
          <div>
            {loading ? (
              <p className="font-mono text-xs text-brand-muted py-6">Loading claims...</p>
            ) : myClaims.length === 0 ? (
              <div className="card py-10 text-center">
                <p className="text-sm font-semibold">
                  You haven&apos;t claimed any found items yet.
                </p>
                <p className="mt-1 text-xs text-brand-muted">
                  If you spot your lost belonging in the Browse section, click &ldquo;Claim Ownership&rdquo;
                  to submit your proof.
                </p>
                <Link to="/browse" className="btn-primary mt-4 inline-block text-xs">
                  Browse Found Items
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myClaims.map((claim) => (
                  <div key={claim.id} className="card p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span
                          className={`inline-block rounded px-2.5 py-0.5 font-mono text-xs font-bold uppercase ${
                            claimStatusBadge[claim.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          Claim {claim.status}
                        </span>
                        {claim.item && (
                          <h4 className="mt-2 text-base font-bold text-brand-dark">
                            Item: {claim.item.title}
                          </h4>
                        )}
                      </div>
                      <span className="font-mono text-xs text-brand-muted">
                        Submitted: {new Date(claim.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
                      <p className="font-semibold text-brand-dark">My Submitted Proof Description:</p>
                      <p className="mt-1 text-brand-muted">{claim.proof_description}</p>
                    </div>

                    {claim.admin_notes && (
                      <div className="mt-3 rounded-lg border border-brand/20 bg-brand-light/30 p-3 text-xs">
                        <p className="font-semibold text-brand-dark">Administrator Remarks:</p>
                        <p className="mt-1 text-brand-dark/90">{claim.admin_notes}</p>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Link
                        to={`/items/${claim.item_id}`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        View Item Page &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div>
            {loading ? (
              <p className="font-mono text-xs text-brand-muted py-6">Loading alerts...</p>
            ) : notifications.length === 0 ? (
              <div className="card py-10 text-center">
                <p className="text-sm font-semibold">No notifications right now.</p>
                <p className="mt-1 text-xs text-brand-muted">
                  You will receive alerts here when our AI finds item matches or when staff updates your
                  claims.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`card flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center ${
                      notif.is_read ? "bg-white opacity-80" : "bg-blue-50/50 border-brand/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            notif.type.includes("match")
                              ? "bg-purple-100 text-purple-800"
                              : notif.type.includes("approved")
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {notif.type.replace("_", " ")}
                        </span>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600" />
                        )}
                        <span className="font-mono text-[11px] text-brand-muted">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-brand-dark">{notif.message}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {notif.item_id && (
                        <Link
                          to={`/items/${notif.item_id}`}
                          className="btn-outline px-3 py-1.5 text-xs"
                        >
                          View Item
                        </Link>
                      )}
                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(notif.id)}
                          className="text-xs font-mono text-brand hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
