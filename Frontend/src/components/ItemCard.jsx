import { Link } from "react-router-dom";

export default function ItemCard({ item, showActions = true }) {
  const isFound = item.report_type === "found";
  const formattedDate = item.event_date
    ? new Date(item.event_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const statusColors = {
    open: "bg-blue-100 text-blue-800",
    under_review: "bg-amber-100 text-amber-800",
    resolved: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="card group flex flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/items/${item.id}`} className="block">
        {/* Image Thumbnail */}
        <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-brand-muted">
              <span className="font-mono text-xs uppercase tracking-wider">
                {item.category || "No Photo"}
              </span>
            </div>
          )}

          {/* Report Type Badge */}
          <span
            className={`absolute top-3 left-3 rounded-md px-2.5 py-1 font-mono text-xs font-bold uppercase shadow-sm ${
              isFound
                ? "bg-emerald-600 text-white"
                : "bg-amber-600 text-white"
            }`}
          >
            {item.report_type}
          </span>

          {/* Status Badge */}
          {item.status && (
            <span
              className={`absolute top-3 right-3 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase shadow-sm ${
                statusColors[item.status] || "bg-slate-200 text-slate-700"
              }`}
            >
              {item.status.replace("_", " ")}
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <Link to={`/items/${item.id}`}>
          <h3 className="line-clamp-1 text-base font-bold text-brand-dark group-hover:text-brand">
            {item.title}
          </h3>
        </Link>

        <p className="mt-1.5 text-xs text-brand-muted line-clamp-2">
          {item.description}
        </p>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-brand-dark/70 font-mono">
          <span className="truncate max-w-[140px]">📍 {item.location}</span>
          <span>📅 {formattedDate}</span>
        </div>

        {/* Claim / Details Actions */}
        {showActions && (
          <div className="mt-3 flex items-center gap-2 pt-1">
            <Link
              to={`/items/${item.id}`}
              className="flex-1 rounded-md border border-slate-200 bg-white py-1.5 text-center font-mono text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              View Details
            </Link>
            {isFound && item.status === "open" && (
              <Link
                to={`/items/${item.id}?action=claim`}
                className="flex-1 rounded-md bg-brand py-1.5 text-center font-mono text-xs font-semibold text-white transition hover:bg-brand-hover shadow-sm"
              >
                Claim Item
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
