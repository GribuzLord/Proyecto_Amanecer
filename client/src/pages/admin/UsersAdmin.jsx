import { useEffect, useState } from 'react';
import api from '../../api/axios';

const vacio = { nombre: '', email: '', password: '', nombreCongregacion: '' };

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(vacio);
  const [showForm, setShowForm] = useState(false);

  async function cargar() {
    const { data } = await api.get('/users');
    setUsers(data.users);
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    await api.post('/users', form);
    setForm(vacio);
    setShowForm(false);
    cargar();
  }

  async function toggleActivo(u) {
    await api.patch(`/users/${u.id}`, { activo: !u.activo });
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Usuarios autorizados</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input placeholder="Nombre" required value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Correo" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Contraseña temporal" type="text" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Nombre de la congregación" value={form.nombreCongregacion}
            onChange={(e) => setForm({ ...form, nombreCongregacion: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            Crear usuario
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">Correo</th>
              <th className="px-4 py-2.5 font-medium">Congregación</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 font-medium text-slate-700">{u.nombre}</td>
                <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                <td className="px-4 py-2.5 text-slate-500">{u.nombreCongregacion || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.activo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.activo ? 'activo' : 'inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => toggleActivo(u)} className="text-brand-600 hover:underline text-xs font-medium">
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
