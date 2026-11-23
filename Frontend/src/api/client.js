const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "alf_access_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = { ...options.headers };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Do not set Content-Type for FormData; browser sets it with boundary
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new Error(
      `Cannot connect to backend server at ${API_BASE_URL}. Please ensure the FastAPI backend is running (run: uvicorn app.main:app --port 8000).`
    );
  }

  if (!response.ok) {
    let errorDetail = "An error occurred";
    try {
      const data = await response.json();
      if (typeof data.detail === "string") {
        errorDetail = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorDetail = data.detail.map((d) => d.msg || `${d.loc?.join(".")}: ${d.msg}`).join("; ");
      } else if (data.message) {
        errorDetail = data.message;
      }
    } catch {
      errorDetail = `Request failed with status ${response.status} (${response.statusText})`;
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Authentication
  auth: {
    register: (payload) =>
      request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    login: (payload) =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getMe: () => request("/auth/me"),
  },

  // Lost & Found Items
  items: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.report_type) query.append("report_type", params.report_type);
      if (params.category) query.append("category", params.category);
      if (params.location) query.append("location", params.location);
      if (params.status) query.append("status", params.status);
      if (params.q) query.append("q", params.q);
      if (params.page) query.append("page", params.page);
      if (params.limit) query.append("limit", params.limit);
      const qs = query.toString();
      return request(`/items${qs ? `?${qs}` : ""}`);
    },
    get: (id) => request(`/items/${id}`),
    getMy: () => request("/items/my"),
    create: (formData) =>
      request("/items", {
        method: "POST",
        body: formData,
      }),
    getMatches: (id) => request(`/items/${id}/matches`),
    update: (id, payload) =>
      request(`/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id) =>
      request(`/items/${id}`, {
        method: "DELETE",
      }),
    dismissMatch: (itemId, matchId) =>
      request(`/items/${itemId}/matches/${matchId}/dismiss`, {
        method: "PATCH",
      }),
  },

  // Claims
  claims: {
    create: (payload) =>
      request("/claims", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getMy: () => request("/claims/my"),
    listAdmin: (status = "pending") =>
      request(`/admin/claims?status_filter=${encodeURIComponent(status)}`),
    decideAdmin: (claimId, payload) =>
      request(`/admin/claims/${claimId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },

  // Notifications
  notifications: {
    list: () => request("/notifications"),
    markAsRead: (id) =>
      request(`/notifications/${id}/read`, {
        method: "PATCH",
      }),
  },
};
