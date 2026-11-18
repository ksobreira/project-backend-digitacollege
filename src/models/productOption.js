// A coluna "values" é reservada em SQL e pode colidir com métodos do Sequelize;
// por isso o atributo do model se chama optionValues (mapeado para a coluna "values").
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "ProductOption",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      shape: {
        type: DataTypes.ENUM("square", "circle"),
        allowNull: false,
        defaultValue: "square",
      },
      radius: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      type: {
        type: DataTypes.ENUM("text", "color"),
        allowNull: false,
        defaultValue: "text",
      },
      optionValues: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "values",
      },
    },
    { tableName: "product_options", timestamps: false, underscored: true },
  );
