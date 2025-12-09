// Dashboard.jsx
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { MonitorX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(280); // default width (px)
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const minWidth = 220;
      const maxWidth = 420;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, e.clientX)
      );
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

  const user = {
    userId: "EMP-1023",
    fullName: "Jane Doe",
    department: "Public Works",
  };

  const navItems = [
    { label: "Issue List", to: "issues" },
    { label: "Urgent Issues", to: "urgent" },
    { label: "Profile", to: "profile" },
    { label: "Issue History", to: "history" },
    { label: "Account Creation", to: "create" },
  ];

  const handleLogout = () => {
    // TODO: clear auth, tokens, etc.
    navigate("/");
  };

  const activePage =
    navItems.find((item) => location.pathname.endsWith(item.to))?.label ||
    "Dashboard";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ❌ BLOCK MOBILE / SMALL SCREENS */}
      <div className="md:hidden min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
          <MonitorX className="w-12 h-12" />
          <h1 className="text-lg font-semibold">Screen Size Not Supported</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            ReportMitra Admin Console is optimised for tablet and desktop
            devices. Please switch to a larger screen or resize your window to
            continue.
          </p>
        </div>
      </div>

      {/* ✅ MAIN LAYOUT (TABLET+ ONLY) */}
      <div className="hidden md:flex min-h-screen bg-black text-white">
        {/* SIDEBAR (RESIZABLE) */}
        <aside
          className="bg-zinc-950 border-r border-zinc-800 flex flex-col"
          style={{ width: sidebarWidth }}
        >
          {/* Header text (no avatar now) */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-wide">
                {user.userId}
              </p>
              <p className="text-sm font-semibold uppercase">
                {user.fullName}
              </p>
              <p className="text-xs text-zinc-400 uppercase tracking-wide">
                {user.department}
              </p>
              <p className="mt-3 text-[0.7rem] text-zinc-400">
                ReportMitra Admin Panel
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "block w-full px-4 py-3 border-b border-zinc-800 text-left font-semibold tracking-wide",
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

          {/* Logout */}
          <div className="px-6 py-6 border-t border-zinc-800">
            <button
              onClick={handleLogout}
              className="w-full py-2 text-sm font-medium rounded-md border border-zinc-600 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 hover:border-zinc-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* RESIZER HANDLE */}
        <div
          className="w-[3px] cursor-col-resize bg-zinc-800 hover:bg-zinc-600 transition-colors"
          onMouseDown={() => {
            isResizingRef.current = true;
          }}
        />

        {/* MAIN CONTENT (WHITE OUTLET AREA) */}
        <div className="flex-1 flex flex-col bg-black">
          {/* Top bar */}
          <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">ReportMitra</span>
              <span className="text-zinc-600">/</span>
              <span className="font-semibold">{activePage}</span>
            </div>
            <span className="text-xs text-zinc-500">
              Signed in as {user.userId}
            </span>
          </header>

          {/* 🔳 Outlet – always white and auto-resizing with sidebar */}
          <main className="flex-1 overflow-y-auto bg-white text-black p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
