// Configuração do Express (sem listen, para poder ser importado pelos testes).
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const routes = require('./routes');
const swaggerDocument = require('./docs/swagger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Limite alto porque as imagens dos produtos chegam em base64 no JSON
app.use(express.json({ limit: '30mb' }));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/media', express.static(config.uploadDir)); // serve as imagens salvas
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
