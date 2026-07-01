import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }) =>
  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 min-h-screen p-4 flex flex-col gap-1">
      <div className="px-2 py-4 mb-2">
        <h1 className="text-lg font-bold text-slate-800">Programa Ministerial</h1>
        <p className="text-xs text-slate-400 mt-0.5">{user?.nombreCongregacion || 'Congregación'}</p>
      </div>

      <NavLink to="/" end className={linkClass}>Panel</NavLink>
      <NavLink to="/personal" className={linkClass}>Personal</NavLink>
      <NavLink to="/programas" className={linkClass}>Programas</NavLink>
      {user?.rol === 'admin' && (
        <NavLink to="/admin/usuarios" className={linkClass}>Usuarios (admin)</NavLink>
      )}
    </aside>
  );
}
