import { useEffect, useState, useCallback } from "react";
import PageHeader from "../components/PageHeader.jsx";
import ItemCard from "../components/ItemCard.jsx";
import { CATEGORIES, CAMPUS_LOCATIONS } from "../data/items.js";
import { api } from "../api/client.js";

export default function Browse() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;

  const [query, setQuery] = useState("");
  const [reportType, setReportType] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("open");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page,
        limit,
      };
      if (reportType) params.report_type = reportType;
      if (category) params.category = category;
      if (location) params.location = location;
      if (status) params.status = status;
      if (query.trim()) params.q = query.trim();

      const data = await api.items.list(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load campus items.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, reportType, category, location, status, query]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const handleResetFilters = () => {
    setQuery("");
    setReportType("");
    setCategory("");
    setLocation("");
    setStatus("open");
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        title="Browse Campus Lost &amp; Found"
        subtitle="Explore and search items reported lost or found across campus zones."
      />

      {/* Filter Toolbar */}
      <div className="card mt-6 space-y-4 p-5 sm:p-6">
        {/* Search bar & Type tabs */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
              type="search"
              className="input flex-1"
              placeholder="Search by title, keywords, or details..."
              aria-label="Search items"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0 px-5">
              Search
            </button>
          </form>

          {/* Report Type Pill Buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setReportType("");
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition ${
                reportType === ""
                  ? "bg-white text-brand shadow-sm"
                  : "text-brand-muted hover:text-brand-dark"
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => {
                setReportType("lost");
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition ${
                reportType === "lost"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-brand-muted hover:text-amber-700"
              }`}
            >
              Lost Only
            </button>
            <button
              type="button"
              onClick={() => {
                setReportType("found");
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition ${
                reportType === "found"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-brand-muted hover:text-emerald-700"
              }`}
            >
              Found Only
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">Category</label>
            <select
              className="input py-2 text-xs"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">Location</label>
            <select
              className="input py-2 text-xs"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Locations</option>
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">Status</label>
            <select
              className="input py-2 text-xs"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="open">Open (Active)</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved (Returned)</option>
              <option value="">All Statuses</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-outline w-full py-2 text-xs"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg">
          Items Directory{" "}
          <span className="font-mono text-sm font-normal text-brand-muted">
            ({total} {total === 1 ? "item" : "items"} found)
          </span>
        </h2>
        {loading && (
          <span className="font-mono text-xs text-brand animate-pulse">
            Loading campus reports...
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Items Grid */}
      {!loading && items.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="text-base font-semibold text-brand-dark">No items match your criteria.</p>
          <p className="mt-1 font-mono text-xs text-brand-muted">
            Try adjusting your search terms, changing the category, or resetting filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn-primary mt-6"
          >
            Show All Items
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3 font-mono text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="btn-outline px-4 py-2 text-xs disabled:opacity-40"
          >
            &larr; Previous
          </button>
          <span className="px-3 py-1 font-semibold text-brand-dark">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="btn-outline px-4 py-2 text-xs disabled:opacity-40"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
