import { useEffect, useState } from 'react';
import api from '../../api/axios';

const vacio = { nombre: '', email: '', password: '', nombreCongregacion: '' };

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(vacio);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, nombre: '' });

  async function cargar() {
    const { data } = await api.get('/users');
    setUsers(data.users);
  }

  useEffect(() => { cargar(); }, []);

  async function guardar(e) {
    e.preventDefault();
    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password; // Don't send empty string to avoid hashing empty string
        await api.patch(`/users/${editingId}`, payload);
      } else {
        await api.post('/users', form);
      }
      setForm(vacio);
      setEditingId(null);
      setShowForm(false);
      cargar();
    } catch (err) {
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  function editar(u) {
    setEditingId(u.id);
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: '', // Dejar en blanco para no mostrar el hash y permitir que sea opcional
      nombreCongregacion: u.nombreCongregacion || ''
    });
    setShowForm(true);
  }

  async function toggleActivo(u) {
    await api.patch(`/users/${u.id}`, { activo: !u.activo });
    cargar();
  }

  function openDeleteModal(u) {
    setDeleteModal({ show: true, id: u.id, nombre: u.nombre });
  }

  function closeDeleteModal() {
    setDeleteModal({ show: false, id: null, nombre: '' });
  }

  async function confirmarEliminar() {
    if (!deleteModal.id) return;
    try {
      await api.delete(`/users/${deleteModal.id}`);
      closeDeleteModal();
      cargar();
    } catch (err) {
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Usuarios autorizados</h2>
        <button
          onClick={() => {
            if (showForm) {
              setForm(vacio);
              setEditingId(null);
            }
            setShowForm((s) => !s);
          }}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input placeholder="Nombre" required value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Correo" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder={editingId ? "Nueva contraseña (opcional)" : "Contraseña temporal"} 
            type="text" required={!editingId} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Nombre de la congregación" value={form.nombreCongregacion}
            onChange={(e) => setForm({ ...form, nombreCongregacion: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {editingId ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
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
                  <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">{u.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.nombreCongregacion || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.activo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.activo ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-3">
                    <button onClick={() => editar(u)} className="text-slate-500 hover:text-slate-700 hover:underline text-xs font-medium">
                      Editar
                    </button>
                    <button onClick={() => toggleActivo(u)} className={`${u.activo ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'} hover:underline text-xs font-medium`}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => openDeleteModal(u)} className="text-red-500 hover:text-red-700 hover:underline text-xs font-medium">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar congregación</h3>
              <p className="text-sm text-slate-500">
                ¿Estás seguro de que deseas eliminar la cuenta de <strong className="text-slate-700">{deleteModal.nombre}</strong>? 
                Se borrarán permanentemente todos sus programas y personal. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button 
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminar}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
