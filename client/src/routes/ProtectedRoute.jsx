import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Envuelve páginas que requieren sesión iniciada, y opcionalmente un rol específico.
// Uso: <ProtectedRoute rolRequerido="admin"><UsersAdmin /></ProtectedRoute>
export default function ProtectedRoute({ children, rolRequerido }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (rolRequerido && user.rol !== rolRequerido) return <Navigate to="/" replace />;

  return children;
}
