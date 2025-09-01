import randToken from 'rand-token';
const { suid } = randToken;
import config from '../config/config.js';
import jwt from 'jsonwebtoken';

export default (sequelize, Sequelize) => {
  const CustomerSession = sequelize.define('customer_sessions', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    customer_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'customers',
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
  });

  CustomerSession.createSessionToken = async (customer_id, device_id) => {
    const sessionToken = jwt.sign(
      { token: customer_id + suid(99) },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshTokenExpireTime,
      }
    );
    await CustomerSession.update(
      {
        session_token: sessionToken,
      },
      {
        where: {
          customer_id: customer_id,
          device_id: device_id,
        },
      }
    );
    return sessionToken;
  };
  CustomerSession.createToken = async (customer_id, device_id) => {
    const refreshToken = jwt.sign(
      { id: customer_id, token: customer_id + suid(99) },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshTokenExpireTime,
      }
    );
    const checkExistDevice = await CustomerSession.findOne({
      where: {
        customer_id: customer_id,
        device_id: device_id,
      },
    });
    if (checkExistDevice) {
      await CustomerSession.update(
        {
          token: refreshToken,
        },
        {
          where: {
            customer_id: customer_id,
            device_id: device_id,
          },
        }
      );
    } else {
      await CustomerSession.create({
        token: refreshToken,
        customer_id: customer_id,
        device_id: device_id,
      });
    }
    return refreshToken;
  };
  return CustomerSession;
};
