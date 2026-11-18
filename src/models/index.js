// Inicializa o Sequelize, registra os models e define as associações.
const { Sequelize, DataTypes } = require("sequelize");
const dbConfig = require("../config/database");

const env = process.env.NODE_ENV || "development";
const cfg = dbConfig[env];

const sequelize =
  cfg.dialect === "sqlite"
    ? new Sequelize(cfg)
    : new Sequelize(cfg.database, cfg.username, cfg.password, cfg);

const User = require("./user")(sequelize, DataTypes);
const Category = require("./category")(sequelize, DataTypes);
const Product = require("./product")(sequelize, DataTypes);
const ProductImage = require("./productImage")(sequelize, DataTypes);
const ProductOption = require("./productOption")(sequelize, DataTypes);
const ProductCategory = require("./productCategory")(sequelize, DataTypes);

// 1:N produto -> imagens / opções (remoção em cascata)
Product.hasMany(ProductImage, {
  as: "images",
  foreignKey: "product_id",
  onDelete: "CASCADE",
});
ProductImage.belongsTo(Product, { foreignKey: "product_id" });
Product.hasMany(ProductOption, {
  as: "options",
  foreignKey: "product_id",
  onDelete: "CASCADE",
});
ProductOption.belongsTo(Product, { foreignKey: "product_id" });

// N:N produto <-> categoria
Product.belongsToMany(Category, {
  through: ProductCategory,
  as: "categories",
  foreignKey: "product_id",
  otherKey: "category_id",
});
Category.belongsToMany(Product, {
  through: ProductCategory,
  as: "products",
  foreignKey: "category_id",
  otherKey: "product_id",
});

module.exports = {
  sequelize,
  Sequelize,
  User,
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
};
