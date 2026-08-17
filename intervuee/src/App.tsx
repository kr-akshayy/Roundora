import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import PwaInstallBanner from './components/PwaInstallBanner';
import Navbar from './components/Navbar';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Mentors from './pages/Mentors';
import MentorProfile from './pages/MentorProfile';
import Dashboard from './pages/Dashboard';
import BookingRoom from './pages/BookingRoom';
import EditProfile from './pages/EditProfile';
import JobsPage from './pages/JobsPage';
import NotFound from './pages/NotFound';
import InterviewerApplication from './pages/InterviewerApplication';
import AdminDashboard from './pages/AdminDashboard';
import SubmitScorecard from './pages/SubmitScorecard';
import ViewScorecard from './pages/ViewScorecard';
import { useAuthStore } from './lib/auth-store';

// Pages where the Navbar should be hidden (they have their own header)
const HIDE_NAVBAR_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const showNavbar = !HIDE_NAVBAR_PATHS.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      <PwaInstallBanner />
      {showNavbar && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/mentors" element={<Mentors />} />
          <Route path="/mentors/:id" element={<MentorProfile />} />
          {/* SEO category pages — same component with filter param */}
          <Route path="/mock-interview/:topic" element={<Mentors />} />

          {/* Authenticated */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:bookingId"
            element={
              <ProtectedRoute>
                <BookingRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute>
                <InterviewerApplication />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scorecard/:bookingId"
            element={
              <ProtectedRoute>
                <ViewScorecard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scorecard/:bookingId/submit"
            element={
              <ProtectedRoute>
                <SubmitScorecard />
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
