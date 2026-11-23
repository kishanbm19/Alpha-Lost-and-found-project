import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    async function checkNotifications() {
      try {
        const notifs = await api.notifications.list();
        const unread = notifs.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch {
        // non-blocking
      }
    }

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        <Link
          to={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-mono text-base font-bold text-brand-dark sm:text-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-mono text-sm">
            α
          </span>
          <span>Alpha Lost &amp; Found</span>
        </Link>

        <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "text-brand font-semibold" : "text-brand-dark hover:text-brand"
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/browse"
            className={({ isActive }) =>
              isActive ? "text-brand font-semibold" : "text-brand-dark hover:text-brand"
            }
          >
            Browse Directory
          </NavLink>

          <NavLink
            to="/report-lost"
            className={({ isActive }) =>
              isActive ? "text-brand font-semibold" : "text-brand-dark hover:text-brand"
            }
          >
            Report Lost
          </NavLink>

          <NavLink
            to="/report-found"
            className={({ isActive }) =>
              isActive ? "text-brand font-semibold" : "text-brand-dark hover:text-brand"
            }
          >
            Report Found
          </NavLink>

          {user ? (
            <div className="flex items-center gap-3 pl-2">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 font-semibold ${
                    isActive ? "text-brand" : "text-brand-dark hover:text-brand"
                  }`
                }
              >
                Dashboard
                {unreadCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-mono text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/admin/claims"
                  className={({ isActive }) =>
                    `rounded-md bg-purple-50 px-2.5 py-1 font-mono text-xs font-semibold text-purple-700 hover:bg-purple-100 ${
                      isActive ? "ring-1 ring-purple-400" : ""
                    }`
                  }
                >
                  Admin Console
                </NavLink>
              )}

              <span className="hidden font-mono text-xs text-brand-muted sm:inline">
                {user.full_name?.split(" ")[0]}
              </span>

              <button
                type="button"
                className="btn-outline py-1.5 px-3 text-xs"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-outline py-1.5 px-4 text-xs">
                Login
              </Link>
              <Link to="/register" className="btn-primary py-1.5 px-4 text-xs">
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
