const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/me', userController.getMe);
router.patch('/me/config', userController.updateMyConfig);

// Solo el admin gestiona qué usuarios (congregaciones) tienen acceso
router.use(restrictTo('admin'));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
