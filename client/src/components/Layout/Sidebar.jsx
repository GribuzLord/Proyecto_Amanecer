import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }) =>
  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user } = useAuth();

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col gap-1`}
    >
      <div className="flex items-center justify-between p-4 mb-2 md:block">
        <div>
          <h1 className="text-lg font-bold text-slate-800">JW.ORG</h1>
          <p className="text-xs text-slate-400 mt-0.5">{user?.nombreCongregacion || 'Congregación'}</p>
        </div>
        <button 
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md"
          onClick={() => setIsOpen(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-4 flex flex-col gap-1 overflow-y-auto">
        <NavLink to="/" end className={linkClass} onClick={() => setIsOpen(false)}>Panel</NavLink>
        <NavLink to="/personal" className={linkClass} onClick={() => setIsOpen(false)}>Hermanos</NavLink>
        <NavLink to="/programas" className={linkClass} onClick={() => setIsOpen(false)}>Programas</NavLink>
        {user?.rol === 'admin' && (
          <NavLink to="/admin/usuarios" className={linkClass} onClick={() => setIsOpen(false)}>Usuarios (admin)</NavLink>
        )}
      </div>
    </aside>
  );
}
