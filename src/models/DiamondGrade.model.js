import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DiamondGrade extends Model {
    static associate(models) {
      DiamondGrade.hasMany(models.DiamondLot, {
        foreignKey: 'grade',
        as: 'lots',
      });
      DiamondGrade.hasMany(models.DiamondPacket, {
        foreignKey: 'grade',
        as: 'packets',
      });
      DiamondGrade.belongsTo(models.Shape, {
        foreignKey: 'shape',
        as: 'shapeDetail',
      });
      DiamondGrade.belongsTo(models.Color, {
        foreignKey: 'color',
        as: 'colorDetail',
      });
      DiamondGrade.belongsTo(models.Clarity, {
        foreignKey: 'clarity',
        as: 'clarityDetail',
      });
    }
  }
  DiamondGrade.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      shape: { type: DataTypes.INTEGER, allowNull: false },
      color: { type: DataTypes.INTEGER, allowNull: false },
      clarity: { type: DataTypes.INTEGER, allowNull: false },

      code: { type: DataTypes.STRING(64), allowNull: true },

      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiamondGrade',
      tableName: 'diamond_grades',
      timestamps: true,
      paranoid: true,
      indexes: [{ unique: true, fields: ['shape', 'color', 'clarity'] }],
    }
  );

  return DiamondGrade;
};
 