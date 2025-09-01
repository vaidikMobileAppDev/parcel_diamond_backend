export default (sequelize, Sequelize) => {
  const CustomerRoles = sequelize.define('customer_roles', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    discount_on_price: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    free_shipping: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
  return CustomerRoles;
};
