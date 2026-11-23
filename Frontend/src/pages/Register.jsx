import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (form.password !== form.confirm) {
      return setError("Passwords do not match.");
    }

    try {
      setLoading(true);
      setError("");
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed. Please check your details.");
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
        <h1 className="mt-4 text-center text-2xl font-bold">Create Your Account</h1>
        <p className="mt-2 text-center text-xs text-brand-muted">
          Register with your college email to report and claim lost belongings.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="full_name" className="label">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              className="input"
              placeholder="e.g. Alex Johnson"
              value={form.full_name}
              onChange={update}
              disabled={loading}
            />
          </div>

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
              Password (min. 6 chars)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input"
              placeholder="Create a secure password"
              value={form.password}
              onChange={update}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="label">
              Confirm Password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              className="input"
              placeholder="Re-enter your password"
              value={form.confirm}
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
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="mt-6 text-center font-mono text-xs">
          Already have an account?{" "}
          <Link to="/login" className="text-brand font-medium underline">
            Login Here
          </Link>
        </p>
      </form>
    </div>
  );
}
