import randToken from 'rand-token';
const { suid } = randToken;
import config from '../config/config.js';
import jwt from 'jsonwebtoken';

export default (sequelize, Sequelize) => {
  const AdminSession = sequelize.define(
    'admin_sessions',
    {
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
      session_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      socket_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      device_id: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      fcm_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      device_type: {
        type: Sequelize.ENUM('web', 'ios', 'android'),
        allowNull: false,
        defaultValue: 'web',
      },
      last_active_user_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
      is_logout: {
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
      tableName: 'admin_sessions',
    }
  );

  //Refer : https://stackoverflow.com/a/50291209/7493808
  AdminSession.createSessionToken = async (adminId, device_id) => {
    const sessionToken = jwt.sign(
      { token: adminId + suid(99) },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshTokenExpireTime,
      }
    );
    await AdminSession.update(
      {
        session_token: sessionToken,
      },
      {
        where: {
          admin_id: adminId,
          device_id: device_id,
        },
      }
    );
    return sessionToken;
  };
  AdminSession.createToken = async (adminId, device_id) => {
    const refreshToken = jwt.sign(
      { id: adminId, token: adminId + suid(99) },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshTokenExpireTime,
      }
    );
    const checkExistDevice = await AdminSession.findOne({
      where: {
        admin_id: adminId,
        device_id: device_id,
      },
    });
    if (checkExistDevice) {
      await AdminSession.update(
        {
          token: refreshToken,
        },
        {
          where: {
            admin_id: adminId,
            device_id: device_id,
          },
        }
      );
    } else {
      var adminSession = await AdminSession.create({
        token: refreshToken,
        admin_id: adminId,
        device_id: device_id,
      });
    }
    return refreshToken;
  };
  return AdminSession;
};
