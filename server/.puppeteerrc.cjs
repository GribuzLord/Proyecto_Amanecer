const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Configuración necesaria para que Render guarde el navegador 
  // Chromium en la carpeta del proyecto y no lo borre al iniciar.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
