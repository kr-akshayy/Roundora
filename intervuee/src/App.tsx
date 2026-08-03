import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Mentors from './pages/Mentors';
import MentorProfile from './pages/MentorProfile';
import Dashboard from './pages/Dashboard';
import BookingRoom from './pages/BookingRoom';
import EditProfile from './pages/EditProfile';
import { useAuthStore } from './lib/auth-store';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to home page on browser refresh (F5 / Ctrl+R)
  useEffect(() => {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const isReload =
      entries.length > 0
        ? entries[0].type === 'reload'
        : (performance as unknown as { navigation: { type: number } }).navigation?.type === 1;

    if (isReload && window.location.pathname !== '/') {
      window.location.replace('/');
    }
  }, []);


  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/mentors" element={<Mentors />} />
          <Route path="/mentors/:id" element={<MentorProfile />} />
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
        </Routes>
      </main>
    </div>
  );
}
