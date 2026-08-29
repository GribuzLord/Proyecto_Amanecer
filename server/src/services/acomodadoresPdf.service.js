const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');
const { User, Persona, Programa, PartePrograma, TipoParte } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/AppError');

const jsDayMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };

function getDatesForDay(year, month, userDay) {
  const jsDay = jsDayMap[userDay];
  const dates = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === jsDay) {
      dates.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

// Convert date to YYYY-MM-DD local
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function generarPdfAcomodadores(userId, year, month) {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("Usuario no encontrado");

  // Fechas del mes
  const fechasEntreSemana = getDatesForDay(year, month, user.diaEntreSemana);
  const fechasFinSemana = getDatesForDay(year, month, user.diaFinSemana);

  // Juntar todas y ordenarlas
  const allDates = [...fechasEntreSemana, ...fechasFinSemana].sort((a, b) => a - b);

  // Obtener personas
  const personas = await Persona.findAll({
    where: { userId, activo: true, apoyaAcomodador: true },
    order: [['ultima_asignacion_acomodador', 'ASC'], ['nombre', 'ASC']]
  });

  if (personas.length < 3) {
    throw new AppError('No tienes suficientes varones habilitados como acomodadores. Ve a la sección de Hermanos y habilita la casilla "¿Apoya como acomodador?" en al menos tres personas.', 400);
  }

  const principales = personas.filter(p => p.privilegio === 'anciano' || p.privilegio === 'siervo_ministerial');
  const pasillos = [...personas]; // Todos pueden ser pasillo

  // Obtener programas del mes
  // Un programa de entre semana tiene semanaInicio y semanaFin
  // Como simplificación, buscaremos los programas cuyas fechas de inicio caigan cerca.
  const inicioMes = new Date(year, month, 1);
  const finMes = new Date(year, month + 1, 0);

  const programas = await Programa.findAll({
    where: {
      userId,
      semanaInicio: { [Op.lte]: toDateStr(finMes) },
      semanaFin: { [Op.gte]: toDateStr(inicioMes) }
    },
    include: [{
      model: PartePrograma,
      as: 'partes',
      include: [{ model: TipoParte, as: 'tipoParte' }, { model: Persona, as: 'persona' }]
    }]
  });

  const asignaciones = [];

  // Mapa para rastrear fechas en memoria y evitar problemas con instancias de Sequelize
  const fechasMemoria = new Map();
  personas.forEach(p => {
    fechasMemoria.set(p.id, p.ultimaAsignacionAcomodador);
  });

  for (const date of allDates) {
    const dateStr = toDateStr(date);
    const isEntreSemana = fechasEntreSemana.some(d => d.getTime() === date.getTime());

    // Buscar si hay programa para esta semana
    const prog = programas.find(p => p.semanaInicio <= dateStr && p.semanaFin >= dateStr);

    const ocupadosIds = new Set();
    if (prog) {
      prog.partes.forEach(parte => {
        if (!parte.personaId) return;
        // Solo excluimos a los que tienen presidencia o lectores
        const code = parte.tipoParte.codigo;
        const exclusions = ['presidente', 'presidente_atalaya', 'lector_estudio', 'lector_atalaya'];
        if (exclusions.includes(code)) {
          const esAtalaya = parte.tipoParte.seccion === 'atalaya';
          if (isEntreSemana && !esAtalaya) ocupadosIds.add(parte.personaId);
          if (!isEntreSemana && esAtalaya) ocupadosIds.add(parte.personaId);
        }
      });
    }

    const seleccionar = (lista, excluidosExtra) => {
      let disponibles = lista.filter(p => !ocupadosIds.has(p.id) && !excluidosExtra.has(p.id));
      if (disponibles.length === 0) {
        // Fallback: ignorar ocupaciones si no hay de otra
        disponibles = lista.filter(p => !excluidosExtra.has(p.id));
      }
      if (disponibles.length === 0) return null; // Nadie existe

      // Ordenar por ultima_asignacion_acomodador
      disponibles.sort((a, b) => {
        const dateA = fechasMemoria.get(a.id);
        const dateB = fechasMemoria.get(b.id);
        if (!dateA && !dateB) return 0;
        if (!dateA) return -1;
        if (!dateB) return 1;
        return new Date(dateA) - new Date(dateB);
      });

      const elegido = disponibles[0];
      fechasMemoria.set(elegido.id, dateStr); // Actualizar en memoria para siguientes fechas
      return elegido;
    };

    const yaAsignadosHoy = new Set();

    const pPrincipal = seleccionar(principales, yaAsignadosHoy);
    if (pPrincipal) yaAsignadosHoy.add(pPrincipal.id);

    const pIzq = seleccionar(pasillos, yaAsignadosHoy);
    if (pIzq) yaAsignadosHoy.add(pIzq.id);

    const pDer = seleccionar(pasillos, yaAsignadosHoy);
    if (pDer) yaAsignadosHoy.add(pDer.id);

    asignaciones.push({
      fecha: date,
      principal: pPrincipal?.nombre || '---',
      izquierdo: pIzq?.nombre || '---',
      derecho: pDer?.nombre || '---',
    });
  }

  // Guardar ultimaAsignacionAcomodador en base de datos para rotación persistente
  // Iteramos sobre personas y guardamos si la fecha en memoria es distinta a la de la BD
  for (const p of personas) {
    const fechaMemoria = fechasMemoria.get(p.id);
    if (fechaMemoria && fechaMemoria !== p.ultimaAsignacionAcomodador) {
      p.ultimaAsignacionAcomodador = fechaMemoria;
      await p.save();
    }
  }

  const mesStr = format(new Date(year, month, 1), 'MMMM yyyy', { locale: es }).toUpperCase();

  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f8ff; padding: 40px; margin: 0; color: #1e3a8a; }
      .container { background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; position: relative; border: 2px solid #e0f2fe; }
      
      .header { text-align: center; padding: 40px 20px 20px; position: relative; }
      .title { font-size: 38px; font-weight: 900; color: #0c4a6e; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
      
      .badge-container { display: flex; justify-content: center; margin-top: 15px; margin-bottom: 10px; }
      .badge { background-color: #38bdf8; color: white; padding: 8px 30px; border-radius: 5px; font-size: 18px; font-weight: bold; position: relative; display: inline-block; }
      .badge::before, .badge::after { content: ""; position: absolute; top: 50%; width: 40px; height: 2px; background-color: #38bdf8; transform: translateY(-50%); }
      .badge::before { left: -50px; }
      .badge::after { right: -50px; }
      
      .congregation { text-align: center; font-size: 18px; color: #0284c7; font-style: italic; margin-bottom: 30px; }
      
      .table-container { padding: 0 40px 30px; }
      table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; border: 1px solid #bae6fd; }
      th { background-color: #0ea5e9; color: white; padding: 15px 10px; font-weight: 600; text-align: center; font-size: 14px; border-right: 1px solid #38bdf8; }
      th:last-child { border-right: none; }
      td { padding: 14px 10px; text-align: center; font-size: 14px; border-bottom: 1px solid #e0f2fe; border-right: 1px solid #e0f2fe; color: #0f172a; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      td:first-child { font-weight: bold; color: #0369a1; }
      td:last-child { border-right: none; }
      tr { page-break-inside: avoid; }
      tr:last-child td { border-bottom: none; }
      tr:nth-child(even) { background-color: #f8fafc; }
      
      .footer { text-align: center; padding: 20px; color: #0284c7; font-style: italic; border-top: 1px solid #e0f2fe; margin-top: 20px; }
      .verse { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
      .ref { font-size: 14px; color: #38bdf8; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="title">ACOMODADORES</h1>
        <div class="badge-container">
          <div class="badge">${mesStr}</div>
        </div>
        <div class="congregation">Congregación ${user.nombreCongregacion || 'Amanecer'}</div>
      </div>
      
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Fecha
                </div>
              </th>
              <th>
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAdhAAAHYQGVw7i2AAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAVZJREFUWIXt1ztLJEEUhuHHyypeYEUWBEVMxGUQAwWRSTYzFmPXzMBQ/AEm/gIjwUAxNjE2ESMTEwMvKGrmYqAYyIB3gypBRtq2ZWBw6Q+KLrrrfPVS3V11DlVWXQU8xnGL668E1yTc/4PiJz3mcIdNLGArC0DSCiygEyU0pbQiCtFrHlMR6BAPaQBJK7COFexhMMVjGT24in6jmMEQlrCIf0nB9SnmsxjByQdjGt70n7ER2+8IsoOulHneaR1jAv10ythLtCc8+ynl46zNSlZp5QA5QA5QSYAeDFcLoEPY8dbwtxoALXjCOX5lCUw7Cz6rU0wKr2G1GgCEAyiz/qu/IAfIAXKA7wnwWhc04yheoVUot37gMfaT1Cbs/1doFNLxAvoxIGTX5ZlxCX0ovS1MWuOEWXWCbfSiG2fYx4FQ2OzioizmHjckV0ZZNCGs0D6Oo/n30QuM1Tnqi+CJyQAAAABJRU5ErkJggg==" width="22" height="22" alt="puerta" style="filter: brightness(0) invert(1);" />                  Puerta principal
                </div>
              </th>
              <th>◀ Lado izquierdo</th>
              <th>▶ Lado derecho</th>
            </tr>
          </thead>
          <tbody>
            ${asignaciones.map(a => `
              <tr>
                <td>${format(a.fecha, 'dd MMM', { locale: es })}</td>
                <td>${a.principal}</td>
                <td>${a.izquierdo}</td>
                <td>${a.derecho}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <div class="verse">"Háganlo todo de forma digna y ordenada."</div>
        <div class="ref">1 Corintios 14:40</div>
      </div>
    </div>
  </body>
  </html>
  `;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    scale: 0.95,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = { generarPdfAcomodadores };
