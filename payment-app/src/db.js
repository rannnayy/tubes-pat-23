const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
});

const Log = sequelize.define('Log', {
    invoiceId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    bookingId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
    },
});

const Invoice = sequelize.define('Invoice', {
    invoiceId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    bookingId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    webhookUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true }); // Synchronize the database with the model
        // update the databse with model
        console.log('Connected to the database');
    } catch (error) {
        console.error('Database connection error:', error);
    }
})();

module.exports = { sequelize, Invoice, Log };
