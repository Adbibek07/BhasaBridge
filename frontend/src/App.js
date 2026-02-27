import './App.css';
import LoginSignUp from './components/Auth/LoginSignUp';
import NavigationBar from './components/Dashboard/NavigationBar/NavigationBar';

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
      <NavigationBar />
      {/* <LoginSignUp /> */}
    </div>
  );
}

export default App;
