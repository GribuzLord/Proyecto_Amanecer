// Envuelve controladores async para no repetir try/catch en cada uno
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
