// Login.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoIcon from "../assets/logo-1.png";
import logoText from "../assets/logo-2.png";
import ScreenBlocker from "./ScreenBlocker";
import { log } from "@/utils/logger";
import { Lock, User, ShieldCheck } from "lucide-react";

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
      log("token endpoint response:", res.status, data);

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
        log("Received only refresh; requesting access via /api/token/refresh/");

        const r = await fetch("/api/token/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: data.refresh }),
        });

        const rdata = await r.json().catch(() => ({}));
        log("refresh response:", r.status, rdata);

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

      {/* Powerful admin login UI */}
      <div className="min-h-screen w-full bg-black flex items-center justify-center px-4 py-4">
        <div className="w-full max-w-lg">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-3 mb-3">
              <img src={logoIcon} alt="ReportMitra" className="h-14 object-contain" />
              <img src={logoText} alt="ReportMitra" className="h-9 object-contain" />
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase">
                Administrator Portal
              </span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
              Admin Login
            </h1>
            <p className="text-sm text-gray-600 mb-6 font-medium">
              Enter your credentials to access the admin dashboard
            </p>

            <form onSubmit={submit} className="space-y-5">
              {/* User ID Field */}
              <div>
                <label 
                  htmlFor="userid" 
                  className="block text-xs font-bold text-gray-800 mb-2 uppercase tracking-wide"
                >
                  User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="userid"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm border-2 border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-black focus:border-black
                             transition duration-200 text-gray-900 placeholder-gray-400
                             font-medium"
                    placeholder="Enter your user ID"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-xs font-bold text-gray-800 mb-2 uppercase tracking-wide"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm border-2 border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-black focus:border-black
                             transition duration-200 text-gray-900 placeholder-gray-400
                             font-medium"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-600 rounded-r-lg p-4">
                  <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-bold text-base py-3 px-6 rounded-lg
                         hover:bg-gray-900 active:bg-gray-800 transition duration-200 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-4 focus:ring-gray-300
                         shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <p className="text-[10px] font-semibold text-gray-500 text-center uppercase tracking-wide">
                Secure Area • All Access Attempts Are Logged
              </p>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-gray-500 text-xs font-medium mt-4 tracking-wide">
            ReportMitra Admin System v1.0
          </p>
        </div>
      </div>
    </>
  );
}