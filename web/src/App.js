// src/App.js
import React, { useContext, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IdleTimer from 'react-idle-timer';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

import Layout from "./components/layout/Layout";
import Dashboard from './components/Pages/Dashboard';
import Users from './components/Pages/Users';
import Reports from './components/Pages/Reports';
import ReportDetail from './components/Pages/ReportDetail';
import CreateReport from './components/Pages/CreateReport';
import Help from './components/Pages/Help';
import Account from './components/Pages/Account';
import AccessDenied from './components/Pages/AccessDenied';
import IdleTimeoutConfirm from './components/Dialogs/IdleTimeoutConfirm';
import PublicDashboard from './components/Pages/PublicDashboard';

import Login from './components/Pages/auth/Login';
import Register from './components/Pages/auth/Register';

import { AuthContext, AuthProvider } from './components/contexts/AuthContext';
import withProtectedRoute from './components/common/ProtectedRoute';

const appTheme = createTheme({
  palette: {
    primary: {
      main: '#1f2937',      // Dark Gray
      light: '#374151',     // Gray 700
      dark: '#111827',      // Gray 900
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2563eb',      // Blue 600
      light: '#3b82f6',     // Blue 500
      dark: '#1d4ed8',      // Blue 700
      contrastText: '#ffffff',
    },
    background: {
      default: '#f3f4f6',   // Gray 100
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    success: {
      main: '#2563eb',      // Blue – humanitarian info
    },
    warning: {
      main: '#ea580c',      // Orange 600
    },
    error: {
      main: '#991b1b',      // Dark Red 800
    },
    info: {
      main: '#2563eb',      // Blue 600
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Source Sans 3", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(31, 41, 55, 0.12)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});

function AppContent() {
  const { user, userRoles, logout } = useContext(AuthContext);
  const idleTimerRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timeout = 1000 * 300; // 5 minutes idle

  const onIdle = () => {
    if (isTimedOut) {
      logout();
    } else if (user) {
      setShowModal(true);
      idleTimerRef.current.reset();
      setIsTimedOut(true);
    }
  };

  const handleCancel = () => {
    setIsTimedOut(true);
    setShowModal(false);
    logout();
  };

  const handleOk = () => {
    setIsTimedOut(false);
    idleTimerRef.current.reset();
    setShowModal(false);
  };

  // Wrap pages with protected route HOC
  const ProtectedDashboard = withProtectedRoute(Dashboard);
  const ProtectedUsers = withProtectedRoute(Users);
  const ProtectedReports = withProtectedRoute(Reports);
  const ProtectedReportDetail = withProtectedRoute(ReportDetail);
  const ProtectedCreateReport = withProtectedRoute(CreateReport);
  const ProtectedHelp = withProtectedRoute(Help);
  const ProtectedAccount = withProtectedRoute(Account);

  return (
    <div>
      {/* Idle Timer */}
      <IdleTimer
        ref={idleTimerRef}
        element={document}
        onIdle={onIdle}
        debounce={250}
        timeout={timeout}
      />

      <IdleTimeoutConfirm
        open={showModal}
        expired={handleCancel}
        resume={handleOk}
        cancel={handleCancel}
      />

      {/* Routes */}
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/public" element={<PublicDashboard />} />

        {/* Protected Routes within Layout */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ProtectedDashboard userRoles={userRoles} pathRoles="analyst,admin" />
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedUsers userRoles={userRoles} pathRoles="admin" />
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedReports userRoles={userRoles} pathRoles="analyst,admin" />
            }
          />
          <Route
            path="/reports/create"
            element={
              <ProtectedCreateReport userRoles={userRoles} pathRoles="analyst,admin" />
            }
          />
          <Route
            path="/reports/:id"
            element={
              <ProtectedReportDetail userRoles={userRoles} pathRoles="analyst,admin" />
            }
          />
          <Route
            path="/help"
            element={
              <ProtectedHelp userRoles={userRoles} pathRoles="analyst,admin" />
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedAccount userRoles={userRoles} pathRoles="analyst,admin,user" />
            }
          />
          <Route path="/access-denied" element={<AccessDenied />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;