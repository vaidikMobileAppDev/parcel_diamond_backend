import Validator from 'validatorjs';
import { errorResponse, successResponse } from '../../../helpers/response.js';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';

import { Op, where, cast, col } from 'sequelize';

const { sequelize, Region, RegionCountry, Country } = db;

const getRegion = async (req, res) => {
  try {
    const allRegions = await Region.findAll({
      where: {
        is_deleted: false,
      },
      include: [
        {
          model: Country,
          as: 'countries',
          attributes: ['id', 'name', 'code', 'dial_code', 'currency'],
          through: { attributes: [] },
          where: { is_deleted: false },
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    return successResponse(res, 9138, { allRegions });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const addRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const validation = new Validator(req.body, {
      name: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { name, countries: countriesIds } = req.body;
    const countries = JSON.parse(countriesIds);
    if (!Array.isArray(countries) || countries.length === 0) {
      return errorResponse(
        res,
        9121,
        '"countries" must be a non-empty array of country ids'
      );
    }

    const foundCountries = await Country.findAll({
      where: { id: { [Op.in]: countries }, is_deleted: false },
      transaction: t,
    });

    if (foundCountries.length !== countries.length) {
      await t.rollback();
      return errorResponse(res, 9121, 'One or more country ids are invalid');
    }

    const createdRegion = await Region.create(
      {
        name,
      },
      { transaction: t }
    );

    const joinRows = countries.map((countryId) => ({
      region: createdRegion.id,
      country: countryId,
    }));
    if (joinRows.length > 0) {
      await RegionCountry.bulkCreate(joinRows, { transaction: t });
    }

    await t.commit();
    return successResponse(res, 9139, { regionId: createdRegion.id });
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 9999, error);
  }
};

const updateRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const validation = new Validator(req.body, {
      id: 'required',
      name: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id, name, countries } = req.body;

    const region = await Region.findOne({
      where: { id, is_deleted: false },
      transaction: t,
    });

    if (!region) {
      await t.rollback();
      return errorResponse(res, 9140);
    }

    await Region.update(
      { name },
      {
        where: { id },
        transaction: t,
      }
    );

    if (typeof countries !== 'undefined') {
      if (!Array.isArray(countries) || countries.length === 0) {
        await t.rollback();
        return errorResponse(
          res,
          9121,
          '"countries" must be a non-empty array of country ids'
        );
      }

      const foundCountries = await Country.findAll({
        where: { id: { [Op.in]: countries }, is_deleted: false },
        transaction: t,
      });

      if (foundCountries.length !== countries.length) {
        await t.rollback();
        return errorResponse(res, 9121, 'One or more country ids are invalid');
      }

      await RegionCountry.destroy({
        where: { region: id },
        transaction: t,
      });

      const joinRows = countries.map((countryId) => ({
        region: id,
        country: countryId,
      }));
      if (joinRows.length > 0) {
        await RegionCountry.bulkCreate(joinRows, { transaction: t });
      }
    }

    await t.commit();
    return successResponse(res, 9141);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 9999, error);
  }
};

const deleteRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const validation = new Validator(req.query, {
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id } = req.query;

    const region = await Region.findOne({
      where: { id, is_deleted: false },
      transaction: t,
    });
    if (!region) {
      await t.rollback();
      return errorResponse(res, 9140);
    }

    await region.update({ is_deleted: true }, { transaction: t });

    await RegionCountry.destroy({
      where: { region: id },
      transaction: t,
    });

    await t.commit();
    return successResponse(res, 9142);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 9999, error);
  }
};

export default {
  addRegion,
  updateRegion,
  deleteRegion,
  getRegion,
};
