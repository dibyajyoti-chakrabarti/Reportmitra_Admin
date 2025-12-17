// Dashboard.jsx
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  User,
  History,
  UserPlus,
  ArrowRightCircle,
} from "lucide-react";

import ScreenBlocker from "./ScreenBlocker";
function DashboardHome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: ListChecks,
      label: "View & manage reported issues",
      route: "issues",
    },
    {
      icon: AlertTriangle,
      label: "Handle urgent problems immediately",
      route: "urgent",
    },
    {
      icon: User,
      label: "View or update your profile",
      route: "profile",
    },
    {
      icon: History,
      label: "Track issue history & workflow",
      route: "history",
    },
  ];

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-4xl text-center px-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          <LayoutDashboard className="w-12 h-12 text-zinc-700" />
          <h1 className="text-4xl font-semibold">Admin Dashboard</h1>
        </div>

        <p className="text-zinc-600 mb-8 text-base">
          Welcome — choose a task from the left navigation to begin.
        </p>

        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 shadow-sm">
          <h2 className="text-2xl font-medium mb-6 flex items-center justify-center gap-3">
            <ArrowRightCircle className="w-6 h-6 text-zinc-700" />
            Start your work
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
            {features.map((item, i) => {
              const Icon = item.icon;

              return (
                <div
                  key={i}
                  onClick={() => navigate(item.route)}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
                >
                  <Icon className="w-8 h-8 text-black mt-1" />
                  <p className="text-lg text-zinc-700 leading-snug">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardButton({ title, desc, icon: Icon, link }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(link)}
      className="w-full text-left p-5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 transition flex items-start gap-4 shadow-sm"
    >
      <Icon className="w-8 h-8 text-black" />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-zinc-600">{desc}</p>
      </div>
    </button>
  );
}

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar width and resize
  const [sidebarWidth, setSidebarWidth] = useState(300); // a bit wider
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const minWidth = 220;
      const maxWidth = 420;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

    const [user, setUser] = useState({
    userId: "",
    fullName: "",
    department: "",
    isRoot : false,
  });
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;
    // import helper and call getCurrentUser (uses fetchWithAuth, will refresh tokens if needed)
    import("../api")
      .then(({ getCurrentUser }) => {
        return getCurrentUser()
          .then((data) => {
            if (!mounted) return;
            setUser({
              userId: data.userid || "",
              fullName: data.full_name || data.userid || "",
              department: data.department || "",
              isRoot: data.is_root === 1 || data.is_root === true,
            });
          })
          .catch((err) => {
            console.error("Unable to fetch current user:", err);
            // optional: handle 401 by redirecting to login if needed
          })
          .finally(() => {
            if (mounted) setLoadingUser(false);
          });
      })
      .catch((err) => {
        console.error("Failed to load api helper:", err);
        if (mounted) setLoadingUser(false);
      });

    return () => {
      mounted = false;
    };
  }, []);


  // Added 6th nav item for symmetry
  const navItems = [
    { label: "Issue List", to: "issues" },
    { label: "Urgent Issues", to: "urgent" },
    { label: "Profile", to: "profile" },
    { label: "Issue History", to: "history" },
    // ONLY ROOT USERS
  ...(user.isRoot
    ? [{ label: "Account Creation", to: "create" }]
    : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem("rm_access");
    localStorage.removeItem("rm_refresh");
    navigate("/", { replace: true });
  };

  const activePage =
    navItems.find((item) => location.pathname.endsWith(item.to))?.label ||
    "Dashboard";

  return (
    // root: prevent page scrollbar by hiding overflow; inner areas manage overflow if needed
    <>
    <ScreenBlocker minWidth={1024} minHeight={700} allowBypass={false} />
    <div className="min-h-screen overflow-hidden bg-black text-white flex">
      {/* SIDEBAR */}
      <aside
        className="bg-zinc-950 border-r border-zinc-800 flex flex-col"
        style={{ width: sidebarWidth }}
      >
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold tracking-wide">
  {loadingUser ? "..." : user.userId || "—"}
</p>
<p className="text-sm font-semibold uppercase">
  {loadingUser ? "…" : (user.fullName || user.userId || "—")}
</p>
<p className="text-xs text-zinc-400 uppercase tracking-wide">
  {loadingUser ? "" : (user.department || "")}
</p>

            <p className="mt-3 text-[0.7rem] text-zinc-400">ReportMitra Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-base overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "block w-full px-5 py-4 border-b border-zinc-800 text-left font-semibold",
                  "hover:bg-zinc-900 transition-colors",
                  isActive ? "bg-zinc-900" : "bg-zinc-950",
                ].join(" ")
              }
              end
            >
              {item.label.toUpperCase()}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-6 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="w-full py-3 text-sm font-medium rounded-md border border-zinc-600 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 hover:border-zinc-400 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* RESIZER */}
      <div
        className="w-1 cursor-col-resize bg-zinc-800 hover:bg-zinc-600"
        onMouseDown={() => {
          isResizingRef.current = true;
        }}
      />

      {/* MAIN CONTENT: fill remaining space; no top-level scrollbar */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">ReportMitra</span>
            <span className="text-zinc-600">/</span>
            <span className="font-semibold">{activePage}</span>
          </div>
          <span className="text-xs text-zinc-500">Signed in as {loadingUser ? "..." : user.userId}</span>
        </header>

        {/* Main area: not producing page scrollbar; content centered and will scroll internally if needed */}
        <main className="flex-1 h-full bg-white text-black p-6 lg:p-8 overflow-hidden">
          {/* Inner scrollable area (only if inner content overflows) */}
          <div className="h-full overflow-auto flex justify-center">
  <div className="w-full max-w-7xl">
           {location.pathname === "/dashboard" ? (
              <DashboardHome />
            ) : location.pathname.endsWith("/create") && !user.isRoot ? (
              <div className="h-full flex items-center justify-center text-black">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                  <p className="text-gray-600">
                    You do not have permission to access this page.
                  </p>
                </div>
              </div>
            ) : (
              <Outlet context={{ user }} />
            )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
}

export default Dashboard;
