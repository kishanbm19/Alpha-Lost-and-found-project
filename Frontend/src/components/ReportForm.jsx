import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, CAMPUS_LOCATIONS } from "../data/items.js";
import { api } from "../api/client.js";

/**
 * Report Lost or Found item form strictly matching the Backend API Specification:
 * - report_type ("lost" | "found")
 * - title (string, 2-120 chars)
 * - description (string, min 5 chars)
 * - category (CategoryEnum)
 * - location (string, 2-100 chars)
 * - event_date (YYYY-MM-DD)
 * - hidden_details (string, private verification clues)
 * - image (File, required for found, optional for lost)
 */
export default function ReportForm({ type }) {
  const isLost = type === "lost";
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    location: CAMPUS_LOCATIONS[0],
    customLocation: "",
    event_date: today,
    description: "",
    hidden_details: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image file size must be less than 10MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!isLost && !imageFile) {
      setError("An image upload is required when reporting a found item.");
      return;
    }

    const effectiveLocation =
      form.location === "Other" && form.customLocation.trim()
        ? form.customLocation.trim()
        : form.location;

    if (!effectiveLocation || effectiveLocation.length < 2) {
      setError("Please specify a valid campus location.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("report_type", isLost ? "lost" : "found");
      formData.append("title", form.title.trim());
      formData.append("category", form.category);
      formData.append("location", effectiveLocation);
      formData.append("event_date", form.event_date);
      formData.append("description", form.description.trim());

      if (form.hidden_details?.trim()) {
        formData.append("hidden_details", form.hidden_details.trim());
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const createdItem = await api.items.create(formData);
      navigate(`/items/${createdItem.id}`);
    } catch (err) {
      setError(err.message || "Failed to submit item report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl">
      <div className="card space-y-6 p-6 sm:p-8">
        <div>
          <span
            className={`inline-block rounded-full px-3 py-1 font-mono text-xs font-bold uppercase ${
              isLost
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {isLost ? "Reporting Lost Item" : "Reporting Found Item"}
          </span>
          <h2 className="mt-3 text-xl font-bold">
            {isLost ? "Describe What You Lost" : "Describe What You Found"}
          </h2>
          <p className="mt-1 text-xs text-brand-muted">
            Provide clear details. Our AI matching system will automatically compare
            descriptions and images to detect candidate matches.
          </p>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="label">
            Item Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={2}
            maxLength={120}
            className="input"
            placeholder="e.g., Black Dell XPS Laptop Bag, Casio Scientific Calculator"
            value={form.title}
            onChange={update}
            disabled={loading}
          />
        </div>

        {/* Category & Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="label">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              className="input"
              value={form.category}
              onChange={update}
              disabled={loading}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="label">
              Campus Location <span className="text-red-500">*</span>
            </label>
            <select
              id="location"
              name="location"
              className="input"
              value={form.location}
              onChange={update}
              disabled={loading}
            >
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.location === "Other" && (
          <div>
            <label htmlFor="customLocation" className="label">
              Specific Location Details <span className="text-red-500">*</span>
            </label>
            <input
              id="customLocation"
              name="customLocation"
              type="text"
              required
              className="input"
              placeholder="e.g., Chemistry Lab 3rd floor bench"
              value={form.customLocation}
              onChange={update}
              disabled={loading}
            />
          </div>
        )}

        {/* Date Lost/Found */}
        <div>
          <label htmlFor="event_date" className="label">
            Date {isLost ? "Lost" : "Found"} <span className="text-red-500">*</span>
          </label>
          <input
            id="event_date"
            name="event_date"
            type="date"
            required
            max={today}
            className="input"
            value={form.event_date}
            onChange={update}
            disabled={loading}
          />
        </div>

        {/* Public Description */}
        <div>
          <label htmlFor="description" className="label">
            Public Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={5}
            rows={4}
            className="input"
            placeholder={`Describe the item's brand, color, general condition, and surrounding circumstances...`}
            value={form.description}
            onChange={update}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-brand-muted">
            This description is visible to everyone and used to generate AI embeddings.
          </p>
        </div>

        {/* Hidden Details (Private verification clues) */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <label htmlFor="hidden_details" className="label flex items-center justify-between">
            <span>
              Private Verification Details{" "}
              <span className="font-mono text-xs font-normal text-brand-muted">
                (Hidden from public)
              </span>
            </span>
          </label>
          <textarea
            id="hidden_details"
            name="hidden_details"
            rows={2}
            className="input bg-white"
            placeholder="e.g., Hidden sticker inside the back flap, specific lock combination, unique scratch near the port, contents of pouch"
            value={form.hidden_details}
            onChange={update}
            disabled={loading}
          />
          <p className="mt-1.5 text-xs text-brand-muted">
            🔒 <strong>Privacy Protected:</strong> These secret clues are stripped from
            public API responses. Only system administrators can see them to verify
            claims and prevent false ownership requests.
          </p>
        </div>

        {/* Image Upload */}
        <div>
          <label className="label">
            Item Photo{" "}
            {isLost ? (
              <span className="text-xs font-normal text-brand-muted">(Optional)</span>
            ) : (
              <span className="text-red-500">* (Required for found items)</span>
            )}
          </label>

          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="h-48 w-48 rounded-xl object-cover border border-slate-200"
              />
              <button
                type="button"
                onClick={removeImage}
                disabled={loading}
                className="absolute -top-2 -right-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow hover:bg-red-700"
                title="Remove photo"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand">
              <div>
                <svg
                  className="mx-auto h-10 w-10 text-slate-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-2 text-sm text-brand-dark">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer font-medium text-brand hover:underline"
                  >
                    <span>Click to upload an image</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                      disabled={loading}
                    />
                  </label>
                  <span className="text-brand-muted"> or drag and drop</span>
                </div>
                <p className="text-xs text-brand-muted">PNG, JPG, WebP up to 10MB</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Uploading &amp; Registering Report...
            </span>
          ) : (
            `Submit ${isLost ? "Lost" : "Found"} Report`
          )}
        </button>
      </div>
    </form>
  );
}
