export default (sequelize, Sequelize) => {
  const CustomerBusinessCards = sequelize.define('customer_business_cards', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    customer_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id',
      },
    },
    business_card: {
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

  return CustomerBusinessCards;
};
