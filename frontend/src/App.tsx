import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { Workbench } from './Workbench';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-shell">
        {/* Global Header / Navigation */}
        <header className="main-header">
          <div className="brand">
            <h1>EDI Engine Pro</h1>
          </div>
          <nav className="main-nav">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Transactions Dashboard
            </NavLink>
            <NavLink to="/workbench" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Workbench (Entry & Parsing)
            </NavLink>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workbench" element={<Workbench />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;