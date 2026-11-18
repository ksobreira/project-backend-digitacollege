"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("product_images", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      path: { type: Sequelize.STRING, allowNull: false }, // caminho relativo da imagem no servidor
    });
    await queryInterface.addIndex("product_images", ["product_id"], {
      name: "idx_product_images_product",
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("product_images");
  },
};
