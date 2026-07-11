const puppeteer = require('puppeteer');
const { Programa, PartePrograma, TipoParte, Persona } = require('../models');

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatFechaCompleta(fechaStr) {
  if (!fechaStr) return '';
  // Convertir YYYY-MM-DD asumiendo zona horaria local para evitar saltos de día
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return fechaStr;
  const year = partes[0];
  const month = MESES[parseInt(partes[1], 10) - 1];
  const day = parseInt(partes[2], 10);
  return `${day} de ${month} de ${year}`;
}

function generarHTMLHojita(asignacion) {
  const { nombre, ayudante, fecha, tipoIntervencion, sala } = asignacion;

  return `
    <div style="width: 8cm; height: 10cm; border: 1px dashed #ccc; padding: 0.4cm; box-sizing: border-box; font-family: Arial, sans-serif; position: relative; margin: 0.2cm; page-break-inside: avoid; background: white;">
      <div style="text-align: center; font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; color: #333; line-height: 1.2;">
        Asignación para la reunión<br/>Vida y Ministerio Cristianos
      </div>
      
      <div style="margin-bottom: 6px; font-size: 11px;">
        <strong>Nombre:</strong> <span style="border-bottom: 1px solid black; display: inline-block; width: 5.8cm; text-align: center; font-family: 'Comic Sans MS', cursive, sans-serif;">${nombre}</span>
      </div>
      <div style="margin-bottom: 6px; font-size: 11px;">
        <strong>Ayudante:</strong> <span style="border-bottom: 1px solid black; display: inline-block; width: 5.5cm; text-align: center; font-family: 'Comic Sans MS', cursive, sans-serif;">${ayudante || ''}</span>
      </div>
      <div style="margin-bottom: 10px; font-size: 11px;">
        <strong>Fecha:</strong> <span style="border-bottom: 1px solid black; display: inline-block; width: 6.1cm; text-align: center; font-family: 'Comic Sans MS', cursive, sans-serif;">${fecha}</span>
      </div>

      <div style="font-size: 10px; margin-bottom: 10px;">
        <div style="font-weight: bold; margin-bottom: 3px;">Tipo de intervención:</div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 10px; height: 10px; border: 1px solid black; margin-right: 5px; background: #666; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px;">
            ✓
          </div>
          <span style="width: 100%; display: inline-block; padding-bottom: 1px;">
            ${tipoIntervencion}
          </span>
        </div>
      </div>

      <div style="font-size: 10px; margin-bottom: 10px;">
        <div style="font-weight: bold; margin-bottom: 3px;">Se presentará en:</div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 9px; height: 9px; border: 1px solid black; margin-right: 5px; background: ${sala === 'principal' ? '#666' : 'white'};"></div>
          <span>Sala principal</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
          <div style="width: 9px; height: 9px; border: 1px solid black; margin-right: 5px; background: ${sala === 'auxiliar' ? '#666' : 'white'};"></div>
          <span>Sala auxiliar núm. 1</span>
        </div>
      </div>

      <div style="margin-top: auto; font-size: 8px; line-height: 1.1; color: #555; text-align: justify; position: absolute; bottom: 0.4cm; left: 0.4cm; right: 0.4cm;">
        <strong>Nota al estudiante:</strong> En la <em>Guía de actividades</em> encontrará la información que necesita para su intervención, así como el aspecto de la oratoria que debe preparar con la ayuda del folleto <em>Maestros</em>. <strong>No olvide llevar su folleto, en formato impreso o electrónico, a la reunión Vida y Ministerio.</strong>
        <div style="margin-top: 4px; display: flex; justify-content: space-between;">
          <span>S-89-S 10/18</span>
          <span>Impreso en México</span>
        </div>
      </div>
    </div>
  `;
}

async function generateSlipsPDF(programaId) {
  const programa = await Programa.findByPk(programaId, {
    include: [
      {
        model: PartePrograma,
        as: 'partes',
        include: [
          { model: TipoParte, as: 'tipoParte' },
          { model: Persona, as: 'persona' },
        ],
      },
    ]
  });

  if (!programa) throw new Error('Programa no encontrado');

  const partes = programa.partes;
  const fechaStr = formatFechaCompleta(programa.semanaInicio); // Usamos el inicio de semana, o podríamos pedir la fecha exacta de la reunión si existiera. Usaremos semanaInicio.

  // Filtramos solo las partes que ameritan hojita: 
  // Lectura de la biblia (tesoros) y cualquier parte de Maestros
  const partesRelevantes = partes.filter(p =>
    p.tipoParte.codigo === 'lectura_biblia' ||
    p.tipoParte.seccion === 'maestros'
  );

  // Agrupar por tipoParte.codigo y sala para juntar titular y ayudante
  const grupos = {};
  partesRelevantes.forEach(p => {
    const key = `${p.tipoParte.codigo}_${p.sala}`;
    if (!grupos[key]) grupos[key] = { tipo: p.tipoParte, sala: p.sala, titular: null, ayudante: null, titulo: p.titulo };

    if (p.rolSlot === 'titular') grupos[key].titular = p.persona?.nombre || '';
    if (p.rolSlot === 'ayudante') {
      const isDiscursoEstudiante = p.tipoParte.codigo === 'discurso_estudiante';
      if (!isDiscursoEstudiante || !programa.esDiscursoMaestros) {
        grupos[key].ayudante = p.persona?.nombre || '';
      }
    }
  });

  const asignaciones = [];

  Object.values(grupos).forEach(grupo => {
    // Si no hay nadie asignado, igual podemos generar la hojita en blanco
    const esDiscursoOPresentacion = grupo.tipo.nombre.toLowerCase().includes('discurso') || grupo.tipo.nombre.toLowerCase().includes('presentación');

    let tipoIntervencion = grupo.tipo.nombre;
    if (grupo.titulo && (!programa.esDiscursoMaestros || grupo.tipo.codigo !== 'discurso_estudiante')) {
       tipoIntervencion = grupo.titulo;
    } else if (grupo.tipo.codigo === 'lectura_biblia') {
       tipoIntervencion = 'Lectura de la Biblia';
    } else if (grupo.tipo.codigo === 'discurso_estudiante' && programa.esDiscursoMaestros) {
       tipoIntervencion = 'Discurso';
    }

    // Hoja para el Titular
    asignaciones.push({
      nombre: grupo.titular || '',
      ayudante: grupo.ayudante || '',
      fecha: fechaStr,
      tipoIntervencion: tipoIntervencion,
      sala: grupo.sala
    });

    // Hoja para el Ayudante (es idéntica, misma asignación)
    if (grupo.ayudante) {
      asignaciones.push({
        nombre: grupo.titular || '',
        ayudante: grupo.ayudante || '',
        fecha: fechaStr,
        tipoIntervencion: tipoIntervencion,
        sala: grupo.sala
      });
    }
  });

  let htmlHojitas = asignaciones.map(a => generarHTMLHojita(a)).join('');

  if (asignaciones.length === 0) {
    htmlHojitas = '<div style="padding: 2cm; font-family: Arial;">No hay asignaciones de estudiantes en este programa.</div>';
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { 
        margin: 0; 
        padding: 0; 
        background: white; 
      }
      .container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: flex-start;
        align-content: flex-start;
        width: 100%;
        padding: 0.5cm;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${htmlHojitas}
    </div>
  </body>
  </html>
  `;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
  });
  await browser.close();

  return pdfBuffer;
}

module.exports = {
  generateSlipsPDF,
};
