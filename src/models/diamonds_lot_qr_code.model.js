export default (sequelize, Sequelize) => {
  const DiamondsLotsQRCodes = sequelize.define('diamonds_lots_qr_codes', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    diamond_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'diamonds',
        key: 'id',
      },
    },
    diamond_lot_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'diamonds_lots',
        key: 'id',
      },
    },
    weight: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    is_deleted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_unpacked: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      field: 'created_at',
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      field: 'updated_at',
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  return DiamondsLotsQRCodes;
};
