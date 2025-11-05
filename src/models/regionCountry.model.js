export default (sequelize, DataTypes) => {
  const RegionCountry = sequelize.define(
    'region_countries',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      region: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'regions',
          key: 'id',
        },
      },
      country: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'countries',
          key: 'id',
        },
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
      tableName: 'region_countries',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['region', 'country'] },
        { fields: ['country'] },
      ],
    }
  );

  RegionCountry.associate = (models) => {
    RegionCountry.belongsTo(models.Region, {
      foreignKey: 'region',
      as: 'regionDetail',
    });
    RegionCountry.belongsTo(models.Country, {
      foreignKey: 'country',
      as: 'countryDetail',
    });
  };

  return RegionCountry;
};
