export default (sequelize, Sequelize) => {
    const General_enquiry = sequelize.define('general_enquiry', {
        id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING,
            allowNull: true
        },
        mobcode: {
            type: Sequelize.STRING,
            allowNull: true
        },
        mobileno: {
            type: Sequelize.STRING,
            allowNull: true
        },
        company_name: {
            type: Sequelize.STRING,
            allowNull: true
        },
        message: {
            type: Sequelize.STRING,
            allowNull: false
        },
        is_deleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        createdAt: {
            field: 'created_at',
            type: Sequelize.DATE,
            allowNull: false,
        },
        updatedAt: {
            field: 'updated_at',
            type: Sequelize.DATE,
            allowNull: false,
        },
    });
    return General_enquiry;
};
