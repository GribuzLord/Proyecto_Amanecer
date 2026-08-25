const express = require('express');
const programController = require('../controllers/programController');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', programController.getAllProgramas);
router.get('/historial/tablero', programController.getHistorial);
router.post('/generar', programController.generarPrograma);
router.get('/:id', programController.getPrograma);
router.get('/:id/pdf', programController.exportarPdf);
router.get('/:id/hojitas', programController.exportarHojitasPdf);
router.patch('/:id', programController.updatePrograma);
router.patch('/:id/toggle-custom', programController.toggleCustomSection);
router.post('/:id/finalizar', programController.finalizarPrograma);
router.post('/:id/partes-custom', programController.addCustomParte);
router.delete('/:id/partes-custom/:grupoCustom', programController.deleteCustomParte);
router.patch('/:id/partes/:parteId', programController.updateParte);
router.delete('/:id', programController.deletePrograma);

module.exports = router;
