export default (sequelize, Sequelize) => {
  const Countries = sequelize.define('countries', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    country_name: {
      type: Sequelize.STRING,
    },
    code: {
      type: Sequelize.STRING,
    },
    dial_code: {
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
  return Countries;
};
