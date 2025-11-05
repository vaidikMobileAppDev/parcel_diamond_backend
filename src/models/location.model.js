export default (sequelize, DataTypes) => {
  const Location = sequelize.define(
    'locations',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: true },
      country: { type: DataTypes.INTEGER, allowNull: false },
      address: { type: DataTypes.TEXT, allowNull: true },
      city: { type: DataTypes.STRING, allowNull: true },
      state: { type: DataTypes.STRING, allowNull: true },
      postal_code: { type: DataTypes.STRING, allowNull: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      contact_person: { type: DataTypes.STRING, allowNull: true },
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
      tableName: 'locations',
      timestamps: true,
      paranoid: true,
      indexes: [{ fields: ['country'] }],
    }
  );

  Location.associate = (models) => {
    Location.belongsTo(models.Country, {
      foreignKey: 'country',
      as: 'countryDetail',
    });
  };

  return Location;
};
