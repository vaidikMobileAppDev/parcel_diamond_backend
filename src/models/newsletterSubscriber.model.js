export default (sequelize, Sequelize) => {
    const NewsletterSubscriber = sequelize.define('newsletter_subscriber', {
        id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        },
        name: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        is_subscribed: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        unsubscribe_token: {
            type: Sequelize.STRING,
            allowNull: true,
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

    return NewsletterSubscriber;
};
