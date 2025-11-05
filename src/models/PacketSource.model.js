import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class PacketSource extends Model {
    static associate(models) {
      PacketSource.belongsTo(models.DiamondPacket, {
        foreignKey: 'newPacket',
        as: 'newPacketDetail',
      });
      PacketSource.belongsTo(models.DiamondPacket, {
        foreignKey: 'sourcePacket',
        as: 'sourcePacketDetail',
      });
      PacketSource.belongsTo(models.DiamondLot, {
        foreignKey: 'sourceLot',
        as: 'sourceLotDetail',
      });
    }
  }

  PacketSource.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      newPacket: { type: DataTypes.BIGINT, allowNull: false }, // the created packet
      sourcePacket: { type: DataTypes.BIGINT, allowNull: false }, // which previous packet contributed
      sourceLot: { type: DataTypes.BIGINT, allowNull: true },

      contributedOnBookWeight: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      contributedOffBookWeight: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },

      note: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'PacketSource',
      tableName: 'packet_sources',
      timestamps: true,
    }
  );

  return PacketSource;
};
