import Validator from 'validatorjs';
import bcrypt from 'bcrypt';
import { errorResponse, successResponse } from '../../helpers/response.js';
import db from '../../config/db.config.js';
import sendMail from '../../helpers/mail.js';
import config from '../../config/config.js';
import { pagination } from '../../helpers/pagination.js';

const {
  Customer,
  Op,
  CustomerBusinessCard,
  CustomerBusinessCertificate,
  CustomerSession,
} = db;

const register = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      name: 'required',
      email: 'required',
      country_code: 'required',
      phone_no: 'required',
      company_name: 'required',
      customer_type: 'required',
      country: 'required',
      business_type: 'required',
      shipping_address: 'required',
      billing_address: 'required',
      note: 'required',
      business_class_code: 'required',
      business_class_name: 'required',
      business_phone_no: 'required',
      display_order: 'required',
      kyc_date: 'required',
      kyc_exp_date: 'required',
      password: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const files = req.files;

    if (!files || files.length == 0) {
      return errorResponse(res, 9006);
    }

    const {
      name,
      email,
      country_code,
      phone_no,
      company_name,
      customer_type,
      country,
      business_type,
      shipping_address,
      billing_address,
      note,
      business_class_code,
      business_class_name,
      business_phone_no,
      display_order,
      kyc_date,
      kyc_exp_date,
      password,
    } = req.body;

    const checkExistEmail = await Customer.findOne({
      where: {
        email: email,
      },
    });

    if (checkExistEmail) {
      return errorResponse(res, 1005);
    }

    let business_certificate;
    let business_card;

    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].fieldname == 'business_certificate') {
          business_certificate = await uploadFile(
            files[i],
            'customer/business_certificate'
          );
        } else if (files[i].fieldname == 'business_card') {
          business_card = await uploadFile(files[i], 'customer/business_card');
        } else {
          return errorResponse(res, 9006);
        }
      }
    }

    const data = {
      name,
      email,
      country_code,
      phone_no,
      company_name,
      customer_type,
      country: country.toUpperCase(),
      business_type,
      shipping_address,
      billing_address,
      note,
      business_class_code,
      business_class_name,
      business_phone_no,
      display_order,
      kyc_date,
      kyc_exp_date,
      business_certificate,
      business_card,
      password,
    };

    await Customer.create(data);

    const sendOTP = await sendOtp(email);
    return successResponse(res, 2005);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const signupCustomer = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const validation = new Validator(req.body, {
      email: 'required',
      password: 'required',
      name: 'required',
      lastName: 'required',
      company_name: 'required',
      country: 'required',
      state: 'required',
      city: 'required',
      pincode: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      await transaction.rollback();
      return errorResponse(res, firstMessage);
    }

    const {
      email,
      password,
      name,
      lastName,
      company_name,
      country,
      state,
      city,
      pincode,
    } = req.body;

    const checkExistEmail = await Customer.findOne({
      where: {
        email: email,
      },
    });

    if (checkExistEmail) {
      return errorResponse(res, 1005);
    }

    const data = {
      name,
      lastName,
      email,
      company_name,
      country: country.toUpperCase(),
      state,
      city,
      pincode,
      password,
    };

    const addedCustomer = await Customer.create(data, { transaction });

    await transaction.commit();
    return successResponse(res, 2001);
  } catch (error) {
    console.log('error', error);
    await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};

const signinCustomer = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      email: 'required',
      password: 'required',
      device_id: 'required',
      device_type: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { email, password } = req.body;

    const checkExistCustomer = await Customer.findOne({
      where: { email: email },
    });

    if (!checkExistCustomer) {
      return errorResponse(res, 1003);
    }
    if (checkExistCustomer.is_account_deleted) {
      return errorResponse(res, 9002);
    }
    if (
      !checkExistCustomer.is_active &&
      checkExistCustomer.is_inactive_by_admin
    ) {
      return errorResponse(res, 9003);
    }

    if (!bcrypt.compareSync(password, checkExistCustomer.password)) {
      return errorResponse(res, 1004);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await checkExistCustomer.update({ otp });

    const subject = 'Your login OTP';
    const messageHTML = `Your One Time Password (OTP) for login is: ${otp}. It is valid for a short time.`;

    // try {
    //   await sendMail(checkExistCustomer.email, subject, messageHTML);
    // } catch (mailErr) {
    //   await checkExistCustomer.update({ otp: null }).catch(() => {});
    //   return errorResponse(res, 9998, mailErr);
    // }

    return successResponse(res, 2006, {
      email: maskEmail(checkExistCustomer.email),
      otp,
    });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const verifyCustomerSigninOtp = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      email: 'required',
      otp: 'required|numeric',
      device_id: 'required',
      device_type: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { email, otp, device_id, device_type } = req.body;

    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return errorResponse(res, 1003);
    }
    if (customer.is_account_deleted) {
      return errorResponse(res, 9002);
    }
    if (!customer.is_active && customer.is_inactive_by_admin) {
      return errorResponse(res, 9003);
    }

    if (!customer.otp || Number(customer.otp) !== Number(otp)) {
      return errorResponse(res, 2007);
    }

    await customer.update({ otp: null });

    const refreshToken = await CustomerSession.createToken(
      customer.id,
      device_id,
      device_type
    );
    const sessionToken = await CustomerSession.createSessionToken(
      customer.id,
      device_id,
      device_type
    );

    const response = {
      sessionToken,
      refreshToken,
    };

    return successResponse(res, 1001, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  register,
  signupCustomer,
  signinCustomer,
  verifyCustomerSigninOtp,
};

/**
 * Helpers
 */

function maskEmail(email) {
  try {
    const [local, domain] = email.split('@');
    const localMasked =
      local.length <= 2
        ? local[0] + '*'
        : local[0] + '*'.repeat(Math.min(3, local.length - 1));
    const domainParts = domain.split('.');
    const domainName = domainParts[0];
    const domainMasked =
      domainName[0] + '*'.repeat(Math.min(3, domainName.length - 1));
    return `${localMasked}@${domainMasked}.${domainParts.slice(1).join('.')}`;
  } catch {
    return email;
  }
}
