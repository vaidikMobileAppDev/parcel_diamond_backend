export default (sequelize, Sequelize) => {
  const SieveSize = sequelize.define('sieve_sizes', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    shape_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'shapes',
        key: 'id',
      },
    },
    size: {
      type: Sequelize.STRING,
    },
    is_deleted: {
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

  SieveSize.associate = (models) => {
    SieveSize.belongsTo(models.Shape, {
      foreignKey: 'shape_id',
      as: 'shapeDetail',
    });
  };

  return SieveSize;
};
