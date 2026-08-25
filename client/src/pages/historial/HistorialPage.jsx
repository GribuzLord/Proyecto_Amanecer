import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const seccionConfig = {
  presidente: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', titulo: 'Presidente' },
  tesoros: { bg: 'bg-[#387B8A]', text: 'text-white', border: 'border-[#387B8A]', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', titulo: 'Tesoros de la Biblia' },
  maestros: { bg: 'bg-[#B57F24]', text: 'text-white', border: 'border-[#B57F24]', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', titulo: 'Seamos Mejores Maestros' },
  vida_cristiana: { bg: 'bg-[#9A2B2C]', text: 'text-white', border: 'border-[#9A2B2C]', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', titulo: 'Nuestra Vida Cristiana' },
  fin_semana: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-600', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', titulo: 'Reunión Fin de Semana' },
};

export default function HistorialPage() {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('recent'); // 'recent' or 'all'
  const [activeTab, setActiveTab] = useState('presidente');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    cargarHistorial();
  }, [viewType]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/programas/historial/tablero?viewType=${viewType}`);
      setProgramas(res.data.programas || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSemana = (inicio, fin) => {
    if (!inicio || !fin) return '';
    const dInicio = parseISO(inicio);
    const dFin = parseISO(fin);
    const mInicio = format(dInicio, 'MMM', { locale: es });
    const mFin = format(dFin, 'MMM', { locale: es });
    
    if (mInicio === mFin) {
      return `${format(dInicio, 'd')}-${format(dFin, 'd')} ${mInicio} ${format(dFin, 'yyyy')}`;
    }
    return `${format(dInicio, 'd')} ${mInicio} - ${format(dFin, 'd')} ${mFin} ${format(dFin, 'yyyy')}`;
  };

  const agruparAsignaciones = (sectionKey) => {
    const list = [];
    programas.forEach(prog => {
      const semanaStr = formatSemana(prog.semanaInicio, prog.semanaFin);
      
      const partes = (prog.partes || []).filter(p => {
        if (!p.persona) return false;
        
        if (searchTerm && !p.persona.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        if (roleFilter !== 'all') {
           const code = p.tipoParte.codigo;
           if (roleFilter === 'lector' && code !== 'lector_estudio' && code !== 'lector_atalaya' && code !== 'lectura_biblia') return false;
           if (roleFilter === 'conductor' && code !== 'estudio_congregacion' && code !== 'conductor_atalaya') return false;
           if (roleFilter === 'oracion' && !code.includes('oracion')) return false;
        }

        if (sectionKey === 'presidente') {
          return p.tipoParte.codigo === 'presidente';
        }
        if (sectionKey === 'fin_semana') {
          return p.tipoParte.seccion === 'atalaya';
        }
        return p.tipoParte.seccion === sectionKey;
      });

      partes.forEach(p => {
        list.push({
          id: p.id,
          hermano: p.persona.nombre,
          semana: semanaStr,
          fechaInicioRaw: prog.semanaInicio, // para ordenamiento
          titulo: p.titulo || p.tipoParte.nombre,
          rolSlot: p.rolSlot,
          esCustom: p.tipoParte.codigo.includes('custom')
        });
      });
    });

    // Sort by newest first (descending order)
    list.sort((a, b) => new Date(b.fechaInicioRaw) - new Date(a.fechaInicioRaw));
    return list;
  };

  const currentList = agruparAsignaciones(activeTab);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historial de Asignaciones</h1>
          <p className="text-slate-500 mt-1">Consulta quién ha participado en cada sección.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewType('recent')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewType === 'recent' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Mes actual y anterior
          </button>
          <button
            onClick={() => setViewType('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Todos los tiempos
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.keys(seccionConfig).map(key => {
          const config = seccionConfig[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border-2 ${
                isActive 
                  ? `${config.bg} ${config.text} border-transparent shadow-md transform -translate-y-0.5` 
                  : `bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50`
              }`}
            >
              <svg className={`w-4 h-4 ${isActive ? 'opacity-90' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
              </svg>
              {config.titulo}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Buscar Hermano</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Escribe un nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="sm:w-64">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Filtrar por Rol Específico</label>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25em 1.25em' }}
          >
            <option value="all">Todas las participaciones</option>
            <option value="lector">Solo Lectores (Libro / Atalaya / Biblia)</option>
            <option value="conductor">Solo Conductores (Libro / Atalaya)</option>
            <option value="oracion">Solo Oraciones</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`${seccionConfig[activeTab].bg} ${seccionConfig[activeTab].text} px-6 py-4 font-bold tracking-widest text-sm uppercase flex items-center gap-2`}>
           <svg className="w-5 h-5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={seccionConfig[activeTab].icon} />
           </svg>
           {seccionConfig[activeTab].titulo}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <svg className="animate-spin h-8 w-8 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium text-lg">No hay participaciones registradas.</p>
            <p className="text-slate-400 text-sm mt-1">Los datos aparecerán aquí conforme se asignen hermanos.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentList.map((item, index) => (
              <div key={item.id + index} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-600 text-sm">
                    {item.hermano.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-bold leading-tight">{item.hermano}</h4>
                    <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
                      {item.titulo || (item.esCustom ? 'Asignación Dinámica' : 'Asignación')}
                      {item.rolSlot === 'ayudante' && <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Ayudante</span>}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {item.semana}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
