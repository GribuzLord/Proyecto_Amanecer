import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between md:justify-end px-4 md:px-6 gap-4 sticky top-0 z-10 shrink-0">
      <button 
        className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md"
        onClick={onMenuClick}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500 hidden sm:inline">{user?.nombre}</span>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
