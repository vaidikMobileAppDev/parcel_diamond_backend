export default (sequelize, DataTypes) => {
  const CustomerCartItem = sequelize.define(
    'customer_cart_items',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      customer: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
      },
      lot: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'diamond_lots', key: 'id' },
      },
      zeroPointTwentyFivePacketCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      zeroPointFiftyPacketCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      oneCaratPacketCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CustomerCartItem',
      tableName: 'customer_cart_items',
      timestamps: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ['customer', 'lot'] },
        { fields: ['customer'] },
        { fields: ['lot'] },
      ],
    }
  );

  CustomerCartItem.associate = (models) => {
    CustomerCartItem.belongsTo(models.Customer, {
      foreignKey: 'customer',
      as: 'customerDetail',
    });

    CustomerCartItem.belongsTo(models.DiamondLot, {
      foreignKey: 'lot',
      as: 'lotDetail',
    });
  };

  return CustomerCartItem;
};
