const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('greenbookdb', 'postgres', 'frt1071', {
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    logging: false,
});

module.exports = sequelize;
