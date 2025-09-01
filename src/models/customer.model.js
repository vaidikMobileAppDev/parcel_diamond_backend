import bcrypt from 'bcrypt';
import config from '../config/config.js';

export default (sequelize, Sequelize) => {
  const Customer = sequelize.define('customers', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    country_code: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    phone_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    country: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    company_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    customer_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_class_code: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_class_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_phone_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_website: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_card: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_certificate: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    note: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    display_order: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    shipping_address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    billing_address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    kyc_date: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    kyc_exp_date: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    profile: {
      type: Sequelize.STRING,
      allowNull: true,
      get(value) {
        const fileName = this.getDataValue(value);
        if (fileName) {
          return config.bucket.url + 'profile/' + fileName;
        } else {
          return null;
        }
      },
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
      set(value) {
        let bcryptPass = bcrypt.hashSync(value, Number(config.bcrypt.salt));
        this.setDataValue('password', bcryptPass);
      },
    },
    otp: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    forgot_pass_token: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    forgot_pass_otp: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('pending', 'approved', 'declined'),
      allowNull: false,
      defaultValue: 'pending',
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
  });

  return Customer;
};
