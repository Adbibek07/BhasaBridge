import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const username = localStorage.getItem("username");
  const [authState, setAuthState] = useState(username ? "checking" : "unauth");

  useEffect(() => {
    if (!username) return;

    fetch("/api/user/stats", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          // Session expired – clear stale localStorage entry
          localStorage.removeItem("username");
          localStorage.removeItem("token");
          setAuthState("unauth");
        } else {
          setAuthState("auth");
        }
      })
      .catch(() => {
        // Network error – allow access optimistically; API calls will handle 401
        setAuthState("auth");
      });
  }, [username]);

  if (authState === "checking") return null; // brief loading pause
  if (authState === "unauth") return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
