import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';

const addEmployee = async (req, res) => {
  try {
    // console.log('req.admin', req.admin)
    return successResponse(res, 1001);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default { addEmployee };
