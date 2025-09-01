import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';
import { uploadFile } from '../../helpers/image.js';
import moment from 'moment';

const { Op, Supplier } = db;

const addSupplier = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      supplier_name: 'required',
      supplier_email: 'required|email',
      supplier_phone_no: 'required',
      contact_person_name: 'required',
      contact_person_phone_no: 'required',
      contact_person_email: 'required|email',
      kyc_date: 'required',
      category: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const {
      supplier_name,
      supplier_email,
      supplier_phone_no,
      contact_person_name,
      contact_person_phone_no,
      contact_person_email,
      kyc_date,
      category,
    } = req.body;

    const checkExistSupplier = await Supplier.findOne({
      where: {
        supplier_email: supplier_email,
      },
    });

    if (checkExistSupplier) {
      return errorResponse(res, 4002);
    }

    const supplier = await Supplier.create({
      supplier_name: supplier_name,
      supplier_email: supplier_email,
      supplier_phone_no: supplier_phone_no,
      contact_person_name: contact_person_name,
      contact_person_phone_no: contact_person_phone_no,
      contact_person_email: contact_person_email,
      kyc_date: kyc_date,
      category: category,
    });

    return successResponse(res, 4001, supplier);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getSupplier = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      sort_field = 'createdAt',
      sort_type = 'DESC',
      search,
      category,
      status,
    } = req.query;

    const offset = (page - 1) * limit;
    const { fields } = req.permission;
    const supplier = await Supplier.findAndCountAll({
      attributes: fields,
      where: {
        ...(search && {
          [Op.or]: [
            { supplier_name: { [Op.like]: `%${search}%` } },
            { supplier_email: { [Op.like]: `%${search}%` } },
            { contact_person_name: { [Op.like]: `%${search}%` } },
            { contact_person_email: { [Op.like]: `%${search}%` } },
          ],
        }),
        ...(category && { category: category }),
        ...(status && { status: status }),
      },
      order: [[sort_field, sort_type]],
      limit: limit,
      offset: offset,
    });

    const paginationData = await pagination(supplier.count, page, limit);

    const response = {
      paginationData,
      supplier: supplier.rows,
    };
    return successResponse(res, 4003, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default { addSupplier, getSupplier };
