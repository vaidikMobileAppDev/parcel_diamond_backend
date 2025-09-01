export default (sequelize, Sequelize) => {
  const Roles = sequelize.define('roles', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    sidebarIndex: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    sidebarStepOneIndex: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    tabbarIndex: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });
  return Roles;
};
