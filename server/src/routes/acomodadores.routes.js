const express = require('express');
const acomodadoresController = require('../controllers/acomodadoresController');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/generar-pdf', acomodadoresController.generarAcomodadoresPdf);

module.exports = router;
