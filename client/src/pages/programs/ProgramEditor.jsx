import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function ProgramEditor() {
  const { id } = useParams();
  const [programa, setPrograma] = useState(null);

  async function cargar() {
    const { data } = await api.get(`/programas/${id}`);
    setPrograma(data.programa);
  }

  useEffect(() => { cargar(); }, [id]);

  async function guardarParte(parte, cambios) {
    await api.patch(`/programas/${id}/partes/${parte.id}`, cambios);
    cargar();
  }

  async function finalizar() {
    if (!confirm('Al finalizar, se actualizará el historial de rotación del personal. ¿Continuar?')) return;
    await api.post(`/programas/${id}/finalizar`);
    cargar();
  }

  if (!programa) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Semana {programa.semanaInicio} — {programa.semanaFin}
          </h2>
          <p className="text-sm text-slate-500">
            Estado: <span className="font-medium">{programa.estado}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {programa.estado === 'borrador' && (
            <button
              onClick={finalizar}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Finalizar
            </button>
          )}
          {/* TODO: conectar a GET /api/programas/:id/pdf cuando pdf.service.js esté implementado */}
          <button className="border border-slate-300 text-slate-600 text-sm font-semibold px-4 py-2 rounded-lg">
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {programa.partes.map((parte) => (
          <div key={parte.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="w-56 shrink-0">
              <p className="text-sm font-medium text-slate-700">{parte.tipoParte.nombre}</p>
              <p className="text-xs text-slate-400">
                {parte.sala !== 'unica' ? `Sala ${parte.sala} · ` : ''}{parte.rolSlot}
              </p>
            </div>

            <input
              placeholder="Título / tema (editable)"
              defaultValue={parte.titulo || ''}
              onBlur={(e) => guardarParte(parte, { titulo: e.target.value })}
              className="flex-1 min-w-[160px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />

            <input
              placeholder="Nombre asignado"
              defaultValue={parte.persona?.nombre || parte.textoLibre || ''}
              onBlur={(e) => guardarParte(parte, { textoLibre: e.target.value })}
              className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
