export default (sequelize, Sequelize) => {
  const EmployeePermissions = sequelize.define('employee_permissions', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    admin_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id',
      },
    },
    admin_panel_permission_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'admin_panel_permissions',
        key: 'id',
      },
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
  return EmployeePermissions;
};
