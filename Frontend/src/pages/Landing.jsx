import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function Landing() {
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await api.items.list({ report_type: "found", limit: 3 });
        setRecentItems(res.items || []);
      } catch (err) {
        console.warn("Could not load recent found items:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  return (
    <section className="bg-brand-light">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.3fr_1fr] lg:py-24">
        <div>
          <span className="inline-block rounded-full bg-brand/10 px-3.5 py-1 font-mono text-xs font-bold uppercase text-brand">
            Smart Campus Lost &amp; Found
          </span>
          <h1 className="mt-4 font-sans text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
            Lost something on campus? Find it here.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-muted">
            Powered by vector search and CLIP hybrid matching, reconnecting students with their lost
            belongings faster. Report items, track AI matches, and verify ownership securely.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/browse" className="btn-primary text-sm px-6 py-3">
              Browse Directory
            </Link>
            <Link to="/report-lost" className="btn-outline text-sm px-6 py-3">
              Report Lost Item
            </Link>
            <Link to="/report-found" className="btn-outline text-sm px-6 py-3">
              Report Found Item
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-200/80 pt-8 font-mono text-xs text-brand-muted">
            <div>
              <p className="text-xl font-bold text-brand-dark">AI-Assisted</p>
              <p className="mt-1">CLIP &amp; MiniLM Matching</p>
            </div>
            <div>
              <p className="text-xl font-bold text-brand-dark">Guarded</p>
              <p className="mt-1">Private Secret Clues</p>
            </div>
            <div>
              <p className="text-xl font-bold text-brand-dark">Instant</p>
              <p className="mt-1">In-App Match Alerts</p>
            </div>
          </div>
        </div>

        {/* Recently Found Aside */}
        <aside className="card border-slate-200 shadow-md p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-brand-dark">Recently Found Items</h2>
            <span className="font-mono text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Live
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-center font-mono text-xs text-brand-muted animate-pulse">
              Loading recent reports...
            </p>
          ) : recentItems.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-brand-muted">
              No found items reported yet. Be the first to report a found item!
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentItems.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/items/${item.id}`}
                    className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-slate-100/80"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-mono font-bold text-brand">
                        {item.category?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-brand-dark truncate">{item.title}</p>
                      <p className="font-mono text-xs text-brand-muted truncate">
                        📍 {item.location} &bull; {item.event_date}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-brand">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link to="/browse" className="btn-primary mt-6 w-full text-center">
            View All Campus Items &rarr;
          </Link>
        </aside>
      </div>
    </section>
  );
}
