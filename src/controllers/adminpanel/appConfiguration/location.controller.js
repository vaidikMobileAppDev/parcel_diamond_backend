import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';

const { Op, Location, Country } = db;

/**
 * GET /locations
 * optional: ?id=123  -> fetch single location
 * otherwise returns list
 */
const getLocation = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const row = await Location.findOne({
        where: { id, is_deleted: false },
        include: [
          {
            model: Country,
            as: 'countryDetail',
            attributes: ['id', 'name', 'code'],
            required: false,
          },
        ],
      });

      if (!row) return errorResponse(res, 9137);

      return successResponse(res, 9132, { location: row });
    }

    const allLocations = await Location.findAll({
      where: { is_deleted: false },
      include: [
        {
          model: Country,
          as: 'countryDetail',
          attributes: ['id', 'name', 'code'],
          required: false,
        },
      ],
      order: [['id', 'ASC']],
    });

    return successResponse(res, 9131, { allLocations });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const addLocation = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      name: 'required',
      country: 'required|numeric',
      address: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const {
      name,
      country,
      address,
      city,
      state,
      postal_code,
      phone,
      contact_person,
    } = req.body;

    const countryRow = await Country.findOne({ where: { id: country } });
    if (!countryRow) return errorResponse(res, 9121);

    const existing = await Location.findOne({
      where: {
        name,
        country,
        is_deleted: false,
      },
    });

    if (existing) {
      return errorResponse(res, 9134);
    }

    const added = await Location.create({
      name,
      country,
      address,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      phone: phone || null,
      contact_person: contact_person || null,
    });

    return successResponse(res, 9133, { id: added.id });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateLocation = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      id: 'required|numeric',
      name: 'required',
      country: 'required|numeric',
      address: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const {
      id,
      name,
      country,
      address,
      city,
      state,
      postal_code,
      phone,
      contact_person,
    } = req.body;

    const row = await Location.findOne({ where: { id, is_deleted: false } });
    if (!row) return errorResponse(res, 9137);

    // check country exists
    const countryRow = await Country.findOne({ where: { id: country } });
    if (!countryRow) return errorResponse(res, 9121);

    // check duplicate name+country in another row
    const duplicate = await Location.findOne({
      where: {
        name,
        country,
        is_deleted: false,
        id: { [Op.ne]: id },
      },
    });

    if (duplicate) {
      return errorResponse(res, 9134);
    }

    await row.update({
      name,
      country,
      address,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      phone: phone || null,
      contact_person: contact_person || null,
    });

    return successResponse(res, 9135);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteLocation = async (req, res) => {
  try {
    const validation = new Validator(req.query, { id: 'required|numeric' });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id } = req.query;

    const row = await Location.findOne({ where: { id, is_deleted: false } });
    if (!row) {
      return errorResponse(res, 9137);
    }

    await row.update({ is_deleted: true });

    return successResponse(res, 9136);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addLocation,
  updateLocation,
  deleteLocation,
  getLocation,
};
