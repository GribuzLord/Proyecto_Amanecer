import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const addDays = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

export default function ProgramGenerator() {
  const [programas, setProgramas] = useState([]);
  const [semanaInicio, setSemanaInicio] = useState('');
  const [semanaFin, setSemanaFin] = useState('');
  const [generando, setGenerando] = useState(false);

  async function cargar() {
    const { data } = await api.get('/programas');
    setProgramas(data.programas);
  }

  useEffect(() => {
    cargar();
    
    // Inicializar con el próximo lunes
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
    const dayOfWeek = today.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    
    today.setUTCDate(today.getUTCDate() + daysUntilMonday);
    const startStr = today.toISOString().split('T')[0];
    
    setSemanaInicio(startStr);
    setSemanaFin(addDays(startStr, 6));
  }, []);

  function shiftWeek(weeks) {
    if (!semanaInicio) return;
    const newStart = addDays(semanaInicio, weeks * 7);
    setSemanaInicio(newStart);
    setSemanaFin(addDays(newStart, 6));
  }

  function handleInicioChange(e) {
    const newStart = e.target.value;
    setSemanaInicio(newStart);
    if (newStart) {
      setSemanaFin(addDays(newStart, 6));
    }
  }

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

      <form onSubmit={generar} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-start md:items-end gap-4">
        
        <div className="flex items-center sm:items-end gap-1 sm:gap-2 w-full md:w-auto">
          <button 
            type="button" 
            onClick={() => shiftWeek(-1)} 
            className="shrink-0 p-2 sm:p-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 mb-0 sm:mb-0.5 mt-3 sm:mt-0"
            title="Semana anterior"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-500 mb-1 truncate">Lunes (Inicio)</label>
              <input
                type="date" required
                value={semanaInicio}
                onChange={handleInicioChange}
                className="w-full rounded-lg border border-slate-300 px-2 sm:px-3 py-2 text-sm"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-500 mb-1 truncate">Domingo (Fin)</label>
              <input
                type="date" required
                value={semanaFin}
                onChange={(e) => setSemanaFin(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 sm:px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => shiftWeek(1)} 
            className="shrink-0 p-2 sm:p-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 mb-0 sm:mb-0.5 mt-3 sm:mt-0"
            title="Semana siguiente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          disabled={generando || !semanaInicio || !semanaFin}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg disabled:opacity-60 transition-colors w-full md:w-auto"
        >
          {generando ? 'Generando...' : 'Generar programa'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {programas.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Aún no has generado ningún programa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Semana</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programas.map((p) => {
                  const formatD = (dStr) => {
                    if(!dStr) return '';
                    const [y, m, d] = dStr.split('-');
                    return `${d}/${m}/${y}`;
                  };
                  return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{formatD(p.semanaInicio)} — {formatD(p.semanaFin)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        p.estado === 'finalizado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.estado === 'borrador' ? 'Borrador' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to={`/programas/${p.id}`} className="inline-block bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                        Editar →
                      </Link>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
