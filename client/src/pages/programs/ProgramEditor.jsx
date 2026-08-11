import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';

const codigosSinTitulo = [
  'presidente',
  'consejero_auxiliar',
  'perlas_escondidas',
  'lectura_biblia',
  'conversaciones_1',
  'conversaciones_2',
  'estudio_congregacion',
  'lector_estudio',
  'oracion_final',
  'presidente_atalaya',
  'conductor_atalaya',
  'lector_atalaya',
  'oracion_final_atalaya'
];

export default function ProgramEditor() {
  const { id } = useParams();
  const [programa, setPrograma] = useState(null);
  const [personnel, setPersonnel] = useState([]);
  const [finalizarModal, setFinalizarModal] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [descargandoHojitas, setDescargandoHojitas] = useState(false);
  const [customModal, setCustomModal] = useState({ show: false, seccion: null, requiereAyudante: false, requiereSala: false, titulo: '', esEstudioLibro: false, esDiscurso: false });
  const [confirmToggleModal, setConfirmToggleModal] = useState({ show: false, seccion: null, enabled: false });
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ show: false, grupoCustom: null });

  async function cargar() {
    const [progRes, persRes] = await Promise.all([
      api.get(`/programas/${id}`),
      api.get('/personas')
    ]);
    setPrograma(progRes.data.programa);
    setPersonnel(persRes.data.personas);
  }

  useEffect(() => { cargar(); }, [id]);

  async function guardarParte(parte, cambios) {
    if (cambios.personaId !== undefined) {
      if (cambios.personaId === '') {
        cambios.personaId = null;
        cambios.textoLibre = 'Por asignar';
      } else {
        cambios.textoLibre = null;
      }
    }

    // Solo guardar si realmente hubo un cambio para evitar llamadas innecesarias al blur
    if (cambios.titulo !== undefined && cambios.titulo === (parte.titulo || '')) return;

    await api.patch(`/programas/${id}/partes/${parte.id}`, cambios);
    cargar();
  }

  async function confirmarFinalizar() {
    await api.post(`/programas/${id}/finalizar`);
    setFinalizarModal(false);
    cargar();
  }

  function promptToggleCustom(seccion, enabled) {
    setConfirmToggleModal({ show: true, seccion, enabled });
  }

  async function executeToggleCustom() {
    const { seccion, enabled } = confirmToggleModal;
    await api.patch(`/programas/${id}/toggle-custom`, { seccion, enabled });
    setConfirmToggleModal({ show: false, seccion: null, enabled: false });
    cargar();
  }

  async function handleAddCustom() {
    await api.post(`/programas/${id}/partes-custom`, {
      seccion: customModal.seccion,
      requiereAyudante: customModal.requiereAyudante,
      requiereSala: customModal.requiereSala,
      titulo: customModal.titulo,
      esEstudioLibro: customModal.esEstudioLibro,
      esDiscurso: customModal.esDiscurso
    });
    setCustomModal({ show: false, seccion: null, requiereAyudante: false, requiereSala: false, titulo: '', esEstudioLibro: false, esDiscurso: false });
    cargar();
  }

  function promptDeleteCustom(grupoCustom) {
    setConfirmDeleteModal({ show: true, grupoCustom });
  }

  async function executeDeleteCustom() {
    const { grupoCustom } = confirmDeleteModal;
    await api.delete(`/programas/${id}/partes-custom/${grupoCustom}`);
    setConfirmDeleteModal({ show: false, grupoCustom: null });
    cargar();
  }

  async function descargarPDF() {
    try {
      setDescargandoPdf(true);
      const response = await api.get(`/programas/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `programa-${programa.semanaInicio}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando el PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setDescargandoPdf(false);
    }
  }

  async function descargarHojitas() {
    try {
      setDescargandoHojitas(true);
      const response = await api.get(`/programas/${id}/hojitas`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hojitas-S89-${programa.semanaInicio}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando hojitas:', error);
      alert('Hubo un error al generar las hojitas. Por favor intenta de nuevo.');
    } finally {
      setDescargandoHojitas(false);
    }
  }

  const secciones = useMemo(() => {
    if (!programa) return {};
    return programa.partes.reduce((acc, parte) => {
      const sec = parte.tipoParte.seccion;
      if (!acc[sec]) acc[sec] = [];
      acc[sec].push(parte);
      return acc;
    }, {});
  }, [programa]);

  const habilitacionesMap = {
    'presidente': ['Presidente'],
    'consejero_auxiliar': ['Consejero_sala_auxiliar'],
    'tesoro_1': ['Tesoros_de_la_biblia (1)'],
    'perlas_escondidas': ['Perlas_escondidas'],
    'lectura_biblia': ['Lectura_de_la_biblia'],
    'conversaciones_1': ['Primera_conversación'],
    'conversaciones_2': ['Segunda_conversación'],
    'discurso_estudiante': ['Tercera_conversación', 'Discurso_estudiante'],
    'vida_cristiana_tema': ['Vida_cristiana (7)'],
    'estudio_congregacion': ['Estudio_del_libro'],
    'lector_estudio': ['Lector_libro'],
    'oracion_final': ['Oracion_final'],
    'presidente_atalaya': ['Presidente'],
    'conductor_atalaya': ['Conductor_atalaya'],
    'lector_atalaya': ['Lector_atalaya'],
    'oracion_final_atalaya': ['Oracion_final'],
    'custom_maestros': ['Primera_conversación', 'Segunda_conversación', 'Tercera_conversación'],
    'custom_vida_cristiana': ['Vida_cristiana (7)']
  };

  const getCandidatos = (tipoParte) => {
    return personnel.filter(p => {
      if (!p.activo) return false;
      let restriccion = tipoParte.restriccionGenero;
      
      if (tipoParte.codigo === 'discurso_estudiante') {
        restriccion = programa?.esDiscursoMaestros ? 'M' : 'ninguna';
      }
      
      if (restriccion !== 'ninguna' && p.genero !== restriccion) return false;

      // Para las asignaciones dinámicas genéricas, le damos libertad total al usuario de elegir a cualquier publicador activo
      if (tipoParte.codigo === 'custom_maestros' || tipoParte.codigo === 'custom_vida_cristiana') {
        return true;
      }

      const habs = p.habilitaciones || [];
      // Verificar si tiene alguna de las habilitaciones mapeadas para este tipo de parte
      const requeridas = habilitacionesMap[tipoParte.codigo] || [tipoParte.codigo];
      return requeridas.some(req => habs.includes(req));
    });
  };

  const getDuplicateWarning = (parte, secKey, partesSec) => {
    if (!parte.personaId) return null;
    
    const todasLasPartes = programa.partes || [];

    // Regla 1: El presidente y consejero no pueden tener asignaciones en Tesoros o Maestros
    if (parte.tipoParte.codigo === 'presidente' || parte.tipoParte.codigo === 'consejero_auxiliar') {
      const choca = todasLasPartes.some(p => p.id !== parte.id && p.personaId === parte.personaId && (p.tipoParte.seccion === 'tesoros' || p.tipoParte.seccion === 'maestros'));
      if (choca) return "⚠️ Esta persona ya tiene una asignación en Tesoros o Maestros.";
    }
    if (secKey === 'tesoros' || secKey === 'maestros') {
      const esPresidenteOConsejero = todasLasPartes.some(p => p.id !== parte.id && p.personaId === parte.personaId && (p.tipoParte.codigo === 'presidente' || p.tipoParte.codigo === 'consejero_auxiliar'));
      if (esPresidenteOConsejero) return "⚠️ El Presidente o Consejero no pueden tener asignaciones en esta sección.";
    }

    // Regla 2: El lector de la biblia no puede participar en Maestros
    if (parte.tipoParte.codigo === 'lectura_biblia') {
      const tieneMaestros = todasLasPartes.some(p => p.id !== parte.id && p.personaId === parte.personaId && p.tipoParte.seccion === 'maestros');
      if (tieneMaestros) return "⚠️ El lector de la Biblia no puede tener asignaciones en Maestros.";
    }
    if (secKey === 'maestros') {
      const esLectorBiblia = todasLasPartes.some(p => p.id !== parte.id && p.personaId === parte.personaId && p.tipoParte.codigo === 'lectura_biblia');
      if (esLectorBiblia) return "⚠️ El lector de la Biblia no puede tener asignaciones en Maestros.";
    }
    
    if (secKey === 'atalaya') {
      const duplicados = partesSec.filter(p => p.id !== parte.id && p.personaId === parte.personaId);
      if (duplicados.length > 0) {
        return "⚠️ Esta persona ya tiene otra participación en La Atalaya.";
      }
    }

    if (secKey === 'maestros') {
      const duplicados = partesSec.filter(p => p.id !== parte.id && p.personaId === parte.personaId);
      if (duplicados.length > 0) {
        // Checar si es el mismo tema en la misma sala (significa que es el ayudante de sí mismo)
        const mismoTema = duplicados.find(p => p.tipoParte.codigo === parte.tipoParte.codigo && p.sala === parte.sala);
        if (mismoTema) {
          return "⚠️ El titular y el ayudante no pueden ser la misma persona.";
        }
        // Si es otro tema o en otra sala, es que pasa dos veces
        return "⚠️ Esta persona ya tiene otra participación en la sección de Maestros.";
      }
    }

    return null;
  };

  const getTiempoTranscurrido = (fechaStr) => {
    if (!fechaStr) return '(Nunca)';
    const ultima = new Date(fechaStr);
    const ahora = new Date();
    ultima.setHours(0, 0, 0, 0);
    ahora.setHours(0, 0, 0, 0);

    const diffTime = ahora - ultima;
    if (diffTime < 0) return '(Próximamente)';

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return '(Esta semana)';
    if (diffDays < 30) {
      const semanas = Math.floor(diffDays / 7);
      return `(Hace ${semanas} sem)`;
    }
    const meses = Math.floor(diffDays / 30);
    return `(Hace ${meses} mes${meses > 1 ? 'es' : ''})`;
  };

  async function handleAseoChange(nuevoAseo) {
    setPrograma(prev => ({ ...prev, grupoAseo: nuevoAseo }));
    try {
      await api.patch(`/programas/${id}`, { grupoAseo: nuevoAseo });
    } catch (err) {
      console.error('Error guardando aseo:', err);
    }
  }

  if (!programa) return (
    <div className="flex justify-center py-12">
      <p className="text-sm text-slate-400 font-medium animate-pulse">Cargando programa...</p>
    </div>
  );

  const seccionConfig = {
    encabezado: { titulo: 'Presidente y Oraciones', bg: 'bg-slate-700', text: 'text-white' },
    tesoros: { titulo: 'Tesoros de la biblia', bg: 'bg-[#3C7F8B]', text: 'text-white' },
    maestros: { titulo: 'Seamos Mejores Maestros', bg: 'bg-amber-600', text: 'text-white' },
    vida_cristiana: { titulo: 'Nuestra Vida Cristiana', bg: 'bg-rose-700', text: 'text-white' },
    atalaya: { titulo: 'Estudio de La Atalaya', bg: 'bg-slate-700', text: 'text-white' },
  };

  const orderSecciones = ['encabezado', 'tesoros', 'maestros', 'vida_cristiana', 'atalaya'];

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <Link to="/programas" className="text-slate-400 hover:text-brand-600 hover:underline text-sm mb-1 inline-block transition-colors">
            ← Volver a programas
          </Link>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Semana del {programa.semanaInicio.split('-').reverse().join('/')} al {programa.semanaFin.split('-').reverse().join('/')}
          </h2>
          <p className="text-sm mt-2 flex items-center gap-2">
            <span className="text-slate-500">Estado:</span>
            <span className={`font-semibold px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider ${programa.estado === 'borrador' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {programa.estado === 'borrador' ? 'Borrador' : 'Finalizado'}
            </span>
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={descargarHojitas}
            disabled={descargandoHojitas}
            className="flex-1 md:flex-none bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {descargandoHojitas ? (
              <svg className="animate-spin w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            )}
            {descargandoHojitas ? 'Generando...' : 'Hojitas (S-89)'}
          </button>
          <button
            onClick={descargarPDF}
            disabled={descargandoPdf}
            className="flex-1 md:flex-none bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {descargandoPdf ? (
              <svg className="animate-spin w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            {descargandoPdf ? 'Generando...' : 'PDF'}
          </button>
          {programa.estado === 'borrador' && (
            <button
              onClick={() => setFinalizarModal(true)}
              className="flex-1 md:flex-none bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Finalizar
            </button>
          )}

        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {orderSecciones.map(secKey => {
          const isMaestros = secKey === 'maestros';
          const isVida = secKey === 'vida_cristiana';
          const isCustomizable = isMaestros || isVida;
          const isCustomEnabled = isMaestros ? programa.plantillaPersonalizadaMaestros : (isVida ? programa.plantillaPersonalizadaVida : false);

          const partesSec = secciones[secKey] || [];
          if (partesSec.length === 0 && !isCustomEnabled) return null;

          const config = seccionConfig[secKey];

          return (
            <div key={secKey}>
              <div className={`${config.bg} ${config.text} px-5 py-2.5 font-bold uppercase tracking-widest text-xs flex justify-between items-center`}>
                <span>{config.titulo}</span>
                {isCustomizable && (
                  <div className="flex items-center gap-2 text-[10px] bg-white/20 px-2 py-1 rounded">
                    <span>¿Plantilla personalizada?</span>
                    <button
                      onClick={() => promptToggleCustom(secKey, !isCustomEnabled)}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${isCustomEnabled ? 'bg-white' : 'bg-slate-400'}`}
                    >
                      <span className={`pointer-events-none inline-block h-3 w-3 mt-0.5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${isCustomEnabled ? 'translate-x-3.5 bg-brand-600' : 'translate-x-0.5 bg-white'}`} />
                    </button>
                  </div>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {partesSec.map((parte, index) => {
                  if (parte.tipoParte.codigo === 'discurso_estudiante' && programa.esDiscursoMaestros && parte.rolSlot === 'ayudante') {
                    return null;
                  }

                  const candidatos = getCandidatos(parte.tipoParte);
                  const mostrarTitulo = !codigosSinTitulo.includes(parte.tipoParte.codigo) && !(parte.tipoParte.codigo === 'discurso_estudiante' && programa.esDiscursoMaestros);

                  const isFirstDiscurso = parte.tipoParte.codigo === 'discurso_estudiante' && partesSec.findIndex(p => p.tipoParte.codigo === 'discurso_estudiante') === index;

                  const content = (
                    <div key={parte.id}>
                      <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-full lg:w-1/3 shrink-0">
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          {parte.tipoParte.nombre}
                          {parte.sala === 'auxiliar' && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">
                              Sala Auxiliar
                            </span>
                          )}
                        </p>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">
                          {parte.sala === 'principal' ? `Sala Principal · ` : ''}{parte.rolSlot}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 flex-1 justify-end min-w-0">
                        {mostrarTitulo && (
                          <input
                            placeholder="Título / tema de la asignación"
                            defaultValue={parte.titulo || ''}
                            onBlur={(e) => guardarParte(parte, { titulo: e.target.value })}
                            className="flex-1 min-w-0 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-shadow text-ellipsis"
                          />
                        )}

                        <div className={`relative w-full ${mostrarTitulo ? 'sm:w-72' : 'sm:w-1/2'} shrink-0`}>
                          <select
                            value={parte.personaId || ''}
                            onChange={(e) => guardarParte(parte, { personaId: e.target.value })}
                            className="w-full appearance-none rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-500 transition-shadow text-ellipsis"
                          >
                            <option value="" className="text-slate-400">-- Por asignar --</option>
                            {candidatos.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nombre} {getTiempoTranscurrido(c.ultimaAsignacion)}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                        {parte.grupoCustom && (
                          <button onClick={() => promptDeleteCustom(parte.grupoCustom)} className="text-red-400 hover:text-red-600 shrink-0 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar asignación">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {getDuplicateWarning(parte, secKey, partesSec) && (
                      <div className="px-5 pb-4 -mt-2 lg:text-right">
                        <p className="text-xs text-red-500 font-semibold">{getDuplicateWarning(parte, secKey, partesSec)}</p>
                      </div>
                    )}
                  </div>
                );

                  if (isFirstDiscurso) {
                    return (
                      <div key={'toggle-' + parte.id} className="divide-y divide-slate-100">
                        <div className="p-5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                          <div>
                            <p className="text-sm font-bold text-slate-800">¿La última asignación de Maestros será un Discurso?</p>
                            <p className="text-xs text-slate-500 mt-0.5">Si se marca que sí, se eliminarán los ayudantes, el título, y se restringirá a varones.</p>
                          </div>
                          <button
                            onClick={async () => {
                              const newValue = !programa.esDiscursoMaestros;
                              setPrograma({ ...programa, esDiscursoMaestros: newValue });
                              await api.patch(`/programas/${id}`, { esDiscursoMaestros: newValue });
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${programa.esDiscursoMaestros ? 'bg-brand-600' : 'bg-slate-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${programa.esDiscursoMaestros ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        {content}
                      </div>
                    );
                  }

                  return content;
                })}
              </div>
              {isCustomEnabled && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                  <button onClick={() => setCustomModal({ show: true, seccion: secKey, requiereAyudante: false, requiereSala: false, titulo: '', esEstudioLibro: false, esDiscurso: false })} className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    Agregar asignación dinámica
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          Aseo y Hospitalidad
        </h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Grupo asignado
          </label>
          <input
            type="text"
            className="w-full sm:w-1/2 md:w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            placeholder="Ej: Grupo 1"
            value={programa.grupoAseo || ''}
            onChange={(e) => handleAseoChange(e.target.value)}
          />
        </div>
      </div>

      {finalizarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Finalizar programa</h3>
              <p className="text-sm text-slate-500">
                Al finalizar el programa, se actualizará el historial de rotación del personal para que no se les asigne repetidamente.
                Aún podrás hacer modificaciones manuales si lo necesitas. ¿Deseas continuar?
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setFinalizarModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarFinalizar}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-sm"
              >
                Sí, finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {customModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Nueva Asignación</h3>
            
            <label className="block text-sm font-medium text-slate-700 mb-1">Título / Tema</label>
            <input 
              type="text" 
              value={customModal.titulo} 
              onChange={e => setCustomModal({...customModal, titulo: e.target.value})} 
              className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-50" 
              placeholder="Ej: Demostración" 
              disabled={customModal.seccion === 'vida_cristiana' && customModal.esEstudioLibro}
            />

            {customModal.seccion === 'maestros' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-700">¿Es un discurso?</span>
                  <input 
                    type="checkbox" 
                    checked={customModal.esDiscurso} 
                    onChange={e => setCustomModal({...customModal, esDiscurso: e.target.checked, requiereAyudante: e.target.checked ? false : customModal.requiereAyudante})} 
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500" 
                  />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm font-medium ${customModal.esDiscurso ? 'text-slate-400' : 'text-slate-700'}`}>¿Tendrá 2 personas (Ayudante)?</span>
                  <input 
                    type="checkbox" 
                    checked={customModal.requiereAyudante} 
                    onChange={e => setCustomModal({...customModal, requiereAyudante: e.target.checked})} 
                    disabled={customModal.esDiscurso}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 disabled:opacity-50" 
                  />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-medium text-slate-700">¿Se presentará en ambas salas?</span>
                  <input 
                    type="checkbox" 
                    checked={customModal.requiereSala} 
                    onChange={e => setCustomModal({...customModal, requiereSala: e.target.checked})} 
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500" 
                  />
                </div>
              </>
            )}

            {customModal.seccion === 'vida_cristiana' && (
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-slate-700">¿Es el estudio del libro? (Conductor y lector)</span>
                <input 
                  type="checkbox" 
                  checked={customModal.esEstudioLibro} 
                  onChange={e => setCustomModal({...customModal, esEstudioLibro: e.target.checked, titulo: e.target.checked ? '' : customModal.titulo})} 
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500" 
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCustomModal({ show: false, seccion: null, requiereAyudante: false, requiereSala: false, titulo: '', esEstudioLibro: false, esDiscurso: false })} 
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddCustom} 
                className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-lg font-medium transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmToggleModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                ¿Estás seguro de {confirmToggleModal.enabled ? 'activar' : 'desactivar'} la plantilla personalizada?
              </h3>
              <p className="text-sm text-slate-500">
                Se borrarán por completo las asignaciones actuales de esta sección. Tendrás que reasignar todo nuevamente.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmToggleModal({ show: false, seccion: null, enabled: false })}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeToggleCustom}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
              >
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar asignación</h3>
              <p className="text-sm text-slate-500">
                ¿Estás seguro de querer eliminar esta asignación dinámica completa? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteModal({ show: false, grupoCustom: null })}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteCustom}
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
