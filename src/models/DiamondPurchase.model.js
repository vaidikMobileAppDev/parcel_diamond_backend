import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DiamondPurchase extends Model {
    static associate(models) {
      DiamondPurchase.belongsTo(models.Supplier, {
        foreignKey: 'supplier',
        as: 'suppliers',
      });
      DiamondPurchase.hasMany(models.DiamondLot, {
        foreignKey: 'purchase',
        as: 'lots',
      });
      DiamondPurchase.hasMany(models.DiamondPacket, {
        foreignKey: 'purchase',
        as: 'packets',
      });
      DiamondPurchase.hasMany(models.DiamondPayment, {
        foreignKey: 'purchase',
        as: 'payments',
      });

      DiamondPurchase.belongsTo(models.Location, {
        foreignKey: 'purchaseLocation',
        as: 'purchaseLocationDetail',
      });
    }
  }
  DiamondPurchase.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      supplier: { type: DataTypes.INTEGER, allowNull: true },
      invoiceNumber: { type: DataTypes.STRING, allowNull: true },
      invoiceFile: { type: DataTypes.STRING, allowNull: true },

      totalWeight: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        comment: 'Total carat of purchase',
      },
      // totalQuantity: { type: DataTypes.INTEGER, allowNull: true },

      actualPrice: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: true,
        comment: 'Gross price in purchase currency',
      },
      purchasePrice: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: true,
        comment: 'Final paid price after discounts',
      },

      buyCurrency: { type: DataTypes.STRING(8), allowNull: false },
      buyCurrencyRate: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        comment: 'Exchange rate to user base currency at buy time',
      },

      purchaseDate: { type: DataTypes.DATEONLY, allowNull: false },

      paymentTermsDays: { type: DataTypes.INTEGER, allowNull: true },
      paidAmount: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: true,
        defaultValue: 0.0,
      },

      purchaseLocation: { type: DataTypes.INTEGER, allowNull: true },
      diamondType: {
        type: DataTypes.ENUM('natural', 'labgrown'),
        allowNull: false,
        defaultValue: 'natural',
      },

      isOnBook: {
        type: DataTypes.ENUM('on_book', 'off_book', 'mixed'),
        allowNull: false,
        defaultValue: 'on_book',
      },

      notes: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },

      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiamondPurchase',
      tableName: 'diamond_purchases',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['purchaseDate'] },
        { fields: ['purchaseLocation'] },
        { fields: ['id'] },
        { fields: ['supplier'] },
      ],
    }
  );

  return DiamondPurchase;
};
