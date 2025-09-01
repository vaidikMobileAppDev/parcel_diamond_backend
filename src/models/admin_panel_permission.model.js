export default (sequelize, Sequelize) => {
  const AdminPanelPermissions = sequelize.define('admin_panel_permissions', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    role_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    frontend_path: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    backend_path: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    fields: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    },
  });
  return AdminPanelPermissions;
};
