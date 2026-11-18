const { Router } = require('express');
const ctrl = require('../controllers/productController');
const authenticate = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.get('/search', asyncHandler(ctrl.search)); 
router.get('/:id', asyncHandler(ctrl.show));

router.post('/', authenticate, asyncHandler(ctrl.create));
router.put('/:id', authenticate, asyncHandler(ctrl.update));
router.delete('/:id', authenticate, asyncHandler(ctrl.remove));

module.exports = router;
