import { errorResponse } from '../helpers/response.js';
import Validator from 'validatorjs';
import db from '../config/db.config.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

const {
  Customer,
  CustomerSession,
  EmployeePermissions,
  AdminPanelPermissions,
} = db;

const customerAuth = async (req, res, next) => {
  try {
    const validation = new Validator(req.headers, {
      authorization: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { authorization } = req.headers;
    let decode;
    try {
      decode = jwt.verify(authorization, config.jwt.secret);
    } catch (error) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkCustomerSession = await CustomerSession.findOne({
      where: {
        session_token: authorization,
      },
    });

    if (!checkCustomerSession) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkExistCustomer = await Customer.findOne({
      where: {
        id: checkCustomerSession.customer_id,
      },
    });

    if (!checkExistCustomer) {
      return errorResponse(res, 1003, '', 401);
    }
    if (checkExistCustomer.is_account_deleted) {
      return errorResponse(res, 9002, '', 401);
    }

    // if (
    //   !checkExistCustomer.is_active &&
    //   checkExistCustomer.is_inactive_by_admin
    // ) {
    //   return errorResponse(res, 9003, '', 402);
    // }
    // if (!checkExistCustomer.is_active) {
    //   return errorResponse(res, 9004, '', 401);
    // }

    req.customer = checkExistCustomer;

    next();
  } catch (error) {
    console.log('error', error);
    return errorResponse(res, 9001, error, 401);
  }
};

const customerAuthwithOptionaltoken = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (!authorization || authorization === undefined) {
      return next();
    }
    let decode;
    try {
      decode = jwt.verify(authorization, config.jwt.secret);
    } catch (error) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkCustomerSession = await CustomerSession.findOne({
      where: {
        session_token: authorization,
      },
    });

    if (!checkCustomerSession) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkExistCustomer = await Customer.findOne({
      where: {
        id: checkCustomerSession.customer_id,
      },
    });

    if (!checkExistCustomer) {
      return errorResponse(res, 1003, '', 401);
    }
    if (checkExistCustomer.is_account_deleted) {
      return errorResponse(res, 9002, '', 401);
    }

    req.customer = checkExistCustomer;

    next();
  } catch (error) {
    console.log('error', error);
    return errorResponse(res, 9001, error, 401);
  }
};

export { customerAuth, customerAuthwithOptionaltoken };
