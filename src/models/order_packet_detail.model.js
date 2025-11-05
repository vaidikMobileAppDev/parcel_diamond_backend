export default (sequelize, Sequelize) => {
  const Order_packet_detail = sequelize.define('order_packet_details', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      packet_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      order_id: {
        type: Sequelize.BIGINT,
        allowNull: true      
      },
      lot_id: {
        type: Sequelize.BIGINT,
        allowNull: true      
      },
      purchase: { type: Sequelize.BIGINT, allowNull: true },
      grade: { type: Sequelize.BIGINT, allowNull: true },
      qrCode: { type: Sequelize.STRING, allowNull: false, unique: true },
      weight: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      onBookWeight: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      offBookWeight: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      isOnBookFlag: {
        type: Sequelize.ENUM('on_book', 'off_book', 'mix'),
        allowNull: false,
        defaultValue: 'on_book',
      },
      isUnpacked: { type: Sequelize.BOOLEAN, defaultValue: false },
      remainingWeight: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      location: { type: Sequelize.BIGINT, allowNull: true },
      price : { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      currency : { type: Sequelize.STRING, allowNull: true },
      isAvailableForStore: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      availableSince: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      availableBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      meta: { type: Sequelize.JSONB, allowNull: true },
      current_status :{
        type: Sequelize.ENUM('available', 'unavailable', 'sold', 'hold'),
        allowNull: true
      },
      status_id :{
        type: Sequelize.BIGINT,
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

  Order_packet_detail.associate = (models) => {  

    Order_packet_detail.belongsTo(models.DiamondLot, {
      foreignKey: 'lot_id',
        as: 'lotDetail',
    });
  };

  return Order_packet_detail;
};
