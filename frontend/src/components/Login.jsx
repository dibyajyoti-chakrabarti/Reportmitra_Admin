// Login.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoIcon from "../assets/logo-1.png";
import logoText from "../assets/logo-2.png";
import ScreenBlocker from "./ScreenBlocker"; // <- use the shared component

/**
 * Login: posts { userid, password } to /api/token/
 * On success: saves access/refresh in localStorage and navigates to /dashboard
 *
 * Low-res/mobile blocking is handled by ScreenBlocker (minWidth = 900).
 */

const MIN_WIDTH = 1024; // same threshold used across the app

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in, go to dashboard
  useEffect(() => {
    const access = localStorage.getItem("rm_access");
    if (access) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: userId, password }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("token endpoint response:", res.status, data);

      if (!res.ok) {
        const msg =
          data.detail ||
          data.non_field_errors?.[0] ||
          data.userid?.[0] ||
          data.password?.[0] ||
          JSON.stringify(data);
        setError(msg || "Login failed");
        setLoading(false);
        return;
      }

      if (data.access && data.refresh) {
        localStorage.setItem("rm_access", data.access);
        localStorage.setItem("rm_refresh", data.refresh);
        navigate("/dashboard", { replace: true });
        return;
      }

      if (data.refresh && !data.access) {
        console.log("Received only refresh; requesting access via /api/token/refresh/");
        const r = await fetch("/api/token/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: data.refresh }),
        });
        const rdata = await r.json().catch(() => ({}));
        console.log("refresh response:", r.status, rdata);

        if (!r.ok || !rdata.access) {
          setError(rdata.detail || "Failed to obtain access token");
          setLoading(false);
          return;
        }

        localStorage.setItem("rm_access", rdata.access);
        localStorage.setItem("rm_refresh", rdata.refresh || data.refresh);
        navigate("/dashboard", { replace: true });
        return;
      }

      setError("Unexpected token response: " + JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Global screen blocker for small/low-res devices */}
      <ScreenBlocker minWidth={MIN_WIDTH} minHeight={700} allowBypass={false} />

      {/* Normal login UI */}
      <div className="min-h-screen w-full bg-black flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-sm sm:max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col items-center mb-6 sm:mb-8 space-y-3">
            <div className="flex items-center gap-2 sm:gap-3 bg-black p-2 border border-zinc-600 rounded-lg">
              <img src={logoIcon} alt="logo" className="h-12 sm:h-16 object-contain" />
              <img src={logoText} alt="text" className="h-7 sm:h-10 object-contain" />
            </div>
            <p className="text-[0.65rem] sm:text-xs tracking-[0.25em] uppercase text-zinc-400">
              Admin Login
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="userid" className="block text-sm font-medium text-zinc-200">User ID</label>
              <input
                id="userid"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-lg bg-black/60 border border-zinc-600 px-3 py-2 text-white"
                placeholder="abc123"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-200">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-black/60 border border-zinc-600 px-3 py-2 text-white"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 rounded-lg bg-white text-black font-semibold py-2"
            >
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
