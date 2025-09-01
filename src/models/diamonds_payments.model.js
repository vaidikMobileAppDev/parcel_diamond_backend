export default (sequelize, Sequelize) => {
  const DiamondsPayments = sequelize.define('diamonds_payments', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    diamond_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'diamonds',
        key: 'id',
      },
    },
    amount: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    paid_payemnt: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    pending_payment: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    payment_type: {
      type: Sequelize.ENUM('cash', 'digital'),
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
  return DiamondsPayments;
};
