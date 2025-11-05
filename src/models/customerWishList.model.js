export default (sequelize, DataTypes) => {
  const CustomerWishList = sequelize.define(
    'customer_wishlists',
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

      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CustomerWishList',
      tableName: 'customer_wishlists',
      timestamps: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ['customer', 'lot'] },
        { fields: ['customer'] },
        { fields: ['lot'] },
      ],
    }
  );

  CustomerWishList.associate = (models) => {
    CustomerWishList.belongsTo(models.Customer, {
      foreignKey: 'customer',
      as: 'customerDetail',
    });
    CustomerWishList.belongsTo(models.DiamondLot, {
      foreignKey: 'lot',
      as: 'lotDetail',
    });
  };

  return CustomerWishList;
};
