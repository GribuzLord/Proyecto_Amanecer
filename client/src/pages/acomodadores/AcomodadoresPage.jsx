import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../api/axios';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }, // JS getDay() usa 0 para Domingo
];

// Helper: calcula cuantas semanas (reuniones de entre semana) tiene un mes
// Asumimos que hay una reunión por cada ocurrencia del diaEntreSemana
function countMeetingsInMonth(year, month, dayOfWeek) {
  let count = 0;
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === dayOfWeek) count++;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

export default function AcomodadoresPage() {
  const [config, setConfig] = useState({ diaEntreSemana: 3, diaFinSemana: 0 });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  });

  const [generating, setGenerating] = useState(false);
  const [programasMes, setProgramasMes] = useState([]);

  useEffect(() => {
    async function loadConfig() {
      try {
        const { data } = await api.get('/users/me');
        setConfig({
          diaEntreSemana: data.user.diaEntreSemana === 7 ? 0 : data.user.diaEntreSemana, // Manejo de fallback por si era 7
          diaFinSemana: data.user.diaFinSemana === 7 ? 0 : data.user.diaFinSemana
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    async function checkProgramas() {
      try {
        const y = selectedMonth.year;
        const m = selectedMonth.month;
        const inicio = new Date(y, m, 1).toISOString().split('T')[0];
        const fin = new Date(y, m + 1, 0).toISOString().split('T')[0];
        
        const { data } = await api.get('/programas');
        const progsDelMes = data.programas.filter(p => p.semanaInicio <= fin && p.semanaInicio >= inicio);
        setProgramasMes(progsDelMes);
      } catch (error) {
        console.error(error);
      }
    }
    checkProgramas();
  }, [selectedMonth]);

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      await api.patch('/users/me/config', {
        diaEntreSemana: config.diaEntreSemana,
        diaFinSemana: config.diaFinSemana === 0 ? 7 : config.diaFinSemana // El server quiza espera 7 para domingo
      });
      alert('Configuración guardada exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar configuración.');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleGenerate() {
    // Validar si el mes esta completo
    const expectedMeetings = countMeetingsInMonth(selectedMonth.year, selectedMonth.month, config.diaEntreSemana);
    
    if (programasMes.length < expectedMeetings) {
      const confirm = window.confirm(`Atención: Solo hay ${programasMes.length} programas registrados en este mes y se esperaban ${expectedMeetings}. ¿Deseas generar el programa de acomodadores de todas formas?`);
      if (!confirm) return;
    }

    setGenerating(true);
    try {
      const response = await api.get(`/acomodadores/generar-pdf?year=${selectedMonth.year}&month=${selectedMonth.month}`, {
        responseType: 'blob' // Importante para recibir binarios
      });

      // Crear URL y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Acomodadores-${selectedMonth.month + 1}-${selectedMonth.year}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF de acomodadores.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Acomodadores</h1>
        <p className="text-slate-500 mt-1">Genera el programa de acomodadores mensual.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800">1. Días de Reunión</h2>
        </div>
        <div className="p-6">
          {loadingConfig ? (
            <p className="text-sm text-slate-500">Cargando configuración...</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Día de Entre Semana</label>
                <select
                  value={config.diaEntreSemana}
                  onChange={e => setConfig({ ...config, diaEntreSemana: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Día de Fin de Semana</label>
                <select
                  value={config.diaFinSemana}
                  onChange={e => setConfig({ ...config, diaFinSemana: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                {savingConfig ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800">2. Generar Documento</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">Mes a generar</label>
              <div className="flex gap-2">
                <select
                  value={selectedMonth.month}
                  onChange={e => setSelectedMonth({ ...selectedMonth, month: Number(e.target.value) })}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const date = new Date(2020, i, 1);
                    return <option key={i} value={i}>{format(date, 'MMMM', { locale: es }).toUpperCase()}</option>;
                  })}
                </select>
                <input
                  type="number"
                  value={selectedMonth.year}
                  onChange={e => setSelectedMonth({ ...selectedMonth, year: Number(e.target.value) })}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-8 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              {generating ? (
                <>Generando PDF...</>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Descargar S-89
                </>
              )}
            </button>
          </div>
          
          <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">¿Cómo funciona la asignación automática?</p>
              <ul className="list-disc list-inside space-y-1 opacity-90 ml-1">
                <li>Solo se consideran los varones que tienen activada la casilla <b>"Apoya como acomodador"</b> en la sección de Personal.</li>
                <li>Si alguien tiene participación en la reunión un día, el sistema no lo asignará como acomodador (a menos que no haya nadie más disponible).</li>
                <li>El sistema rotará a los hermanos basándose en la fecha de su última asignación.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
