import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-end px-6 gap-4">
      <span className="text-sm text-slate-500">{user?.nombre}</span>
      <button
        onClick={logout}
        className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
