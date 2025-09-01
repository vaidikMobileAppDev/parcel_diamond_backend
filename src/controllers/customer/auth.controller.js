import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';

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

export default {
  register,
};
