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
  
  // States for Modals/Alerts
  const [saveStatus, setSaveStatus] = useState(null); // null | 'success' | 'error'
  const [confirmModal, setConfirmModal] = useState({ show: false, expected: 0, current: 0 });
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

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
    setSaveStatus(null);
    try {
      await api.patch('/users/me/config', {
        diaEntreSemana: config.diaEntreSemana,
        diaFinSemana: config.diaFinSemana === 0 ? 7 : config.diaFinSemana // El server quiza espera 7 para domingo
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleGenerateClick() {
    // Validar si el mes esta completo
    const expectedMeetings = countMeetingsInMonth(selectedMonth.year, selectedMonth.month, config.diaEntreSemana);
    
    if (programasMes.length < expectedMeetings) {
      setConfirmModal({ show: true, expected: expectedMeetings, current: programasMes.length });
      return;
    }
    
    await proceedGenerate();
  }

  async function proceedGenerate() {
    setConfirmModal({ show: false, expected: 0, current: 0 });
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
      setGenerating(false);
      
      let errorMessage = 'Error al generar el PDF de acomodadores.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMessage = json.message;
        } catch (e) {
          console.error('No se pudo parsear el error blob:', e);
        }
      }
      
      setErrorModal({ show: true, message: errorMessage });
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
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap h-[38px] flex items-center justify-center min-w-[100px]"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar'}
                </button>
                {saveStatus === 'success' && <span className="text-xs text-green-600 font-medium text-center">¡Guardado!</span>}
                {saveStatus === 'error' && <span className="text-xs text-red-600 font-medium text-center">Error al guardar</span>}
              </div>
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
              onClick={handleGenerateClick}
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

      {/* Modal de confirmación para mes incompleto */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Programas Incompletos</h3>
              <p className="text-sm text-slate-500 mb-4">
                Atención: Solo hay <strong>{confirmModal.current}</strong> programas de entre semana registrados en este mes y se esperaban <strong>{confirmModal.expected}</strong> según tu configuración.
              </p>
              <p className="text-sm text-slate-500">
                ¿Deseas generar el programa de acomodadores de todas formas?
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button 
                onClick={() => setConfirmModal({ show: false, expected: 0, current: 0 })}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={proceedGenerate}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
              >
                Sí, generar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Error (e.g. sin acomodadores) */}
      {errorModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No se pudo generar</h3>
              <p className="text-sm text-slate-600 mb-6">
                {errorModal.message}
              </p>
              <button 
                onClick={() => setErrorModal({ show: false, message: '' })}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
