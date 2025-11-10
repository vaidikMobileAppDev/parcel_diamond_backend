export default (sequelize, Sequelize) => {
  const Shape = sequelize.define('shapes', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    shape: {
      type: Sequelize.STRING,
    },
    status: {
      type: Sequelize.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
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

  Shape.associate = (models) => {
    Shape.hasMany(models.SieveSize, {
      foreignKey: 'shape_id',
      as: 'sieveSizesDetail',
    });
  };

  return Shape;
};
