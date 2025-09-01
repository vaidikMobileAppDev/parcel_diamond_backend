export default (sequelize, Sequelize) => {
  const DiamondsGrade = sequelize.define('diamonds_grades', {
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
    shape: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    color: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    clarity: {
      type: Sequelize.STRING,
      allowNull: false,
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
  return DiamondsGrade;
};
