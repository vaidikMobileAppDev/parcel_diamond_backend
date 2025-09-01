export default (sequelize, Sequelize) => {
  const Diamonds = sequelize.define('diamonds', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    supplier_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id',
      },
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    invoice: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    invoice_number: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    total_quantity: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    total_weight: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    actual_price: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    discount_price: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    purchase_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: new Date(),
    },
    payment_terms_day: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    due_date: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    paid_payemnt: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
    },
    pending_payment: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
    },
    diamond_type: {
      type: Sequelize.ENUM('natural', 'labgrown'),
      allowNull: true,
    },
    is_active_for_store: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
  return Diamonds;
};
