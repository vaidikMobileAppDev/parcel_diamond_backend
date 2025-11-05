import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { Op, where, cast, col } from 'sequelize';

const {
  sequelize,
  PricePerCaratRegion,
  Region,
  Shape,
  Color,
  Clarity,
  SieveSize,
} = db;

/**
 * Helper: build overlap where clause for a given combination and date range.
 * Excludes optional id (for update case).
 */
const buildOverlapWhere = ({
  region,
  shape,
  color,
  clarity,
  sieveSize,
  effectiveFrom,
  effectiveTo = null,
  excludeId = null,
}) => {
  const base = {
    region,
    shape,
    color,
    clarity,
    sieveSize,
  };

  const rangeCondition = {
    [Op.not]: {
      [Op.or]: [
        { effectiveTo: { [Op.ne]: null, [Op.lt]: effectiveFrom } },
        ...(effectiveTo ? [{ effectiveFrom: { [Op.gt]: effectiveTo } }] : []),
      ],
    },
  };

  const whereClause = {
    ...base,
    ...rangeCondition,
  };

  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }

  return whereClause;
};

/**
 * GET list with filters. Supports filtering by combination and date.
 */
const getPricePerCaratRegion = async (req, res) => {
  try {
    const {
      region,
      shape,
      color,
      clarity,
      sieveSize,
      date,
      page = 1,
      limit = 50,
      sortBy = 'effectiveFrom',
      sortOrder = 'DESC',
    } = req.query;
    const whereClause = {};

    if (region) whereClause.region = region;
    if (shape) whereClause.shape = shape;
    if (color) whereClause.color = color;
    if (clarity) whereClause.clarity = clarity;
    if (sieveSize) whereClause.sieveSize = sieveSize;

    if (date) {
      whereClause.effectiveFrom = { [Op.lte]: date };
      whereClause[Op.and] = [
        {
          [Op.or]: [
            { effectiveTo: { [Op.eq]: null } },
            { effectiveTo: { [Op.gte]: date } },
          ],
        },
      ];
    }

    const { offset, limit: lim } = pagination(page, limit);
    const rows = await PricePerCaratRegion.findAll({
      where: whereClause,
      include: [
        {
          model: Region,
          as: 'regionDetail',
          attributes: ['id', 'name'],
          required: false,
          where: { is_deleted: false },
        },
        {
          model: Shape,
          as: 'shapeDetail',
          attributes: ['id', 'shape'],
          required: false,
        },
        {
          model: Color,
          as: 'colorDetail',
          attributes: ['id', 'color'],
          required: false,
        },
        {
          model: Clarity,
          as: 'clarityDetail',
          attributes: ['id', 'clarity'],
          required: false,
        },
        {
          model: SieveSize,
          as: 'sieveSizeDetail',
          attributes: ['id', 'size'],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder]],
      offset,
      limit: lim,
    });

    return successResponse(res, 9143, { allPricePerCarat: rows });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

/**
 * Single create: validates and prevents overlapping ranges.
 */
const addPricePerCaratRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const validation = new Validator(req.body, {
      region: 'required',
      shape: 'required',
      color: 'required',
      clarity: 'required',
      sieveSize: 'required',
      effectiveFrom: 'required|date',
      price: 'required|numeric',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const {
      region,
      shape,
      color,
      clarity,
      sieveSize,
      effectiveFrom,
      effectiveTo = null,
      price,
      meta = null,
    } = req.body;

    const foundRegion = await Region.findOne({
      where: { id: region, is_deleted: false },
      transaction: t,
    });
    if (!foundRegion) {
      await t.rollback();
      return errorResponse(res, 9140);
    }

    const [foundShape, foundColor, foundClarity, foundSieve] =
      await Promise.all([
        Shape.findOne({ where: { id: shape }, transaction: t }),
        Color.findOne({ where: { id: color }, transaction: t }),
        Clarity.findOne({ where: { id: clarity }, transaction: t }),
        SieveSize.findOne({ where: { id: sieveSize }, transaction: t }),
      ]);

    if (!foundShape) {
      await t.rollback();
      return errorResponse(res, 9124);
    }
    if (!foundColor) {
      await t.rollback();
      return errorResponse(res, 9118);
    }
    if (!foundClarity) {
      await t.rollback();
      return errorResponse(res, 9115);
    }
    if (!foundSieve) {
      await t.rollback();
      return errorResponse(res, 9127);
    }

    const overlapWhere = buildOverlapWhere({
      region,
      shape,
      color,
      clarity,
      sieveSize,
      effectiveFrom,
      effectiveTo,
    });
    const overlapping = await PricePerCaratRegion.findOne({
      where: overlapWhere,
      transaction: t,
    });
    if (overlapping) {
      await t.rollback();
      return errorResponse(res, 9144);
    }

    await PricePerCaratRegion.create(
      {
        region,
        shape,
        color,
        clarity,
        sieveSize,
        effectiveFrom,
        effectiveTo,
        price,
        meta,
      },
      { transaction: t }
    );

    await t.commit();
    return successResponse(res, 9145);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 9999, error);
  }
};

/**
 * Single update.
 */
const updatePricePerCaratRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const validation = new Validator(req.body, {
      id: 'required',
      region: 'required',
      shape: 'required',
      color: 'required',
      clarity: 'required',
      sieveSize: 'required',
      effectiveFrom: 'required|date',
      price: 'required|numeric',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const {
      id,
      region,
      shape,
      color,
      clarity,
      sieveSize,
      effectiveFrom,
      effectiveTo = null,
      price,
      meta = null,
    } = req.body;

    const existing = await PricePerCaratRegion.findOne({
      where: { id },
      transaction: t,
    });
    if (!existing) {
      await t.rollback();
      return errorResponse(res, 9146);
    }

    const foundRegion = await Region.findOne({
      where: { id: region, is_deleted: false },
      transaction: t,
    });
    if (!foundRegion) {
      await t.rollback();
      return errorResponse(res, 9140);
    }

    const overlapWhere = buildOverlapWhere({
      region,
      shape,
      color,
      clarity,
      sieveSize,
      effectiveFrom,
      effectiveTo,
      excludeId: id,
    });
    const overlapping = await PricePerCaratRegion.findOne({
      where: overlapWhere,
      transaction: t,
    });
    if (overlapping) {
      await t.rollback();
      return errorResponse(res, 9144);
    }

    await PricePerCaratRegion.update(
      {
        region,
        shape,
        color,
        clarity,
        sieveSize,
        effectiveFrom,
        effectiveTo,
        price,
        meta,
      },
      { where: { id }, transaction: t }
    );

    await t.commit();
    return successResponse(res, 9147);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 9999, error);
  }
};

/**
 * Delete (soft).
 */
const deletePricePerCaratRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const validation = new Validator(req.query, { id: 'required' });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id } = req.query;
    const existing = await PricePerCaratRegion.findOne({
      where: { id },
      transaction: t,
    });
    if (!existing) {
      await t.rollback();
      return errorResponse(res, 9146);
    }

    await PricePerCaratRegion.destroy({ where: { id }, transaction: t });
    await t.commit();
    return successResponse(res, 9148);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 9999, error);
  }
};

/**
 * Bulk create/upsert endpoint.
 */
const bulkPricePerCaratRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { rows = [], mode = 'strict' } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      await t.rollback();
      return errorResponse(res, 9999, 'No rows provided');
    }

    const errors = {};
    const normalized = [];
    rows.forEach((r, idx) => {
      const externalRowId = r.externalRowId ?? idx + 1;
      if (
        !r.region ||
        !r.shape ||
        !r.color ||
        !r.clarity ||
        !r.sieveSize ||
        !r.effectiveFrom ||
        !r.price
      ) {
        errors[externalRowId] = errors[externalRowId] || [];
        errors[externalRowId].push(
          'Missing required field (region/shape/color/clarity/sieveSize/effectiveFrom/price)'
        );
        return;
      }
      const ef = r.effectiveFrom;
      const et = r.effectiveTo ?? null;
      if (isNaN(Date.parse(ef))) {
        errors[externalRowId] = errors[externalRowId] || [];
        errors[externalRowId].push('effectiveFrom invalid date');
        return;
      }
      if (et && isNaN(Date.parse(et))) {
        errors[externalRowId] = errors[externalRowId] || [];
        errors[externalRowId].push('effectiveTo invalid date');
        return;
      }
      if (et && new Date(et) < new Date(ef)) {
        errors[externalRowId] = errors[externalRowId] || [];
        errors[externalRowId].push('effectiveTo must be >= effectiveFrom');
        return;
      }
      if (isNaN(Number(r.price))) {
        errors[externalRowId] = errors[externalRowId] || [];
        errors[externalRowId].push('price must be numeric');
        return;
      }

      normalized.push({
        externalRowId,
        region: Number(r.region),
        shape: Number(r.shape),
        color: Number(r.color),
        clarity: Number(r.clarity),
        sieveSize: Number(r.sieveSize),
        effectiveFrom: ef,
        effectiveTo: et,
        price: r.price,
        meta: r.meta ?? null,
      });
    });

    if (mode === 'strict' && Object.keys(errors).length) {
      await t.rollback();
      return errorResponse(res, 9998, errors);
    }

    const keyForRow = (r) =>
      `${r.region}__${r.shape}__${r.color}__${r.clarity}__${r.sieveSize}__${r.effectiveFrom}__${r.effectiveTo ?? ''}`;
    const dedupeMap = new Map();
    normalized.forEach((r) => {
      dedupeMap.set(keyForRow(r), r);
    });
    const deduped = Array.from(dedupeMap.values());

    const comboWhereClauses = [];
    const combos = new Map();
    deduped.forEach((r) => {
      const comboKey = `${r.region}__${r.shape}__${r.color}__${r.clarity}__${r.sieveSize}`;
      if (!combos.has(comboKey)) combos.set(comboKey, []);
      combos.get(comboKey).push(r);
      comboWhereClauses.push({
        region: r.region,
        shape: r.shape,
        color: r.color,
        clarity: r.clarity,
        sieveSize: r.sieveSize,
      });
    });

    const uniqComboWhere = [];
    const seenCombo = new Set();
    comboWhereClauses.forEach((c) => {
      const k = `${c.region}__${c.shape}__${c.color}__${c.clarity}__${c.sieveSize}`;
      if (!seenCombo.has(k)) {
        seenCombo.add(k);
        uniqComboWhere.push(c);
      }
    });

    const existingRows = [];
    const CHUNK = 200;
    for (let i = 0; i < uniqComboWhere.length; i += CHUNK) {
      const chunk = uniqComboWhere.slice(i, i + CHUNK);
      const found = await PricePerCaratRegion.findAll({
        where: {
          [Op.or]: chunk,
        },
        transaction: t,
      });
      existingRows.push(...found);
    }

    const existingByCombo = new Map();
    existingRows.forEach((er) => {
      const key = `${er.region}__${er.shape}__${er.color}__${er.clarity}__${er.sieveSize}`;
      if (!existingByCombo.has(key)) existingByCombo.set(key, []);
      existingByCombo.get(key).push(er);
    });

    const overlapErrors = {};
    const okRows = [];

    const checkOverlapWithExisting = (incomingRow, existingList) => {
      if (!existingList || existingList.length === 0) return null;
      for (const ex of existingList) {
        const exFrom = ex.effectiveFrom;
        const exTo = ex.effectiveTo;

        const incFrom = incomingRow.effectiveFrom;
        const incTo = incomingRow.effectiveTo;

        const noOverlap =
          (exTo !== null &&
            exTo !== undefined &&
            new Date(exTo) < new Date(incFrom)) ||
          (incTo !== null &&
            incTo !== undefined &&
            new Date(exFrom) > new Date(incTo));

        if (!noOverlap) {
          return ex;
        }
      }
      return null;
    };

    for (const [comboKey, incomingRows] of combos.entries()) {
      const sorted = incomingRows
        .slice()
        .sort((a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom));
      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];

        const existingList = existingByCombo.get(comboKey) || [];
        const overlappingExisting = checkOverlapWithExisting(r, existingList);
        if (overlappingExisting) {
          overlapErrors[r.externalRowId] = overlapErrors[r.externalRowId] || [];
          overlapErrors[r.externalRowId].push(
            `Overlaps existing id ${overlappingExisting.id}`
          );
          continue;
        }
        for (let j = 0; j < i; j++) {
          const p = sorted[j];
          const pTo = p.effectiveTo;
          const rTo = r.effectiveTo;
          const noOverlap =
            (pTo !== null &&
              pTo !== undefined &&
              new Date(pTo) < new Date(r.effectiveFrom)) ||
            (rTo !== null &&
              rTo !== undefined &&
              new Date(p.effectiveFrom) > new Date(rTo));
          if (!noOverlap) {
            overlapErrors[r.externalRowId] =
              overlapErrors[r.externalRowId] || [];
            overlapErrors[r.externalRowId].push(
              `Overlaps another incoming row externalRowId ${p.externalRowId}`
            );
            break;
          }
        }
        if (!overlapErrors[r.externalRowId]) okRows.push(r);
      }
    }

    const combinedErrors = { ...errors, ...overlapErrors };
    if (mode === 'strict' && Object.keys(combinedErrors).length > 0) {
      await t.rollback();
      return errorResponse(res, {
        message: 'Validation/Overlap errors',
        details: combinedErrors,
      });
    }

    const existingExactMap = new Map();
    existingRows.forEach((ex) => {
      const exactKey = `${ex.region}__${ex.shape}__${ex.color}__${ex.clarity}__${ex.sieveSize}__${ex.effectiveFrom}__${ex.effectiveTo ?? ''}`;
      existingExactMap.set(exactKey, ex);
    });

    const rowResults = [];

    for (const r of deduped) {
      if (
        (errors[r.externalRowId] || overlapErrors[r.externalRowId]) &&
        mode !== 'strict'
      ) {
        rowResults.push({
          externalRowId: r.externalRowId,
          status: 'failed',
          errors: (errors[r.externalRowId] || []).concat(
            overlapErrors[r.externalRowId] || []
          ),
        });
        continue;
      }

      const exactKey = `${r.region}__${r.shape}__${r.color}__${r.clarity}__${r.sieveSize}__${r.effectiveFrom}__${r.effectiveTo ?? ''}`;
      const existingExact = existingExactMap.get(exactKey);

      if (existingExact) {
        await PricePerCaratRegion.update(
          { price: r.price, meta: r.meta },
          { where: { id: existingExact.id }, transaction: t }
        );
        rowResults.push({
          externalRowId: r.externalRowId,
          status: 'updated',
          id: existingExact.id,
        });
      } else {
        const created = await PricePerCaratRegion.create(
          {
            region: r.region,
            shape: r.shape,
            color: r.color,
            clarity: r.clarity,
            sieveSize: r.sieveSize,
            effectiveFrom: r.effectiveFrom,
            effectiveTo: r.effectiveTo,
            price: r.price,
            meta: r.meta,
          },
          { transaction: t }
        );

        existingExactMap.set(
          `${r.region}__${r.shape}__${r.color}__${r.clarity}__${r.sieveSize}__${r.effectiveFrom}__${r.effectiveTo ?? ''}`,
          created
        );
        rowResults.push({
          externalRowId: r.externalRowId,
          status: 'created',
          id: created.id,
        });
      }
    }

    await t.commit();

    const summary = rowResults.reduce(
      (acc, rr) => {
        acc.processed += 1;
        if (rr.status === 'created') acc.created += 1;
        else if (rr.status === 'updated') acc.updated += 1;
        else if (rr.status === 'failed') acc.failed += 1;
        return acc;
      },
      { processed: 0, created: 0, updated: 0, failed: 0 }
    );

    return successResponse(res, 9145, { summary, rows: rowResults });
  } catch (error) {
    await t.rollback();
    return errorResponse(res, 9999, error);
  }
};

export default {
  getPricePerCaratRegion,
  addPricePerCaratRegion,
  updatePricePerCaratRegion,
  deletePricePerCaratRegion,
  bulkPricePerCaratRegion,
};
