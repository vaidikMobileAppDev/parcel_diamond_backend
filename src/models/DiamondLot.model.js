import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DiamondLot extends Model {
    static associate(models) {
      DiamondLot.belongsTo(models.DiamondPurchase, {
        foreignKey: 'purchase',
        as: 'purchaseDetail',
      });
      DiamondLot.belongsTo(models.DiamondGrade, {
        foreignKey: 'grade',
        as: 'gradeDetail',
      });
      DiamondLot.hasMany(models.DiamondPacket, {
        foreignKey: 'lot',
        as: 'packets',
      });
      DiamondLot.belongsTo(models.SieveSize, {
        foreignKey: 'sieveSize',
        as: 'sieveSizeDetail',
      });
    }
  }

  DiamondLot.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      purchase: { type: DataTypes.BIGINT, allowNull: true },

      grade: { type: DataTypes.BIGINT, allowNull: false },
      sieveSize: { type: DataTypes.INTEGER, allowNull: true },

      totalWeight: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      zeroPointTwentyFivePacketCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      zeroPointFiftyPacketCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      oneCaratPacketCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      unpackedWeight: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },

      meta: { type: DataTypes.JSONB, allowNull: true },

      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiamondLot',
      tableName: 'diamond_lots',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['grade'] },
        { fields: ['sieveSize'] },
        {
          fields: ['grade', 'sieveSize'],
        },
      ],
    }
  );

  return DiamondLot;
};
