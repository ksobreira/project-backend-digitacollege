const { Router } = require('express');
const ctrl = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

// Rotas públicas: gerar token e cadastrar usuário (senão ninguém conseguiria obter um token)
router.post('/token', asyncHandler(ctrl.token)); // precisa vir antes de /:id
router.post('/', asyncHandler(ctrl.create));
router.get('/:id', asyncHandler(ctrl.show));

// Rotas protegidas
router.put('/:id', authenticate, asyncHandler(ctrl.update));
router.delete('/:id', authenticate, asyncHandler(ctrl.remove));

module.exports = router;
