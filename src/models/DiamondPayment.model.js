import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DiamondPayment extends Model {
    static associate(models) {
      DiamondPayment.belongsTo(models.DiamondPurchase, {
        foreignKey: 'purchase',
        as: 'purchaseDetail',
      });
       
    }
  }

  DiamondPayment.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      purchase: { type: DataTypes.BIGINT, allowNull: false },
      amount: { type: DataTypes.DECIMAL(18, 4), allowNull: false },
      paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
      paymentType: {
        type: DataTypes.ENUM('cash', 'digital', 'bank', 'cheque'),
        allowNull: false,
      },

      note: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiamondPayment',
      tableName: 'diamond_payments',
      timestamps: true,
    }
  );

  return DiamondPayment;
};
