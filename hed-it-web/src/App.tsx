import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Calculator from './pages/Calculator';
import Services from './pages/Services';
import Support from './pages/Support';
import References from './pages/References';
import Contact from './pages/Contact';
import Legal from './pages/Legal';
import Configurator from './pages/Configurator';
import Login from './pages/Login';
import PortalLayout from './pages/portal/PortalLayout';
import Dashboard from './pages/portal/Dashboard';
import Contracts from './pages/portal/Contracts';
import Tickets from './pages/portal/Tickets';
import Invoices from './pages/portal/Invoices';
import Settings from './pages/portal/Settings';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from './context/AuthContext';




// --- Scroll to Top on Page Change ---
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="app-wrapper">
          <Navbar theme={theme} toggleTheme={toggleTheme} />
          <main style={{ minHeight: '80vh' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/configurator" element={<Configurator />} />
              <Route path="/services" element={<Services />} />
              <Route path="/login" element={<Login />} />

              {/* Portal Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<Dashboard />} />
                  <Route path="/portal/contracts" element={<Contracts />} />
                  <Route path="/portal/tickets" element={<Tickets />} />
                  <Route path="/portal/invoices" element={<Invoices />} />
                  <Route path="/portal/settings" element={<Settings />} />
                </Route>
              </Route>

              <Route path="/references" element={<References />} />
              <Route path="/support" element={<Support />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/impressum" element={<Legal title="Impressum" />} />
              <Route path="/privacy" element={<Legal title="Datenschutz" />} />
              <Route path="/agb" element={<Legal title="AGB" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );

}

export default App;
