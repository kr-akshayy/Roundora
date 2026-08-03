import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../lib/auth-store';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500 text-sm">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
