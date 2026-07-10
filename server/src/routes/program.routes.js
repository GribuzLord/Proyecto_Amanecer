const express = require('express');
const programController = require('../controllers/programController');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', programController.getAllProgramas);
router.post('/generar', programController.generarPrograma);
router.get('/:id', programController.getPrograma);
router.get('/:id/pdf', programController.exportarPdf);
router.post('/:id/finalizar', programController.finalizarPrograma);
router.patch('/:id/partes/:parteId', programController.updateParte);
router.delete('/:id', programController.deletePrograma);

module.exports = router;
