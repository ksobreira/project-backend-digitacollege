// Model de usuário. A senha é armazenada como hash (bcrypt) e nunca é retornada por padrão.
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      firstname: { type: DataTypes.STRING, allowNull: false },
      surname: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
      defaultScope: { attributes: { exclude: ["password"] } },
    },
  );
