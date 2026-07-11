import { useEffect, useState } from 'react';
import api from '../../api/axios';

const PRIVILEGIOS = [
  { value: 'anciano', label: 'Anciano' },
  { value: 'siervo_ministerial', label: 'Siervo ministerial' },
  { value: 'publicador_bautizado', label: 'Publicador bautizado' },
  { value: 'publicador_no_bautizado', label: 'Publicador no bautizado' },
];

// Códigos de tipos_parte disponibles para marcar habilitaciones.
const HABILITACIONES = [
  'Presidente', 'Consejero_sala_auxiliar', 'Tesoros_de_la_biblia (1)', 'Perlas_escondidas', 'Lectura_de_la_biblia',
  'Primera_conversación', 'Segunda_conversación', 'Tercera_conversación', 'Discurso_estudiante', 'Vida_cristiana (7)',
  'Estudio_del_libro', 'Lector_libro', 'Oracion_final',
  'Conductor_atalaya', 'Lector_atalaya',
];

function getDefaultHabilitaciones(genero, privilegio) {
  if (genero === 'F') {
    return ['Primera_conversación', 'Segunda_conversación', 'Tercera_conversación'];
  }

  if (privilegio === 'anciano' || privilegio === 'siervo_ministerial') {
    return [...HABILITACIONES];
  }

  if (privilegio === 'publicador_bautizado') {
    return ['Lectura_de_la_biblia', 'Primera_conversación', 'Segunda_conversación', 'Tercera_conversación', 'Lector_libro', 'Lector_atalaya', 'Discurso_estudiante'];
  }

  if (privilegio === 'publicador_no_bautizado') {
    return ['Lectura_de_la_biblia', 'Primera_conversación', 'Segunda_conversación', 'Tercera_conversación'];
  }

  return [];
}

const getVacio = () => ({
  nombre: '',
  genero: '',
  privilegio: '',
  habilitaciones: [],
  apoyaAcomodador: false
});

function formatTimeSince(dateString) {
  if (!dateString) return 'Nunca asignado';
  
  const date = new Date(dateString);
  const today = new Date();
  
  // Ignorar horas para comparar solo fechas de calendario
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today - date;
  if (diffTime < 0) return 'Asignación futura'; // Por si hay fechas en el futuro
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return 'Hace 1 semana';
  if (diffWeeks < 4) return `Hace ${diffWeeks} semanas`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Hace 1 mes';
  if (diffMonths < 12) return `Hace ${diffMonths} meses`;
  
  const diffYears = Math.floor(diffDays / 365);
  return `Hace ${diffYears} año${diffYears > 1 ? 's' : ''}`;
}

export default function PersonnelList() {
  const [personas, setPersonas] = useState([]);
  const [form, setForm] = useState(getVacio());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, nombre: '' });

  const [filterGenero, setFilterGenero] = useState('');
  const [filterPrivilegio, setFilterPrivilegio] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });

  const processedPersonas = personas
    .filter((p) => (filterGenero ? p.genero === filterGenero : true))
    .filter((p) => (filterPrivilegio ? p.privilegio === filterPrivilegio : true))
    .sort((a, b) => {
      if (sortConfig.key === 'ultima_asignacion') {
        const dateA = a.ultima_asignacion ? new Date(a.ultima_asignacion).getTime() : 0;
        const dateB = b.ultima_asignacion ? new Date(b.ultima_asignacion).getTime() : 0;
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  async function cargar() {
    setLoading(true);
    const { data } = await api.get('/personas');
    setPersonas(data.personas);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  function toggleHabilitacion(codigo) {
    setForm((f) => ({
      ...f,
      habilitaciones: f.habilitaciones.includes(codigo)
        ? f.habilitaciones.filter((h) => h !== codigo)
        : [...f.habilitaciones, codigo],
    }));
  }

  function handleGeneroChange(e) {
    const newGenero = e.target.value;
    let newPrivilegio = form.privilegio;

    // Si cambia a Femenino y tiene un privilegio exclusivo de hombres, se ajusta a publicador_bautizado
    if (newGenero === 'F' && (newPrivilegio === 'anciano' || newPrivilegio === 'siervo_ministerial')) {
      newPrivilegio = 'publicador_bautizado';
    }

    setForm({
      ...form,
      genero: newGenero,
      privilegio: newPrivilegio,
      habilitaciones: getDefaultHabilitaciones(newGenero, newPrivilegio)
    });
  }

  function handlePrivilegioChange(e) {
    const newPrivilegio = e.target.value;
    setForm({
      ...form,
      privilegio: newPrivilegio,
      habilitaciones: getDefaultHabilitaciones(form.genero, newPrivilegio)
    });
  }

  async function guardar(e) {
    e.preventDefault();
    await api.post('/personas', form);
    setForm(getVacio());
    setShowForm(false);
    cargar();
  }

  function openDeleteModal(persona) {
    setDeleteModal({ show: true, id: persona.id, nombre: persona.nombre });
  }

  function closeDeleteModal() {
    setDeleteModal({ show: false, id: null, nombre: '' });
  }

  async function confirmarEliminar() {
    if (!deleteModal.id) return;
    await api.delete(`/personas/${deleteModal.id}`);
    closeDeleteModal();
    cargar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Personal</h2>
        <button
          onClick={() => {
            if (showForm) setForm(getVacio());
            setShowForm((s) => !s);
          }}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Agregar persona'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Género</label>
              <select
                required
                value={form.genero}
                onChange={handleGeneroChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>Seleccione género</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Privilegio</label>
              <select
                required
                value={form.privilegio}
                onChange={handlePrivilegioChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>Seleccione privilegio</option>
                {PRIVILEGIOS.map((p) => {
                  if (form.genero === 'F' && (p.value === 'anciano' || p.value === 'siervo_ministerial')) {
                    return null;
                  }
                  return <option key={p.value} value={p.value}>{p.label}</option>;
                })}
              </select>
            </div>
          </div>

          {form.genero === 'M' && (
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.apoyaAcomodador}
                  onChange={(e) => setForm({ ...form, apoyaAcomodador: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                ¿Apoya como acomodador?
              </label>
            </div>
          )}

          <label className="block text-sm font-medium text-slate-600 mb-2">Partes que puede realizar (se auto-asignan por defecto)</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {HABILITACIONES.map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => toggleHabilitacion(h)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.habilitaciones.includes(h)
                  ? 'bg-brand-50 border-brand-500 text-brand-700'
                  : 'border-slate-300 text-slate-500'
                  }`}
              >
                {h.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <button className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            Guardar persona
          </button>
        </form>
      )}

      {/* Filtros */}
      {!loading && personas.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">Género:</label>
            <select
              value={filterGenero}
              onChange={(e) => setFilterGenero(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">Privilegio:</label>
            <select
              value={filterPrivilegio}
              onChange={(e) => setFilterPrivilegio(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {PRIVILEGIOS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando...</p>
        ) : personas.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Aún no has agregado personal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th 
                    className="px-4 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('nombre')}
                  >
                    Nombre {sortConfig.key === 'nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('genero')}
                  >
                    Género {sortConfig.key === 'genero' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('privilegio')}
                  >
                    Privilegio {sortConfig.key === 'privilegio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('ultima_asignacion')}
                  >
                    Última asig. {sortConfig.key === 'ultima_asignacion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('apoyaAcomodador')}
                  >
                    ¿Acomodador? {sortConfig.key === 'apoyaAcomodador' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2.5 font-medium">Habilitaciones</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedPersonas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{p.nombre}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.genero === 'M' ? 'Masculino' : 'Femenino'}</td>
                    <td className="px-4 py-2.5 text-slate-500 capitalize">{p.privilegio.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${!p.ultima_asignacion ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {formatTimeSince(p.ultima_asignacion)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {p.genero === 'M' ? (
                        <button 
                          onClick={async () => {
                            const newValue = !p.apoya_acomodador;
                            setPersonas(personas.map(per => per.id === p.id ? { ...per, apoya_acomodador: newValue } : per));
                            await api.patch(`/personas/${p.id}`, { apoyaAcomodador: newValue });
                          }}
                          className={`inline-block px-2 py-1 rounded-md text-xs font-bold transition-colors ${p.apoya_acomodador ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {p.apoya_acomodador ? 'Sí' : 'No'}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{p.habilitaciones.length} partes</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => openDeleteModal(p)} className="text-red-500 hover:underline text-xs font-medium">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {processedPersonas.length === 0 && (
              <p className="p-6 text-sm text-slate-400 text-center">No hay resultados para estos filtros.</p>
            )}
          </div>
        )}
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
              <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar persona</h3>
              <p className="text-sm text-slate-500">
                ¿Estás seguro de que deseas eliminar a <strong className="text-slate-700">{deleteModal.nombre}</strong>? 
                Esta acción no se puede deshacer y su historial se perderá.
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
