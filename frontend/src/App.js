import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import LoginSignUp from "./components/Auth/LoginSignUp";
import NavigationBar from "./components/NavigationBar/NavigationBar";
import Dashboard from "./components/Dashboard/Dashboard";
import Lessons from "./components/Lessons/Lessons";
import Quiz from "./components/Quiz/Quiz";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./components/landing";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isNavHidden = location.pathname === "/login" || location.pathname === "/";

  return (
    <div>
      {!isNavHidden && <NavigationBar />}
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage />
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lessons"
          element={
            <ProtectedRoute>
              <Lessons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginSignUp />} />
      </Routes>
    </div>
  );
}

export default App;
