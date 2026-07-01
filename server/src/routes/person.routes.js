const express = require('express');
const personController = require('../controllers/personController');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect); // cualquier usuario autenticado gestiona SU propio personal

router.get('/', personController.getAllPersonas);
router.post('/', personController.createPersona);
router.patch('/:id', personController.updatePersona);
router.delete('/:id', personController.deletePersona);

module.exports = router;
