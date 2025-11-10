

export default (sequelize, Sequelize) => {
    const Faqs = sequelize.define('faqs', {
        id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        question: {
            type: Sequelize.STRING,
            allowNull: false
        },
        answer: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        is_published: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        is_deleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        created_by: {
            type: Sequelize.BIGINT,
            allowNull: true
        },
        updated_by: {
            type: Sequelize.BIGINT,
            allowNull: true
        },
        createdAt: { field: 'created_at', type: Sequelize.DATE, allowNull: false },
        updatedAt: { field: 'updated_at', type: Sequelize.DATE, allowNull: false },
    });
    return Faqs;
};
