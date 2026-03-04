import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginSignUp from './components/Auth/LoginSignUp';
import NavigationBar from './components/NavigationBar/NavigationBar';
import Dashboard from './components/Dashboard/Dashboard';
import Lessons from './components/Lessons/Lessons';
import Quiz from './components/Quiz/Quiz';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div>
      {!isLoginPage && <NavigationBar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} /> {/* 👈 Add this */}
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
        <Route path="*" element={<Navigate to="/login" replace />} /> {/* 👈 Catch all */}
      </Routes>
    </div>
  );
}

export default App;