import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';
import { uploadFile } from '../../helpers/image.js';

const { Customer, Op } = db;
const addCustomer = async (req, res) => {
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
      password: name,
    };

    await Customer.create(data);

    return successResponse(res, 2001);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getCustomerList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      start_date,
      end_date,
      country,
      customer_type,
      business_class_name,
      status,
      sort_field = 'createdAt',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;

    const { fields } = req.permission;

    const data = await Customer.findAndCountAll({
      attributes: fields,
      where: {
        ...(search && {
          [Op.or]: [
            { email: { [db.Sequelize.Op.like]: `%${search}%` } },
            { name: { [db.Sequelize.Op.like]: `%${search}%` } },
            { company_name: { [db.Sequelize.Op.like]: `%${search}%` } },
          ],
        }),
        ...(start_date &&
          end_date && {
            kyc_exp_date: {
              [Op.between]: [start_date, end_date],
            },
          }),
        ...(country && { country: country.toUpperCase() }),
        ...(customer_type && { customer_type: customer_type }),
        ...(business_class_name && {
          business_class_name: business_class_name,
        }),
        ...(status && { status: status }),
      },
      limit: Number(limit),
      offset: Number(offset),
      order: [[sort_field, sort_type]],
    });

    const paginationData = await pagination(data.count, page, limit);
    let response = {
      paginationData,
      customer: data.rows,
    };
    return successResponse(res, 2002, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateCustomerStatus = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      customer_id: 'required',
      status: 'required|in:pending,approved,declined',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { customer_id, status } = req.body;

    const checkExistCustomer = await Customer.findOne({
      where: {
        id: customer_id,
      },
    });

    if (!checkExistCustomer) {
      return errorResponse(res, 2004);
    }

    await Customer.update(
      {
        status: status,
      },
      {
        where: {
          id: customer_id,
        },
      }
    );

    return successResponse(res, 2003);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
export default { addCustomer, getCustomerList, updateCustomerStatus };
