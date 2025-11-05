export default (sequelize, DataTypes) => {
  const Region = sequelize.define(
    'regions',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        field: 'created_at',
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        field: 'updated_at',
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'regions',
      timestamps: true,
      paranoid: true,
      indexes: [{ fields: ['name'] }],
    }
  );

  Region.associate = (models) => {
    if (models.RegionCountry && models.Country) {
      Region.belongsToMany(models.Country, {
        through: models.RegionCountry,
        foreignKey: 'region',
        otherKey: 'country',
        as: 'countries',
      });
    }
  };

  return Region;
};
