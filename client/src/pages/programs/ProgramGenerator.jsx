import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ProgramGenerator() {
  const [programas, setProgramas] = useState([]);
  const [semanaInicio, setSemanaInicio] = useState('');
  const [semanaFin, setSemanaFin] = useState('');
  const [generando, setGenerando] = useState(false);

  async function cargar() {
    const { data } = await api.get('/programas');
    setProgramas(data.programas);
  }

  useEffect(() => { cargar(); }, []);

  async function generar(e) {
    e.preventDefault();
    setGenerando(true);
    try {
      await api.post('/programas/generar', { semanaInicio, semanaFin });
      await cargar();
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Programas</h2>
      <p className="text-sm text-slate-500 mb-6">
        Elige la semana y genera el borrador con un clic. Luego podrás editarlo antes de descargarlo en PDF.
      </p>

      <form onSubmit={generar} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Inicio de semana</label>
          <input
            type="date" required
            value={semanaInicio}
            onChange={(e) => setSemanaInicio(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Fin de semana</label>
          <input
            type="date" required
            value={semanaFin}
            onChange={(e) => setSemanaFin(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          disabled={generando}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {generando ? 'Generando...' : 'Generar programa'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {programas.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Aún no has generado ningún programa.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Semana</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programas.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 text-slate-700">{p.semanaInicio} — {p.semanaFin}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.estado === 'finalizado' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/programas/${p.id}`} className="text-brand-600 hover:underline text-xs font-medium">
                      Editar →
                    </Link>
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
