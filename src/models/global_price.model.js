export default (sequelize, Sequelize) => {
  const GlobalPrice = sequelize.define('global_prices', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    currency: {
      type: Sequelize.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue('currency', value.toLowerCase());
      },
    },
    price: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    compare_currency: {
      type: Sequelize.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue('compare_currency', value.toLowerCase());
      },
    },
    compare_price: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
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
  return GlobalPrice;
};
