import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await login(form);
      const destination = location.state?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light px-4 py-8">
      <form onSubmit={submit} className="card w-full max-w-md p-8 sm:p-10">
        <Link to="/" className="font-mono text-sm font-bold text-brand">
          &larr; Back to Home
        </Link>
        <h1 className="mt-4 text-center font-sans text-2xl font-bold">Welcome Back!</h1>
        <p className="mt-2 text-center text-xs text-brand-muted">
          Login to manage reports, check AI matches, and submit verification claims.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">
              College Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              placeholder="alex@college.edu"
              value={form.email}
              onChange={update}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input"
              placeholder="Enter your password"
              value={form.password}
              onChange={update}
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary mt-6 w-full"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-6 text-center font-mono text-xs">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-brand font-medium underline">
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
}
