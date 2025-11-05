import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class PricePerCaratRegion extends Model {
    static associate(models) {
      PricePerCaratRegion.belongsTo(models.Region, {
        foreignKey: 'region',
        as: 'regionDetail',
      });
      PricePerCaratRegion.belongsTo(models.Shape, {
        foreignKey: 'shape',
        as: 'shapeDetail',
      });
      PricePerCaratRegion.belongsTo(models.Color, {
        foreignKey: 'color',
        as: 'colorDetail',
      });
      PricePerCaratRegion.belongsTo(models.Clarity, {
        foreignKey: 'clarity',
        as: 'clarityDetail',
      });
      PricePerCaratRegion.belongsTo(models.SieveSize, {
        foreignKey: 'sieveSize',
        as: 'sieveSizeDetail',
      });
    }
  }

  PricePerCaratRegion.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      region: { type: DataTypes.BIGINT, allowNull: false },

      shape: { type: DataTypes.INTEGER, allowNull: false },
      color: { type: DataTypes.INTEGER, allowNull: false },
      clarity: { type: DataTypes.INTEGER, allowNull: false },
      sieveSize: { type: DataTypes.INTEGER, allowNull: false },

      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },

      price: { type: DataTypes.DECIMAL(18, 4), allowNull: false },

      meta: { type: DataTypes.JSONB, allowNull: true },

      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'PricePerCaratRegion',
      tableName: 'price_per_carat_regions',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['region'] },
        { fields: ['shape'] },
        { fields: ['color'] },
        { fields: ['clarity'] },
        { fields: ['sieveSize'] },
        { fields: ['region', 'shape', 'color', 'clarity', 'sieveSize'] },
        { fields: ['effectiveFrom'] },
      ],
    }
  );

  return PricePerCaratRegion;
};
