export default (sequelize, Sequelize) => {
  const Order = sequelize.define('orders', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.BIGINT,
      allowNull: false      
    },
    payment_type:{
      type: Sequelize.STRING,
      allowNull: true
    },
    gross_amount : {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true
    },
    discount_amount : {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true
    },
    total_amount : {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true
    },
    shipping_charge : {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true
    },
    state_tax : {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true
    },
    local_tax : {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true
    },
    net_amount : {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true
    },
    invoice : {
      type: Sequelize.STRING,
      allowNull: true
    },
    currier_service : {
      type: Sequelize.STRING,
      allowNull: true
    },
    tracking_code : {
      type: Sequelize.STRING,
      allowNull: true
    },
    tracking_url : {
      type: Sequelize.STRING,
      allowNull: true
    },
    order_status : {
      type: Sequelize.BIGINT,
      allowNull: false
    },
    cancel_reason : {
      type: Sequelize.STRING,
      allowNull: true
    },
    remark : {
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

  Order.associate = (models) => {
    Order.belongsTo(models.Customer, {
      foreignKey: 'user_id',
      as: 'customerDetail',
    });

    Order.hasMany(models.Order_packet_detail, {
      foreignKey: 'order_id',
      as: 'packetDetail',
    });

    Order.belongsTo(models.Order_status_caption, {
      foreignKey: 'order_status',
      as: 'orderStatusDetail',
    });

    Order.hasMany(models.Order_address, {
      foreignKey: 'order_id',
      as: 'orderAddressDetail',
    });

  };

  return Order;
};
