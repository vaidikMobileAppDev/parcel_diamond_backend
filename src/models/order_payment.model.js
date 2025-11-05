export default (sequelize, Sequelize) => {
  const Order_payment = sequelize.define('order_payments', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    order_id: {
      type: Sequelize.BIGINT,
      allowNull: false      
    },
    token:{
      type: Sequelize.STRING,
      allowNull: true
    },
    transaction_id:{
      type: Sequelize.STRING,
      allowNull: true
    },
    card_type:{
      type: Sequelize.STRING,
      allowNull: true
    },
    card_last_4_digit:{
      type: Sequelize.STRING,
      allowNull: true
    },
    payment_response : {
      type: Sequelize.STRING,
      allowNull: true
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
  return Order_payment;
};
