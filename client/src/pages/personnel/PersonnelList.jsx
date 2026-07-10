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
  genero: 'M',
  privilegio: 'publicador_bautizado',
  habilitaciones: getDefaultHabilitaciones('M', 'publicador_bautizado')
});

export default function PersonnelList() {
  const [personas, setPersonas] = useState([]);
  const [form, setForm] = useState(getVacio());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta persona?')) return;
    await api.delete(`/personas/${id}`);
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
                value={form.genero}
                onChange={handleGeneroChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Privilegio</label>
              <select
                value={form.privilegio}
                onChange={handlePrivilegioChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {PRIVILEGIOS.map((p) => {
                  if (form.genero === 'F' && (p.value === 'anciano' || p.value === 'siervo_ministerial')) {
                    return null;
                  }
                  return <option key={p.value} value={p.value}>{p.label}</option>;
                })}
              </select>
            </div>
          </div>

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

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando...</p>
        ) : personas.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Aún no has agregado personal.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Género</th>
                <th className="px-4 py-2.5 font-medium">Privilegio</th>
                <th className="px-4 py-2.5 font-medium">Habilitaciones</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {personas.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.genero === 'M' ? 'Masculino' : 'Femenino'}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-transform capitalize">{p.privilegio.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.habilitaciones.length} partes</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => eliminar(p.id)} className="text-red-500 hover:underline text-xs font-medium">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
