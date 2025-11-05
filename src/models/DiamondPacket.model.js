import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DiamondPacket extends Model {
    static associate(models) {
      DiamondPacket.belongsTo(models.DiamondLot, {
        foreignKey: 'lot',
        as: 'lotDetail',
      });
      DiamondPacket.belongsTo(models.DiamondPurchase, {
        foreignKey: 'purchase',
        as: 'purchaseDetail',
      });
      DiamondPacket.belongsTo(models.DiamondGrade, {
        foreignKey: 'grade',
        as: 'gradeDetail',
      });
      DiamondPacket.hasMany(models.PacketSource, {
        foreignKey: 'newPacket',
        as: 'sources',
      });
      DiamondPacket.belongsTo(models.Location, {
        foreignKey: 'location',
        as: 'locationDetail',
      });
      DiamondPacket.belongsTo(models.Packet_status, {
        foreignKey: 'status_id',
        as: 'statusDetail',
      });
    }
  }

  DiamondPacket.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      lot: { type: DataTypes.BIGINT, allowNull: true },
      purchase: { type: DataTypes.BIGINT, allowNull: true },
      grade: { type: DataTypes.BIGINT, allowNull: true },

      qrCode: { type: DataTypes.STRING, allowNull: false, unique: true },

      weight: { type: DataTypes.DECIMAL(14, 2), allowNull: false },

      onBookWeight: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      offBookWeight: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },

      isOnBookFlag: {
        type: DataTypes.ENUM('on_book', 'off_book', 'mix'),
        allowNull: false,
        defaultValue: 'on_book',
      },

      isUnpacked: { type: DataTypes.BOOLEAN, defaultValue: false },

      remainingWeight: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      location: { type: DataTypes.BIGINT, allowNull: true },

      isAvailableForStore: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      availableSince: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      availableBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_status :{
        type: DataTypes.ENUM('available', 'unavailable', 'sold', 'hold'),
        allowNull: true
      },
      status_id :{
        type: DataTypes.BIGINT,
        allowNull: true
      },
      meta: { type: DataTypes.JSONB, allowNull: true },

      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiamondPacket',
      tableName: 'diamond_packets',
      timestamps: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ['qrCode'] },
        { fields: ['lot'] },
        { fields: ['grade'] },
        { fields: ['isOnBookFlag'] },
        { fields: ['location'] },
        { fields: ['isAvailableForStore', 'location'] },
      ],
    }
  );

  return DiamondPacket;
};
