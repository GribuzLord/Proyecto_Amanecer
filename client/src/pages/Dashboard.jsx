import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Hola, {user?.nombre} 👋</h2>
      <p className="text-sm text-slate-500 mb-6">¿Qué quieres hacer hoy?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/programas"
          className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-500 hover:shadow-sm transition-all"
        >
          <h3 className="font-semibold text-slate-800 mb-1">Generar programa</h3>
          <p className="text-sm text-slate-500">Crea el borrador semi-automático de la semana con un clic.</p>
        </Link>

        <Link
          to="/personal"
          className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-500 hover:shadow-sm transition-all"
        >
          <h3 className="font-semibold text-slate-800 mb-1">Gestionar personal</h3>
          <p className="text-sm text-slate-500">Agrega o edita a las personas y sus habilitaciones.</p>
        </Link>
      </div>
    </div>
  );
}
