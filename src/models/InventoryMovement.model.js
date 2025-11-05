import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class InventoryMovement extends Model {
    static associate(models) {
      InventoryMovement.belongsTo(models.DiamondPacket, {
        foreignKey: 'packet',
        as: 'packetDetail',
      });
      InventoryMovement.belongsTo(models.DiamondLot, {
        foreignKey: 'lot',
        as: 'lotDetail',
      });
      InventoryMovement.belongsTo(models.DiamondPurchase, {
        foreignKey: 'purchase',
        as: 'purchaseDetail',
      });
    }
  }

  InventoryMovement.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      type: {
        type: DataTypes.ENUM('purchase', 'unpack', 'mix', 'sale', 'adjustment'),
        allowNull: false,
      },
      packet: { type: DataTypes.BIGINT, allowNull: true },

      lot: { type: DataTypes.BIGINT, allowNull: true },
      purchase: { type: DataTypes.BIGINT, allowNull: true },

      weightDelta: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      onBookDelta: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      offBookDelta: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },

      user: { type: DataTypes.INTEGER, allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'InventoryMovement',
      tableName: 'inventory_movements',
      timestamps: true,
    }
  );

  return InventoryMovement;
};
