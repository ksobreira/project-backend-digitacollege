const { Router } = require('express');

const router = Router();

router.use('/v1/user', require('./userRoutes'));
router.use('/v1/category', require('./categoryRoutes'));
router.use('/v1/product', require('./productRoutes'));

module.exports = router;
