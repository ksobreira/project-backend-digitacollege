// Ponto de entrada: valida a conexão com o banco e sobe o servidor HTTP.
const app = require('./app');
const config = require('./config');
const { sequelize } = require('./models');

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida');
    app.listen(config.port, () => {
      console.log(`API rodando em ${config.baseUrl}`);
      console.log(`Documentação Swagger em ${config.baseUrl}/api-docs`);
    });
  } catch (err) {
    console.error('Falha ao conectar no banco de dados:', err.message);
    process.exit(1);
  }
}

start();
