import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  // Check if username exists in localStorage
  const username = localStorage.getItem("username");

  // If username exists, allow access to the component
  if (username) {
    return children;
  }

  // If no username, redirect to login page
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
