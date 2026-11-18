"use strict";
// Dados de demonstração: 1 usuário (admin@mail.com / 123@123) e 3 categorias.
const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert("users", [
      {
        firstname: "Admin",
        surname: "Demo",
        email: "admin@mail.com",
        password: await bcrypt.hash("123@123", 10),
        created_at: now,
        updated_at: now,
      },
    ]);
    await queryInterface.bulkInsert("categories", [
      {
        name: "Shoes",
        slug: "shoes",
        use_in_menu: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Offers",
        slug: "offers",
        use_in_menu: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Black Friday",
        slug: "black-friday",
        use_in_menu: false,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("categories", null, {});
    await queryInterface.bulkDelete("users", { email: "admin@mail.com" }, {});
  },
};
