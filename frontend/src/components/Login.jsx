// Login.jsx
import { useState } from "react";
import logoIcon from "../assets/logo-1.png";
import logoText from "../assets/logo-2.png";

function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ userId, password });
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-sm sm:max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl px-5 py-6 sm:px-8 sm:py-8">
        
        {/*LOGO COMBO*/}
        <div className="flex flex-col items-center mb-6 sm:mb-8 space-y-3">
          <div className="flex items-center gap-2 sm:gap-3 bg-black p-2 border border-zinc-600 rounded-lg">
            <img src={logoIcon} alt="ReportMitra" className="h-12 sm:h-16 object-contain" />
            <img src={logoText} alt="ReportMitra" className="h-7 sm:h-10 object-contain" />
          </div>
          <p className="text-[0.65rem] sm:text-xs tracking-[0.25em] uppercase text-zinc-400">
            Admin Login
          </p>
        </div>

        {/*FORM*/}
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="userId" className="block text-sm sm:text-base font-medium text-zinc-200">
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg bg-black/60 border border-zinc-600 px-3 py-2 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
              placeholder="Enter your admin ID"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="password" className="block text-sm sm:text-base font-medium text-zinc-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-black/60 border border-zinc-600 px-3 py-2 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[0.7rem] sm:text-xs">
            <span className="text-zinc-500 text-center sm:text-left">
              ReportMitra Admin Panel
            </span>
            <button type="button" className="text-white hover:underline underline-offset-4 text-center sm:text-right">
              Forgot password?
            </button>
          </div>

          {/* 🔐 LOGIN BUTTON */}
          <button
            type="submit"
            className="w-full mt-1 rounded-lg bg-white text-black font-semibold text-sm sm:text-base py-2.5 tracking-wide shadow-lg hover:bg-zinc-200 transition-colors"
          >
            Login
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;
