// Tabela associativa N:N entre produtos e categorias (chave primária composta).
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "ProductCategory",
    {
      product_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
    },
    { tableName: "product_categories", timestamps: false, underscored: true },
  );
