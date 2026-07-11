const puppeteer = require('puppeteer');
const { Programa, PartePrograma, TipoParte, Persona } = require('../models');
const fs = require('fs');
const path = require('path');

// Cargar imágenes en base64 para inyectarlas directamente en el HTML
const getBase64Image = (filename) => {
  try {
    const filePath = path.join(__dirname, '../assets', filename);
    const fileData = fs.readFileSync(filePath);
    return `data:image/png;base64,${fileData.toString('base64')}`;
  } catch (error) {
    console.error(`No se pudo cargar la imagen: ${filename}`, error);
    return '';
  }
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatFechaEspanol(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return '';
  const fInicio = new Date(fechaInicio + 'T00:00:00');
  const fFin = new Date(fechaFin + 'T00:00:00');
  
  const dInicio = fInicio.getDate();
  const dFin = fFin.getDate();
  const mInicio = MESES[fInicio.getMonth()];
  const mFin = MESES[fFin.getMonth()];
  
  if (mInicio === mFin) {
    return `Semana del <b>${dInicio}</b> al <b>${dFin} de ${mInicio}</b>.`;
  } else {
    return `Semana del <b>${dInicio} de ${mInicio}</b> al <b>${dFin} de ${mFin}</b>.`;
  }
}

async function generateProgramPDF(programaId) {
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
    ],
    order: [
      [{ model: PartePrograma, as: 'partes' }, { model: TipoParte, as: 'tipoParte' }, 'orden', 'ASC'],
    ],
  });

  if (!programa) throw new Error('Programa no encontrado');

  const partes = programa.partes;

  // Organizar partes
  const presidente = partes.find(p => p.tipoParte.codigo === 'presidente')?.persona?.nombre || '';
  const consejeroAux = partes.find(p => p.tipoParte.codigo === 'consejero_auxiliar')?.persona?.nombre || '';

  const tesoros = partes.filter(p => p.tipoParte.seccion === 'tesoros');
  const maestros = partes.filter(p => p.tipoParte.seccion === 'maestros');
  const vidaCristiana = partes.filter(p => p.tipoParte.seccion === 'vida_cristiana');
  const atalaya = partes.filter(p => p.tipoParte.seccion === 'atalaya');

  // Procesar Tesoros
  let tesorosHTML = '';
  // Agrupar lectura de biblia por sala
  const lecturaBiblia = tesoros.filter(p => p.tipoParte.codigo === 'lectura_biblia');
  let partNumber = 1;

  tesoros.filter(p => p.tipoParte.codigo !== 'lectura_biblia').forEach(p => {
    tesorosHTML += `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
      <div style="color: #387B8A; font-size: 14px; flex-grow: 1;">${partNumber}. ${p.titulo || p.tipoParte.nombre}.</div>
      <div style="font-weight: bold; font-size: 14px; text-align: right; min-width: 150px;">${p.persona?.nombre || ''}</div>
    </div>`;
    partNumber++;
  });

  if (lecturaBiblia.length > 0) {
    let lecturaHtml = '';
    const principal = lecturaBiblia.find(p => p.sala === 'principal');
    const auxiliar = lecturaBiblia.find(p => p.sala === 'auxiliar');
    
    if (principal) lecturaHtml += `<div><span style="color: #387B8A;">Sala Principal:</span> <b>${principal.persona?.nombre || ''}</b></div>`;
    if (auxiliar) lecturaHtml += `<div><span style="color: #387B8A;">Sala Auxiliar:</span> <b>${auxiliar.persona?.nombre || ''}</b></div>`;

    tesorosHTML += `
    <div style="display: flex; margin-bottom: 8px;">
      <div style="color: #387B8A; font-size: 14px; flex-grow: 1;">${partNumber}. Lectura de la Biblia.</div>
      <div style="font-size: 12px; text-align: right; line-height: 1.6;">
        ${lecturaHtml}
      </div>
    </div>`;
    partNumber++;
  }

  // Procesar Maestros
  let maestrosHTML = '';
  // Agrupar por tipoParte.codigo
  const maestrosGroups = {};
  maestros.forEach(p => {
    if (!maestrosGroups[p.tipoParte.codigo]) maestrosGroups[p.tipoParte.codigo] = { nombre: p.tipoParte.nombre, partes: [] };
    maestrosGroups[p.tipoParte.codigo].partes.push(p);
  });

  Object.values(maestrosGroups).forEach((group, idx) => {
    // Si requiere ayudante (Ej: conversaciones_1)
    const partes = group.partes;
    const isDiscurso = group.nombre.toLowerCase().includes('discurso');
    
    let principalText = '';
    let auxiliarText = '';

    const getPair = (sala) => {
      const titular = partes.find(p => p.sala === sala && p.rolSlot === 'titular')?.persona?.nombre || '---';
      const ayudante = partes.find(p => p.sala === sala && p.rolSlot === 'ayudante')?.persona?.nombre;
      return ayudante ? `${titular} / ${ayudante}` : titular;
    };

    if (partes.some(p => p.sala === 'principal')) principalText = getPair('principal');
    if (partes.some(p => p.sala === 'auxiliar')) auxiliarText = getPair('auxiliar');

    maestrosHTML += `
    <div style="margin-bottom: 8px;">
      <div style="color: #B57F24; font-size: 16px;">${partNumber}. ${group.nombre}</div>
      <div style="display: flex; justify-content: space-around; margin-top: 5px; font-size: 13px;">
        ${principalText ? `
        <div style="text-align: center;">
          <div style="color: #B57F24; margin-bottom: 2px;">Sala Principal.</div>
          <div style="font-weight: bold;">${principalText}</div>
        </div>` : ''}
        ${auxiliarText ? `
        <div style="text-align: center;">
          <div style="color: #B57F24; margin-bottom: 2px;">Sala Auxiliar.</div>
          <div style="font-weight: bold;">${auxiliarText}</div>
        </div>` : ''}
      </div>
      ${idx < Object.keys(maestrosGroups).length - 1 ? `<div style="border-bottom: 1px dashed #B57F24; margin: 10px 20%;"></div>` : ''}
    </div>`;
    partNumber++;
  });


  // Procesar Vida Cristiana
  let vidaHTML = '';
  vidaCristiana.forEach(p => {
    if (p.tipoParte.codigo === 'estudio_congregacion') {
      const lector = vidaCristiana.find(vp => vp.tipoParte.codigo === 'lector_estudio');
      vidaHTML += `
      <div style="display: flex; margin-bottom: 8px;">
        <div style="color: #9A2B2C; font-size: 16px; flex-grow: 1;">${partNumber}. ${p.titulo || p.tipoParte.nombre}</div>
        <div style="font-size: 12px; text-align: right; line-height: 1.6;">
          <div><span style="color: #9A2B2C;">Conductor:</span> <b>${p.persona?.nombre || ''}</b></div>
          ${lector ? `<div><span style="color: #9A2B2C;">Lector:</span> <b>${lector.persona?.nombre || ''}</b></div>` : ''}
        </div>
      </div>`;
      partNumber++;
    } else if (p.tipoParte.codigo === 'lector_estudio') {
      // Ignorar, ya se procesó arriba
    } else if (p.tipoParte.codigo === 'oracion_final') {
      vidaHTML += `
      <div style="text-align: center; margin-top: 10px;">
        <div style="color: #9A2B2C; font-size: 16px;">Oración final.</div>
        <div style="font-weight: bold; font-size: 16px;">${p.persona?.nombre || ''}</div>
      </div>`;
    } else {
      vidaHTML += `
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <div style="color: #9A2B2C; font-size: 16px; flex-grow: 1;">${partNumber}. ${p.titulo || p.tipoParte.nombre}</div>
        <div style="font-weight: bold; font-size: 14px; text-align: right; min-width: 150px;">${p.persona?.nombre || ''}</div>
      </div>`;
      partNumber++;
    }
  });

  // Procesar Atalaya
  const presAtalaya = atalaya.find(p => p.tipoParte.codigo === 'presidente_atalaya')?.persona?.nombre || '';
  const condAtalaya = atalaya.find(p => p.tipoParte.codigo === 'conductor_atalaya')?.persona?.nombre || '';
  const lectAtalaya = atalaya.find(p => p.tipoParte.codigo === 'lector_atalaya')?.persona?.nombre || '';
  const oracAtalaya = atalaya.find(p => p.tipoParte.codigo === 'oracion_final_atalaya')?.persona?.nombre || '';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 30px 40px; color: black; background: white; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div style="text-align: center; margin-bottom: 15px;">
      <h1 style="font-size: 26px; font-weight: normal; margin: 0; letter-spacing: 1px;">VIDA Y MINISTERIO CRISTIANOS.</h1>
      <h2 style="font-size: 20px; font-weight: normal; margin: 8px 0;">${formatFechaEspanol(programa.semanaInicio, programa.semanaFin)}</h2>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
      <div style="text-align: left;">
        <p style="margin: 0; font-size: 15px;">Presidente.</p>
        <p style="margin: 0; font-size: 17px; font-weight: bold;">${presidente}</p>
      </div>
      ${consejeroAux ? `
      <div style="text-align: right;">
        <p style="margin: 0; font-size: 15px;">Consejero Sala Auxiliar.</p>
        <p style="margin: 0; font-size: 17px; font-weight: bold;">${consejeroAux}</p>
      </div>` : ''}
    </div>

    <!-- TESOROS -->
    <div style="background-color: #387B8A; color: white; display: flex; align-items: center; font-size: 13px; font-weight: bold; margin-bottom: 0;">
      <div style="display: flex; align-items: center; justify-content: center;">
        <img src="${getBase64Image('tesoros.png')}" style="height: 30px; object-fit: contain; display: block;" alt="Tesoros" />
      </div>
      <span style="flex-shrink: 0; text-transform: uppercase; margin-left: 10px;">TESOROS DE LA BIBLIA</span>
      <div style="flex-grow: 1; border-top: 1px dashed white; margin-left: 10px; margin-top: 2px; margin-right: 10px;"></div>
    </div>
    <div style="border: 1px solid #387B8A; border-top: none; padding: 15px; margin-bottom: 15px;">
      ${tesorosHTML}
    </div>

    <!-- MAESTROS -->
    <div style="background-color: #B57F24; color: white; display: flex; align-items: center; font-size: 13px; font-weight: bold; margin-bottom: 0;">
      <div style="display: flex; align-items: center; justify-content: center;">
        <img src="${getBase64Image('maestros.png')}" style="height: 30px; object-fit: contain; display: block;" alt="Maestros" />
      </div>
      <span style="flex-shrink: 0; text-transform: uppercase; margin-left: 10px;">Seamos Mejores Maestros</span>
      <div style="flex-grow: 1; border-top: 1px dashed white; margin-left: 10px; margin-top: 2px; margin-right: 10px;"></div>
    </div>
    <div style="border: 1px solid #B57F24; border-top: none; padding: 15px; margin-bottom: 15px;">
      ${maestrosHTML}
    </div>

    <!-- VIDA CRISTIANA -->
    <div style="background-color: #9A2B2C; color: white; display: flex; align-items: center; font-size: 13px; font-weight: bold; margin-bottom: 0;">
      <div style="display: flex; align-items: center; justify-content: center;">
        <img src="${getBase64Image('vida.png')}" style="height: 30px; object-fit: contain; display: block;" alt="Vida Cristiana" />
      </div>
      <span style="flex-shrink: 0; text-transform: uppercase; margin-left: 10px;">Nuestra Vida Cristiana</span>
      <div style="flex-grow: 1; border-top: 1px dashed white; margin-left: 10px; margin-top: 2px; margin-right: 10px;"></div>
    </div>
    <div style="border: 1px solid #9A2B2C; border-top: none; padding: 15px; margin-bottom: 30px;">
      ${vidaHTML}
    </div>

    <!-- ATALAYA -->
    <div style="page-break-inside: avoid;">
      <div style="text-align: center; margin-top: 20px;">
        <h1 style="font-size: 24px; font-weight: normal; margin: 0;">ESTUDIO DE LA ATALAYA</h1>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 16px; border-left: 2px solid black; border-right: 2px solid black; padding: 0 15px; margin-top: 15px;">
        <div>
          <div style="font-weight: bold;">Presidente</div>
          <div>Conductor</div>
          <div>Lector</div>
          <div>Oración final</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: bold;">${presAtalaya}</div>
          <div>${condAtalaya}</div>
          <div>${lectAtalaya}</div>
          <div>${oracAtalaya}</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  // Lanzar Puppeteer
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });
  await browser.close();

  return pdfBuffer;
}

module.exports = {
  generateProgramPDF,
};
