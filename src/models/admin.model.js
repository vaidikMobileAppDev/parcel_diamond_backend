import bcrypt from 'bcrypt';
import config from '../config/config.js';

export default (sequelize, Sequelize) => {
  const Admin = sequelize.define(
    'admins',
    {
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
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
        set(value) {
          let bcryptPass = bcrypt.hashSync(value, Number(config.bcrypt.salt));
          this.setDataValue('password', bcryptPass);
        },
      },
      role: {
        type: Sequelize.ENUM('superadmin', 'admin', 'employee'),
        allowNull: false,
        defaultValue: 'employee',
      },
      sub_role: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      country: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      office: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_inactive_by_admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_account_deleted: {
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
    },
    {
      tableName: 'admins',
    }
  );

  return Admin;
};
