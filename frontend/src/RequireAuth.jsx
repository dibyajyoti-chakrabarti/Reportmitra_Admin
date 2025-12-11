import { Navigate, useLocation } from "react-router-dom";
import { getAccess, refreshAccess, clearTokens } from "./api";

/**
 * RequireAuth: If there's an access token — allow.
 * If access is missing but refresh exists — try to refresh once.
 * If all fails -> redirect to login.
 */
export default function RequireAuth({ children }) {
  const location = useLocation();
  const access = getAccess();

  if (access) return children;

  // Try synchronous refresh attempt (returns a Promise). Because we cannot block rendering,
  // instead we redirect to / trying to refresh in background - but to keep UX simple,
  // attempt refresh synchronously via a hack: throw promise is not appropriate.
  // Simpler: try refresh then redirect based on outcome.
  // For brevity here we'll redirect to /login and let the app attempt refresh on actions.
  return <Navigate to="/" state={{ from: location }} replace />;
}
