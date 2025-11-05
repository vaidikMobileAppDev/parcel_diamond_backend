import Decimal from 'decimal.js';
import db from '../../config/db.config.js';
import { Op, Sequelize, literal, col, fn } from 'sequelize';
import { uploadFile } from '../../helpers/image.js';
import { pagination } from '../../helpers/pagination.js';
import { errorResponse, successResponse } from '../../helpers/response.js';
import { GetExcelData } from '../../helpers/getExcelData.js';
import e from 'express';

const {
  DiamondGrade,
  DiamondLot,
  DiamondPacket,
  DiamondPayment,
  DiamondPurchase,
  InventoryMovement,
  PacketSource,
  PricePerCarat,
  Shape,
  Color,
  Clarity,
  Country,
  Location,
  SieveSize,
  Supplier,
  sequelize,
} = db;

export const addDiamond = async (req, res) => {
  const payload = req.body;

  const t = await sequelize.transaction();
  try {
    if (
      !payload.supplierId ||
      !payload.diamondType ||
      !payload.purchasePrice ||
      !payload.actualPrice ||
      !payload.buyCurrencyRate ||
      !payload.buyCurrency ||
      !payload.purchaseLocationId ||
      !payload.isOnBook === 'on_book' ||
      !payload.isOnBook === 'off_book' ||
      !payload.totalWeight ||
      !payload.purchaseDate ||
      !payload.invoiceNumber ||
      !payload.paymentTermsDays ||
      !payload.paidAmount ||
      !payload.paymentType ||
      !payload.notes
    ) {
      await t.rollback();

      return errorResponse(res, 'Missing required purchase fields');
    }

    if (parseFloat(payload.actualPrice) < parseFloat(payload.purchasePrice)) {
      await t.rollback();
      return errorResponse(res, 5020);
    }
    if (parseFloat(payload.purchasePrice) < parseFloat(payload.paidAmount)) {
      return errorResponse(res, 5021);
    }

    const files = req.files;

    let invoiceFile = null;
    if (files && files.length > 0) {
      let uploadedFile = await uploadFile(files[0], 'invoice');
      invoiceFile = uploadedFile;
    }
    const grades = JSON.parse(payload.grades) || [];

    const gradeWeights = grades.map((g) => {
      const lotWeights = (g.lots || []).map((lot) =>
        parseFloat(lot.totalWeight || 0)
      );
      return lotWeights.reduce((acc, w) => acc + w, 0);
    });

    const gradeSum = sum(gradeWeights);

    if (Math.abs(gradeSum - parseFloat(payload.totalWeight)) > 0.0001) {
      await t.rollback();
      return errorResponse(
        res,
        'Sum of grade weights must equal purchase totalWeight'
      );
    }

    for (const g of grades) {
      const computedWeight =
        parseInt(g.zeroPointTwentyFiveCount || 0) * 0.25 +
        parseInt(g.zeroPointFiftyCount || 0) * 0.5 +
        parseInt(g.oneCaratCount || 0) * 1.0 +
        parseFloat(g.unpackedWeight || 0);
      if (Math.abs(computedWeight - parseFloat(g.totalWeight || 0)) > 0.0001) {
        await t.rollback();
        return errorResponse(
          res,
          `Packet counts/weights mismatch for a grade (computed ${computedWeight} vs declared ${g.totalWeight})`
        );
      }
    }

    const paymentAmount = parseFloat(payload.paidAmount || 0);
    if (paymentAmount < 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'paidAmount must be >= 0',
      });
    }

    const purchase = await DiamondPurchase.create(
      {
        supplier: payload.supplierId,
        invoiceNumber: payload.invoiceNumber || null,
        invoiceFile: invoiceFile || null,
        totalWeight: payload.totalWeight,
        // totalQuantity: payload.totalQuantity || null,
        actualPrice: payload.actualPrice || null,
        purchasePrice: payload.purchasePrice || null,
        buyCurrency: payload.buyCurrency,
        buyCurrencyRate: payload.buyCurrencyRate,
        purchaseDate: payload.purchaseDate,
        paymentTermsDays: payload.paymentTermsDays || null,
        paidAmount: payload.paidAmount || 0,
        purchaseLocation: payload.purchaseLocationId || null,
        diamondType: payload.diamondType || 'natural',
        isOnBook: payload.isOnBook,
        notes: payload.notes || null,
        // createdBy: payload.createdBy || null,
      },
      { transaction: t }
    );

    const payment = await DiamondPayment.create(
      {
        purchase: purchase.id,
        amount: paymentAmount,
        paymentDate: payload.purchaseDate,
        paymentType: payload.paymentType,
        // TODO :: add in future
        note: payload.paymentNote || null,
      },
      { transaction: t }
    );

    const createdPackets = [];
    const createdLotIds = [];

    for (const g of grades) {
      const [grade] = await DiamondGrade.findOrCreate({
        where: {
          shape: g.shapeId,
          color: g.colorId,
          clarity: g.clarityId,
        },
        defaults: { code: g.code || null },
        transaction: t,
      });

      const lots = g.lots || [];
      for (const lotInput of lots) {
        const sieveSizeId = lotInput.sieveSizeId || null;
        const [lot] = await DiamondLot.findOrCreate({
          where: {
            // purchase: purchase.id,
            grade: grade.id,
            sieveSize: sieveSizeId,
          },
          defaults: {
            totalWeight: 0,
            zeroPointTwentyFivePacketCount: 0,
            zeroPointFiftyPacketCount: 0,
            oneCaratPacketCount: 0,
            unpackedWeight: 0,
          },
          transaction: t,
        });

        createdLotIds.push(lot.id);

        const toCreate = [];
        const addPacket = (
          wt,
          onBookPortion = 0,
          offBookPortion = 0,
          isUnpacked = false
        ) => {
          toCreate.push({
            lot: lot.id,
            purchase: purchase.id,
            grade: grade.id,
            qrCode: generateTempQR(),
            weight: wt,
            onBookWeight: onBookPortion,
            offBookWeight: offBookPortion,
            isOnBookFlag:
              onBookPortion > 0 && offBookPortion === 0
                ? 'on_book'
                : offBookPortion > 0 && onBookPortion === 0
                  ? 'off_book'
                  : 'mix',
            isUnpacked: isUnpacked,
            remainingWeight: wt,
            location: purchase.purchaseLocation ?? null,
            meta: null,
          });
        };

        const isOnBook = purchase.isOnBook === 'on_book';

        const c025 = safeParseInt(
          lotInput.zeroPointTwentyFiveCount ||
          lotInput.zero_point_twenty_five_carat_packet_weight ||
          0
        );
        for (let i = 0; i < c025; i++) {
          addPacket(0.25, isOnBook ? 0.25 : 0, isOnBook ? 0 : 0.25, false);
        }

        const c050 = safeParseInt(
          lotInput.zeroPointFiftyCount ||
          lotInput.zero_point_fifty_carat_packet_weight ||
          0
        );
        for (let i = 0; i < c050; i++) {
          addPacket(0.5, isOnBook ? 0.5 : 0, isOnBook ? 0 : 0.5, false);
        }

        const c100 = safeParseInt(
          lotInput.oneCaratCount || lotInput.one_carat_packet_weight || 0
        );
        for (let i = 0; i < c100; i++) {
          addPacket(1.0, isOnBook ? 1.0 : 0, isOnBook ? 0 : 1.0, false);
        }

        const unpacked = safeParseFloat(lotInput.unpackedWeight || 0);
        if (unpacked > 0) {
          addPacket(
            unpacked,
            isOnBook ? unpacked : 0,
            isOnBook ? 0 : unpacked,
            false
          );
        }

        const created = await DiamondPacket.bulkCreate(toCreate, {
          transaction: t,
          returning: true,
        });

        for (const p of created) {
          const finalCode = `PKT-${p.id}`;
          await p.update({ qrCode: finalCode }, { transaction: t });
          createdPackets.push({
            id: p.id,
            qrCode: finalCode,
            weight: p.weight,
            onBookWeight: p.onBookWeight,
            offBookWeight: p.offBookWeight,
            isOnBookFlag: p.isOnBookFlag,
          });
        }

        const totalWeightForLot = sum(
          created.map((p) => safeParseFloat(p.weight || 0))
        );
        await lot.increment(
          {
            totalWeight: totalWeightForLot,
            zeroPointTwentyFivePacketCount: c025,
            zeroPointFiftyPacketCount: c050,
            oneCaratPacketCount: c100,
            unpackedWeight: unpacked > 0 ? unpacked : 0,
          },
          { transaction: t }
        );

        await InventoryMovement.create(
          {
            type: 'purchase',
            lot: lot.id,
            purchase: purchase.id,
            weightDelta: totalWeightForLot,
            onBookDelta: isOnBook ? totalWeightForLot : 0,
            offBookDelta: isOnBook ? 0 : totalWeightForLot,
            user: payload.createdBy || null,
            note: `Purchase ${purchase.id} - created ${created.length} packets for grade ${grade.id} sieve ${sieveSizeId}`,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    const lotsWithDetails = await DiamondLot.findAll({
      where: {
        id: { [Op.in]: createdLotIds },
      },
      attributes: {
        exclude: ['purchase', 'grade', 'sieveSize'],
      },
      include: [
        {
          model: DiamondGrade,
          as: 'gradeDetail',
          attributes: {
            exclude: ['shape', 'color', 'clarity'],
            include: ['id', 'code'],
          },
          include: [
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
          ],
        },
        {
          model: SieveSize,
          as: 'sieveSizeDetail',
          attributes: ['id', 'size', 'shape_id'],
          required: false,
        },
      ],
      order: [['id', 'ASC']],
    });

    const processedLots = lotsWithDetails.map((lot) => {
      const plainLot = lot.get({ plain: true });

      const { purchase, grade, sieveSize, ...cleanLot } = plainLot;

      return {
        ...cleanLot,
      };
    });

    const response = {
      packets: createdPackets,
      lots: processedLots,
    };

    return successResponse(res, 5001, response);
  } catch (err) {
    await t.rollback();
    console.error('addDiamond err', err);
    return errorResponse(res, err.message || err, 500);
  }
};

export const getDiamonds = async (req, res) => {
  try {
    const {
      shapeId,
      colorId,
      clarityId,
      sieveSizeId,
      purchaseLocationId,
      isOnBookFlag,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      search,
      sortBy = 'id',
      sortOrder = 'DESC',
      dateField = 'lotCreatedAt',
    } = req.query;

    const where = {};
    if (sieveSizeId) where.sieveSize = sieveSizeId;

    // date filter for lot.createdAt (default)
    if (startDate || endDate) {
      if (dateField !== 'purchaseDate') {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
          const endDt = new Date(endDate);
          endDt.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = endDt;
        }
      }
    }

    // --- includes with placeholders for include-specific search ORs ---
    const includeGrade = {
      model: DiamondGrade,
      as: 'gradeDetail',
      attributes: ['id', 'code', 'shape', 'color', 'clarity'],
      required: false,
      include: [
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
      ],
    };

    const includePurchase = {
      model: DiamondPurchase,
      as: 'purchaseDetail',
      attributes: [
        'id',
        'purchaseDate',
        'invoiceNumber',
        'purchaseLocation',
        'isOnBook',
      ],
      required: false,
      include: [
        {
          model: Location,
          as: 'purchaseLocationDetail',
          attributes: ['id', 'name', 'country'],
          required: false,
          include: [
            {
              model: Country,
              as: 'countryDetail',
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
      ],
    };

    const includeSieve = {
      model: SieveSize,
      as: 'sieveSizeDetail',
      attributes: ['id', 'size', 'shape_id'],
      required: false,
    };

    const includePackets = {
      model: DiamondPacket,
      as: 'packets',
      attributes: [],
      required: false,
    };

    // param filters that belong to includes
    if (shapeId || colorId || clarityId) {
      includeGrade.where = includeGrade.where || {};
      if (shapeId) includeGrade.where.shape = shapeId;
      if (colorId) includeGrade.where.color = colorId;
      if (clarityId) includeGrade.where.clarity = clarityId;
      includeGrade.required = true;
    }

    if (purchaseLocationId) {
      includePurchase.where = {
        ...(includePurchase.where || {}),
        purchaseLocation: purchaseLocationId,
      };
      includePurchase.required = true;
    }
    if (isOnBookFlag) {
      includePurchase.where = {
        ...(includePurchase.where || {}),
        isOnBook: isOnBookFlag,
      };
      includePurchase.required = true;
    }

    if (dateField === 'purchaseDate' && (startDate || endDate)) {
      includePurchase.where = includePurchase.where || {};
      if (startDate)
        includePurchase.where.purchaseDate = {
          ...(includePurchase.where.purchaseDate || {}),
          [Op.gte]: startDate,
        };
      if (endDate)
        includePurchase.where.purchaseDate = {
          ...(includePurchase.where.purchaseDate || {}),
          [Op.lte]: endDate,
        };
      includePurchase.required = true;
    }

    const baseIncludes = [includeGrade, includePurchase, includeSieve];

    // ----- SEARCH: put association searches into include.where (not top-level) -----
    const topLevelOr = []; // only plain top-level conditions (no Sequelize.where or Sequelize.col)
    const gradeOr = [];
    const purchaseOr = [];
    const sieveOr = [];

    if (search && search.trim()) {
      const searchTerm = search.trim();
      const like = `%${searchTerm}%`;
      const numeric = !Number.isNaN(Number(searchTerm))
        ? Number(searchTerm)
        : null;

      // top-level numeric fields: id and sieveSize (plain objects)
      if (numeric !== null) {
        topLevelOr.push({ id: numeric });
        topLevelOr.push({ sieveSize: numeric });
        // for association numeric matches, add them into the include where arrays:
        gradeOr.push(
          { shape: numeric },
          { color: numeric },
          { clarity: numeric }
        );
        purchaseOr.push({ purchaseLocation: numeric });
      }

      // text search on associated fields -> add into include where arrays
      sieveOr.push({ size: { [Op.iLike]: like } }); // will go in includeSieve.where
      gradeOr.push({ code: { [Op.iLike]: like } });
      purchaseOr.push({ invoiceNumber: { [Op.iLike]: like } });
      // purchaseDate text search: use Sequelize.where cast inside includePurchase.where
      // (Sequelize.where here is okay because it will be inside the include.where)
      const { Op: _Op, fn, col, cast, where: seqWhere } = Sequelize;
      purchaseOr.push(
        seqWhere(
          seqWhere(cast(col('purchaseDetail.purchaseDate'), 'text'), {
            [_Op.iLike]: like,
          })
        )
      );

      const lowerSearch = searchTerm.toLowerCase();
      if (['on_book', 'off_book', 'mixed'].includes(lowerSearch)) {
        purchaseOr.push({ isOnBook: lowerSearch });
      }
    }

    // Attach include-level ORs (merge with existing include.where if present)
    if (gradeOr.length) {
      includeGrade.where = includeGrade.where || {};
      includeGrade.where[Op.or] = includeGrade.where[Op.or]
        ? [...(includeGrade.where[Op.or] || []), ...gradeOr]
        : gradeOr;
      includeGrade.required = true; // ensure join exists when searching on grade
    }
    if (purchaseOr.length) {
      includePurchase.where = includePurchase.where || {};
      // If purchaseOr contains Sequelize.where() items they are fine inside include.where
      includePurchase.where[Op.or] = includePurchase.where[Op.or]
        ? [...(includePurchase.where[Op.or] || []), ...purchaseOr]
        : purchaseOr;
      includePurchase.required = true;
    }
    if (sieveOr.length) {
      includeSieve.where = includeSieve.where || {};
      includeSieve.where[Op.or] = includeSieve.where[Op.or]
        ? [...(includeSieve.where[Op.or] || []), ...sieveOr]
        : sieveOr;
      includeSieve.required = true;
    }

    // Attach top-level ORs if any (these are plain objects)
    if (topLevelOr.length) {
      where[Op.or] = topLevelOr;
    }

    // ---- COUNT with safe fallback (build a plain-safe fallback) ----
    const offset = (page - 1) * limit;
    let total;
    try {
      const countResult = await DiamondLot.findAndCountAll({
        where,
        include: baseIncludes,
        attributes: {
          include: [
            'id',
            'totalWeight',
            'zeroPointTwentyFivePacketCount',
            'zeroPointFiftyPacketCount',
            'oneCaratPacketCount',
            'unpackedWeight',
            'meta',
            'createdAt',
            'updatedAt',
          ],
          exclude: [
            'shape',
            'color',
            'clarity',
            'purchaseLocation',
            'purchase',
            'grade',
            'sieveSize',
          ],
        },
        distinct: true,
        subQuery: true,
      });
      total = countResult.count;
    } catch (countError) {
      console.warn(
        'Complex count failed, using safe simple count:',
        countError.message
      );

      // Build a safe plain WHERE: only include lot-level simple fields (no Sequelize.where, no Sequelize.col)
      const safeWhere = {};
      if (where.createdAt) safeWhere.createdAt = where.createdAt;
      if (where.sieveSize) safeWhere.sieveSize = where.sieveSize;

      // keep only top-level ORs that are plain objects (id, sieveSize)
      if (Array.isArray(where[Op.or])) {
        const plainTopOr = where[Op.or].filter((it) => {
          // allow plain key->value objects only
          return (
            it &&
            typeof it === 'object' &&
            !it.constructor.name.includes('Where') && // rough guard
            !Object.values(it).some(
              (v) => typeof v === 'object' && v._isSequelizeMethod
            ) // avoid Sequelize.where
          );
        });
        if (plainTopOr.length) safeWhere[Op.or] = plainTopOr;
      }

      total = await DiamondLot.count({ where: safeWhere });
    }

    // ---- statistics (aggregates) ----

    function cleanIncludesForAggregates(includes) {
      if (!Array.isArray(includes)) return [];
      return includes.map((inc) => {
        const clone = { ...inc, attributes: [], required: !!inc.required };
        if (Array.isArray(inc.include) && inc.include.length) {
          clone.include = cleanIncludesForAggregates(inc.include);
        }
        return clone;
      });
    }

    // build cleaned statsIncludes
    const statsIncludes = cleanIncludesForAggregates(baseIncludes);

    const statisticsQuery = await DiamondLot.findOne({
      where,
      include: statsIncludes,
      attributes: [
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn('SUM', Sequelize.col('DiamondLot.totalWeight')),
            0
          ),
          'totalAvailableWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                'COALESCE("DiamondLot"."zeroPointTwentyFivePacketCount", 0) * 0.25'
              )
            ),
            0
          ),
          'totalZeroPointTwentyFiveWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                'COALESCE("DiamondLot"."zeroPointFiftyPacketCount", 0) * 0.50'
              )
            ),
            0
          ),
          'totalZeroPointFiftyWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                'COALESCE("DiamondLot"."oneCaratPacketCount", 0) * 1.0'
              )
            ),
            0
          ),
          'totalOneCaratWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn('SUM', Sequelize.col('DiamondLot.unpackedWeight')),
            0
          ),
          'totalUnpackedWeight',
        ],
      ],
      raw: true,
      subQuery: false,
    });

    const statisticsRow = statisticsQuery || {};
    const statistics = {
      totalAvailableWeight: parseFloat(statisticsRow.totalAvailableWeight || 0),
      totalZeroPointTwentyFiveWeight: parseFloat(
        statisticsRow.totalZeroPointTwentyFiveWeight || 0
      ),
      totalZeroPointFiftyWeight: parseFloat(
        statisticsRow.totalZeroPointFiftyWeight || 0
      ),
      totalOneCaratWeight: parseFloat(statisticsRow.totalOneCaratWeight || 0),
      totalUnpackedWeight: parseFloat(statisticsRow.totalUnpackedWeight || 0),
    };

    // ---- sorting ----
    const sortMap = {
      id: ['id'],
      purchaseDate: [
        { model: DiamondPurchase, as: 'purchaseDetail' },
        'purchaseDate',
      ],
      totalWeight: ['totalWeight'],
      sieveSize: [{ model: SieveSize, as: 'sieveSizeDetail' }, 'size'],
      unpackedQty: ['unpackedWeight'],
      shape: [{ model: DiamondGrade, as: 'gradeDetail' }, 'shape'],
      color: [{ model: DiamondGrade, as: 'gradeDetail' }, 'color'],
      clarity: [{ model: DiamondGrade, as: 'gradeDetail' }, 'clarity'],
      purchaseLocation: [
        { model: DiamondPurchase, as: 'purchaseDetail' },
        'purchaseLocation',
      ],
      isOnBook: [{ model: DiamondPurchase, as: 'purchaseDetail' }, 'isOnBook'],
    };

    const sortKey = sortMap[sortBy] || sortMap.id;
    const direction =
      String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [
      Array.isArray(sortKey) ? [...sortKey, direction] : [sortKey, direction],
    ];

    // ---- fetch rows ----
    const packetCountLiteral = Sequelize.literal(
      `(
        COALESCE("DiamondLot"."zeroPointTwentyFivePacketCount", 0) +
        COALESCE("DiamondLot"."zeroPointFiftyPacketCount", 0) +
        COALESCE("DiamondLot"."oneCaratPacketCount", 0)
      )`
    );

    const rows = await DiamondLot.findAll({
      where,
      include: [...baseIncludes, includePackets],
      attributes: {
        include: [[packetCountLiteral, 'packetCount']],
        exclude: ['purchase', 'grade', 'sieveSize'],
      },
      order,
      offset,
      limit: parseInt(limit),
      subQuery: true,
      distinct: true,
    });

    const processedRows = rows.map((row) => {
      const plainRow = row.get({ plain: true });
      const { purchase, grade, sieveSize, ...cleanRow } = plainRow;
      return { ...cleanRow };
    });

    const paginationData = await pagination(total, page, limit);

    return successResponse(res, 5002, {
      paginationData,
      diamonds: processedRows,
      statistics,
    });
  } catch (err) {
    console.error('getDiamondLots err', err);
    return errorResponse(res, err.message || err, 500);
  }
};

export const getDiamondsQRCodes = async (req, res) => {
  try {
    const { purchaseId, lotId, packetIds, search } = req.query;

    const where = {};
    if (purchaseId) where.purchase = purchaseId;
    if (lotId) where.lot = lotId;
    if (packetIds)
      where.id = { [Op.in]: packetIds.split(',').map((x) => parseInt(x)) };
    if (search) where.id = parseInt(search);
    where.isUnpacked = false;
    const packets = await DiamondPacket.findAll({
      where,
      attributes: {
        exclude: ['purchase', 'grade', 'lot', 'location'],
      },
      include: [
        {
          model: DiamondGrade,
          as: 'gradeDetail',
          attributes: {
            exclude: ['shape', 'color', 'clarity'],
            include: ['id'],
          },
          include: [
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
          ],
        },
        {
          model: DiamondLot,
          as: 'lotDetail',
          attributes: {
            exclude: ['sieveSize'],
            include: ['id'],
          },
          include: [
            {
              model: SieveSize,
              as: 'sieveSizeDetail',
              attributes: ['id', 'size', 'shape_id'],
              required: false,
            },
          ],
        },
        {
          model: Location,
          as: 'locationDetail',
          attributes: ['id', 'name'],
          required: false,
          include: [
            {
              model: Country,
              as: 'countryDetail',
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
      ],

      order: [['id', 'ASC']],
    });

    const processedPackets = packets.map((packet) => {
      const plainPacket = packet.get({ plain: true });

      const { purchase, grade, lot, ...cleanPacket } = plainPacket;

      return {
        ...cleanPacket,
      };
    });

    const response = {
      qrData: processedPackets,
    };

    return successResponse(res, 5010, response);
  } catch (err) {
    console.error('getDiamondsQRCodes err', err);
    return errorResponse(res, err.message || err, 500);
  }
};

export const scanDiamondQRCode = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return errorResponse(res, 'id required');

    const packet = await DiamondPacket.findOne({
      where: { id: parseInt(id) },
      include: [
        {
          model: DiamondGrade,
          as: 'gradeDetail',
          attributes: {
            exclude: ['shape', 'color', 'clarity'],
            include: ['id'],
          },
          include: [
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
          ],
        },
        { model: DiamondLot, as: 'lotDetail' },
        {
          model: DiamondPurchase,
          as: 'purchaseDetail',
          attributes: {
            exclude: ['purchaseLocation'],
            include: ['id', 'purchaseDate', 'invoiceNumber'],
          },
          required: false,
          include: [
            {
              model: Location,
              as: 'purchaseLocationDetail',
              attributes: ['id', 'name', 'address', 'phone', 'contact_person'],
              required: false,
              include: [
                {
                  model: Country,
                  as: 'countryDetail',
                  attributes: ['id', 'name'],
                  required: false,
                },
              ],
            },
          ],
        },
        { model: PacketSource, as: 'sources' },
      ],
    });

    if (!packet) return errorResponse(res, 'Packet not found', 404);

    if (packet.isUnpacked) {
      return errorResponse(res, 'Packet is already unpacked');
    }

    const processedPacket = packet.get({ plain: true });
    const { lot, purchase, grade, location, ...cleanPacket } = processedPacket;

    if (cleanPacket.purchaseDetail) {
      const { purchaseLocation, ...cleanPurchaseDetail } =
        cleanPacket.purchaseDetail;
      cleanPacket.purchaseDetail = cleanPurchaseDetail;
    }

    const response = { qrData: cleanPacket };

    return successResponse(res, 5010, response);
  } catch (err) {
    console.error('scanDiamondQRCode err', err);
    return errorResponse(res, err.message || err);
  }
};

/**
 * deleteDiamond
 * Supports deleting a purchase or a single packet.
 * POST { type: 'purchase'|'packet', id }
 * Rules:
 *  - cannot delete purchase if there are sale inventory movements linked to its purchaseId.
 *  - cannot delete packet if remainingWeight < weight (i.e., partially/fully consumed)
 */
export const deleteDiamond = async (req, res) => {
  const { type, id } = req.body;
  if (!type || !id)
    return res
      .status(400)
      .json({ success: false, message: 'type and id required' });

  const t = await sequelize.transaction();
  try {
    if (type === 'purchase') {
      const purchase = await DiamondPurchase.findByPk(id, { transaction: t });
      if (!purchase) {
        await t.rollback();
        return res
          .status(404)
          .json({ success: false, message: 'Purchase not found' });
      }
      // check if any sale inventory movements for this purchase
      const saleMove = await InventoryMovement.findOne({
        where: { purchaseId: id, type: 'sale' },
        transaction: t,
      });
      if (saleMove) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot delete purchase with sale records',
        });
      }
      // Soft delete (paranoid) - will cascade if you configured associations
      await purchase.destroy({ transaction: t });
      await t.commit();
      return res.json({ success: true, message: 'Purchase deleted' });
    } else if (type === 'packet') {
      const packet = await DiamondPacket.findByPk(id, { transaction: t });
      if (!packet) {
        await t.rollback();
        return res
          .status(404)
          .json({ success: false, message: 'Packet not found' });
      }
      if (
        parseFloat(packet.remainingWeight) <
        parseFloat(packet.weight) - 0.0001
      ) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Packet partially consumed or sold - cannot delete',
        });
      }
      await packet.destroy({ transaction: t });
      // reduce lot aggregates
      if (packet.lotId) {
        const lot = await DiamondLot.findByPk(packet.lotId, { transaction: t });
        if (lot) {
          const weight = parseFloat(packet.weight || 0);
          await lot.decrement(
            {
              totalWeight: weight,
              // decrement counts by type
              zeroPointTwentyFivePacketCount: packet.weight == 0.25 ? 1 : 0,
              zeroPointFiftyPacketCount: packet.weight == 0.5 ? 1 : 0,
              oneCaratPacketCount: packet.weight == 1.0 ? 1 : 0,
              unpackedWeight: packet.isUnpacked ? weight : 0,
            },
            { transaction: t }
          );
        }
      }
      await t.commit();
      return res.json({ success: true, message: 'Packet deleted' });
    } else {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'Unknown delete type' });
    }
  } catch (err) {
    await t.rollback();
    console.error('deleteDiamond err', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message || err,
    });
  }
};

export const getPurchaseHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      supplierId,
      locationId,
      search,
      sortBy = 'id',
      sortOrder = 'DESC',
      purchaseDate,
      purchaseDateFrom,
      purchaseDateTo,
      paymentStatus,
      dueStatus,
      onBookStatus,
    } = req.query;

    const where = {};

    if (supplierId) where.supplier = supplierId;

    if (purchaseDate) {
      where.purchaseDate = purchaseDate;
    } else if (purchaseDateFrom || purchaseDateTo) {
      where.purchaseDate = {};
      if (purchaseDateFrom) where.purchaseDate[Op.gte] = purchaseDateFrom;
      if (purchaseDateTo) where.purchaseDate[Op.lte] = purchaseDateTo;
    }
    if (onBookStatus === 'on_book' || onBookStatus === 'off_book')
      where.isOnBook = onBookStatus;

    const includeSupplier = {
      model: Supplier,
      as: 'suppliers',
      attributes: ['id', 'supplier_name'],
    };

    const includePurchaseLocation = {
      model: Location,
      as: 'purchaseLocationDetail',
      attributes: [
        'id',
        'name',
        'country',
        'address',
        'city',
        'state',
        'phone',
        'contact_person',
      ],
      required: false,
      include: [
        {
          model: Country,
          as: 'countryDetail',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    };

    if (locationId) {
      includePurchaseLocation.where = { id: locationId };
      includePurchaseLocation.required = true;
    }

    const includePayments = {
      model: DiamondPayment,
      as: 'payments',
      attributes: ['amount', 'paymentDate', 'paymentType', 'note'],
    };

    const includeLots = {
      model: DiamondLot,
      as: 'lots',
      required: false,
      attributes: [
        'id',
        'sieveSize',
        'totalWeight',
        'zeroPointTwentyFivePacketCount',
        'zeroPointFiftyPacketCount',
        'oneCaratPacketCount',
        'unpackedWeight',
      ],
    };

    const orConditions = [];
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const like = `%${searchTerm}%`;
      const numeric = !Number.isNaN(Number(searchTerm))
        ? Number(searchTerm)
        : null;

      if (numeric !== null) {
        orConditions.push({ id: numeric });
        orConditions.push({ supplier: numeric });
      }

      orConditions.push(
        Sequelize.where(
          Sequelize.cast(Sequelize.col('DiamondPurchase.purchaseDate'), 'text'),
          { [Op.iLike]: like }
        )
      );
      orConditions.push(
        Sequelize.where(Sequelize.col('DiamondPurchase.invoiceNumber'), {
          [Op.iLike]: like,
        })
      );
    }

    if (orConditions.length) where[Op.or] = orConditions;

    const offset = (page - 1) * limit;

    const sortMap = {
      id: ['id'],
      purchaseDate: ['purchaseDate'],
      supplier: [{ model: Supplier, as: 'suppliers' }, 'supplier_name'],
      purchaseLocation: [
        { model: Location, as: 'purchaseLocationDetail' },
        'name',
      ],
    };

    const sortKey = sortMap[sortBy] || sortMap.id;
    const direction =
      String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [
      Array.isArray(sortKey) ? [...sortKey, direction] : [sortKey, direction],
    ];

    const include = [
      includeSupplier,
      includePurchaseLocation,
      includePayments,
      includeLots,
    ];

    let { count, rows } = await DiamondPurchase.findAndCountAll({
      where,
      include,
      order,
      offset,
      limit: parseInt(limit),
      distinct: true,
    });

    const currentDate = new Date();
    const processedRows = rows.map((purchase) => {
      const plain = purchase.get({ plain: true });

      const totalPaid =
        plain.payments?.reduce(
          (sum, p) => sum + parseFloat(p.amount || 0),
          0
        ) || 0;

      const purchasePrice = parseFloat(plain.purchasePrice || 0);
      const pendingAmount = purchasePrice - totalPaid;

      const isPaid = pendingAmount <= 0;
      const isUnpaid = pendingAmount > 0;

      let isDueToday = false;
      let isDueThisWeek = false;
      let isDueThisMonth = false;
      let isOverdue = false;
      let overdueDays = 0;
      let dueDate = null;

      if (isUnpaid && plain.purchaseDate && plain.paymentTermsDays) {
        const purchaseDate = new Date(plain.purchaseDate);
        dueDate = new Date(purchaseDate);
        dueDate.setDate(
          purchaseDate.getDate() + parseInt(plain.paymentTermsDays)
        );

        const today = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate()
        );
        const dueDateOnly = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate()
        );

        const daysDiff = Math.ceil(
          (dueDateOnly - today) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff < 0) {
          isOverdue = true;
          overdueDays = Math.abs(daysDiff);
        } else if (daysDiff === 0) {
          isDueToday = true;
        } else if (daysDiff <= 7) {
          isDueThisWeek = true;
        } else if (daysDiff <= 30) {
          isDueThisMonth = true;
        }
      }

      return {
        ...plain,
        totalPaid,
        pendingAmount,
        isPaid,
        isUnpaid,
        isDueToday,
        isDueThisWeek,
        isDueThisMonth,
        isOverdue,
        overdueDays,
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : null,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
      };
    });

    let filteredRows = processedRows;
    if (paymentStatus) {
      filteredRows = processedRows.filter((row) => {
        if (paymentStatus === 'paid') return row.isPaid;
        if (paymentStatus === 'unpaid') return row.isUnpaid;
        return true;
      });
    }

    if (dueStatus) {
      filteredRows = filteredRows.filter((row) => {
        switch (dueStatus) {
          case 'due_today':
            return row.isDueToday;
          case 'due_week':
            return row.isDueThisWeek;
          case 'due_month':
            return row.isDueThisMonth;
          case 'overdue':
            return row.isOverdue;
          default:
            return true;
        }
      });
    }

    const totalWeightPurchase = filteredRows.reduce(
      (sum, p) => sum + parseFloat(p.totalWeight || 0),
      0
    );

    const totalPurchasePrice = filteredRows.reduce(
      (sum, p) => sum + parseFloat(p.purchasePrice || 0),
      0
    );

    const totalPaidAmount = filteredRows.reduce(
      (sum, p) => sum + parseFloat(p.totalPaid || 0),
      0
    );

    const totalPendingAmount = filteredRows.reduce(
      (sum, p) => sum + parseFloat(p.pendingAmount || 0),
      0
    );

    const totalTimesPurchase = filteredRows.length;

    const finalCount = filteredRows.length;
    const paginationData = await pagination(finalCount, page, limit);

    const response = {
      paginationData,
      purchaseHistory: filteredRows,
      statistics: {
        totalWeightPurchase,
        totalPurchasePrice,
        totalPaidAmount,
        totalPendingAmount,
        totalTimesPurchase,
      },
    };

    return successResponse(res, 5008, response);
  } catch (err) {
    console.error('getPurchaseHistory err', err);
    return errorResponse(res, err.message || err);
  }
};

export const getDiamondsGroupedByGrade = async (req, res) => {
  try {
    const {
      shapeId,
      colorId,
      clarityId,
      sieveSizeId,
      purchaseLocationId,
      isOnBookFlag,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      search,
      sortBy = 'id',
      sortOrder = 'DESC',
      dateField = 'lotCreatedAt',
    } = req.query;

    const where = {};
    if (sieveSizeId) where.sieveSize = sieveSizeId;

    // date filter for lot.createdAt (default)
    if (startDate || endDate) {
      if (dateField !== 'purchaseDate') {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
          const endDt = new Date(endDate);
          endDt.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = endDt;
        }
      }
    }

    // --- includes with placeholders for include-specific search ORs ---
    const includeGrade = {
      model: DiamondGrade,
      as: 'gradeDetail',
      attributes: ['id', 'shape', 'color', 'clarity'],
      required: false,
      include: [
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
      ],
    };

    const includePurchase = {
      model: DiamondPurchase,
      as: 'purchaseDetail',
      attributes: [
        'id',
        'purchaseDate',
        'invoiceNumber',
        'purchaseLocation',
        'isOnBook',
      ],
      required: false,
      include: [
        {
          model: Location,
          as: 'purchaseLocationDetail',
          attributes: ['id', 'name', 'country'],
          required: false,
          include: [
            {
              model: Country,
              as: 'countryDetail',
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
      ],
    };

    const includeSieve = {
      model: SieveSize,
      as: 'sieveSizeDetail',
      attributes: ['id', 'size', 'shape_id'],
      required: false,
    };

    // UPDATED: Filter packets to only include those NOT available for store
    const includePackets = {
      model: DiamondPacket,
      as: 'packets',
      attributes: [],
      required: false,
      where: {
        isAvailableForStore: false, // Only packets NOT available for store
      },
    };

    if (shapeId || colorId || clarityId) {
      includeGrade.where = includeGrade.where || {};
      if (shapeId) includeGrade.where.shape = shapeId;
      if (colorId) includeGrade.where.color = colorId;
      if (clarityId) includeGrade.where.clarity = clarityId;
      includeGrade.required = true;
    }

    if (purchaseLocationId) {
      includePurchase.where = {
        ...(includePurchase.where || {}),
        purchaseLocation: purchaseLocationId,
      };
      includePurchase.required = true;
    }
    if (isOnBookFlag) {
      includePurchase.where = {
        ...(includePurchase.where || {}),
        isOnBook: isOnBookFlag,
      };
      includePurchase.required = true;
    }

    if (dateField === 'purchaseDate' && (startDate || endDate)) {
      includePurchase.where = includePurchase.where || {};
      if (startDate)
        includePurchase.where.purchaseDate = {
          ...(includePurchase.where.purchaseDate || {}),
          [Op.gte]: startDate,
        };
      if (endDate)
        includePurchase.where.purchaseDate = {
          ...(includePurchase.where.purchaseDate || {}),
          [Op.lte]: endDate,
        };
      includePurchase.required = true;
    }

    const baseIncludes = [includeGrade, includePurchase, includeSieve];

    // ----- SEARCH: put association searches into include.where (not top-level) -----
    const topLevelOr = [];
    const gradeOr = [];
    const purchaseOr = [];
    const sieveOr = [];

    if (search && search.trim()) {
      const searchTerm = search.trim();
      const like = `%${searchTerm}%`;
      const numeric = !Number.isNaN(Number(searchTerm))
        ? Number(searchTerm)
        : null;

      if (numeric !== null) {
        topLevelOr.push({ id: numeric });
        topLevelOr.push({ sieveSize: numeric });
        gradeOr.push(
          { shape: numeric },
          { color: numeric },
          { clarity: numeric }
        );
        purchaseOr.push({ purchaseLocation: numeric });
      }

      sieveOr.push({ size: { [Op.iLike]: like } });
      gradeOr.push({ code: { [Op.iLike]: like } });
      purchaseOr.push({ invoiceNumber: { [Op.iLike]: like } });

      const { Op: _Op, fn, col, cast, where: seqWhere } = Sequelize;
      purchaseOr.push(
        seqWhere(
          seqWhere(cast(col('purchaseDetail.purchaseDate'), 'text'), {
            [_Op.iLike]: like,
          })
        )
      );

      const lowerSearch = searchTerm.toLowerCase();
      if (['on_book', 'off_book', 'mixed'].includes(lowerSearch)) {
        purchaseOr.push({ isOnBook: lowerSearch });
      }
    }

    if (gradeOr.length) {
      includeGrade.where = includeGrade.where || {};
      includeGrade.where[Op.or] = includeGrade.where[Op.or]
        ? [...(includeGrade.where[Op.or] || []), ...gradeOr]
        : gradeOr;
      includeGrade.required = true;
    }
    if (purchaseOr.length) {
      includePurchase.where = includePurchase.where || {};
      includePurchase.where[Op.or] = includePurchase.where[Op.or]
        ? [...(includePurchase.where[Op.or] || []), ...purchaseOr]
        : purchaseOr;
      includePurchase.required = true;
    }
    if (sieveOr.length) {
      includeSieve.where = includeSieve.where || {};
      includeSieve.where[Op.or] = includeSieve.where[Op.or]
        ? [...(includeSieve.where[Op.or] || []), ...sieveOr]
        : sieveOr;
      includeSieve.required = true;
    }

    if (topLevelOr.length) where[Op.or] = topLevelOr;

    // ---- COUNT with safe fallback (same as getDiamonds) ----
    const offset = (page - 1) * limit;
    let total;
    try {
      const countResult = await DiamondLot.findAndCountAll({
        where,
        include: baseIncludes,
        attributes: {
          include: [
            'id',
            'totalWeight',
            'zeroPointTwentyFivePacketCount',
            'zeroPointFiftyPacketCount',
            'oneCaratPacketCount',
            'unpackedWeight',
            'meta',
            'createdAt',
            'updatedAt',
          ],
          exclude: [
            'shape',
            'color',
            'clarity',
            'purchaseLocation',
            'purchase',
            'grade',
            'sieveSize',
          ],
        },
        distinct: true,
        subQuery: true,
      });
      total = countResult.count;
    } catch (countError) {
      console.warn(
        'Complex count failed, using safe simple count:',
        countError.message
      );
      const safeWhere = {};
      if (where.createdAt) safeWhere.createdAt = where.createdAt;
      if (where.sieveSize) safeWhere.sieveSize = where.sieveSize;

      if (Array.isArray(where[Op.or])) {
        const plainTopOr = where[Op.or].filter((it) => {
          return (
            it &&
            typeof it === 'object' &&
            !it.constructor.name.includes('Where') &&
            !Object.values(it).some(
              (v) => typeof v === 'object' && v._isSequelizeMethod
            )
          );
        });
        if (plainTopOr.length) safeWhere[Op.or] = plainTopOr;
      }
      total = await DiamondLot.count({ where: safeWhere });
    }

    // ---- statistics (same aggregator as before) ----
    function cleanIncludesForAggregates(includes) {
      if (!Array.isArray(includes)) return [];
      return includes.map((inc) => {
        const clone = { ...inc, attributes: [], required: !!inc.required };
        if (Array.isArray(inc.include) && inc.include.length) {
          clone.include = cleanIncludesForAggregates(inc.include);
        }
        return clone;
      });
    }
    const statsIncludes = cleanIncludesForAggregates(baseIncludes);
    const statisticsQuery = await DiamondLot.findOne({
      where,
      include: statsIncludes,
      attributes: [
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn('SUM', Sequelize.col('DiamondLot.totalWeight')),
            0
          ),
          'totalAvailableWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                'COALESCE("DiamondLot"."zeroPointTwentyFivePacketCount", 0) * 0.25'
              )
            ),
            0
          ),
          'totalZeroPointTwentyFiveWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                'COALESCE("DiamondLot"."zeroPointFiftyPacketCount", 0) * 0.50'
              )
            ),
            0
          ),
          'totalZeroPointFiftyWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                'COALESCE("DiamondLot"."oneCaratPacketCount", 0) * 1.0'
              )
            ),
            0
          ),
          'totalOneCaratWeight',
        ],
        [
          Sequelize.fn(
            'COALESCE',
            Sequelize.fn('SUM', Sequelize.col('DiamondLot.unpackedWeight')),
            0
          ),
          'totalUnpackedWeight',
        ],
      ],
      raw: true,
      subQuery: false,
    });

    const statisticsRow = statisticsQuery || {};
    const statistics = {
      totalAvailableWeight: parseFloat(statisticsRow.totalAvailableWeight || 0),
      totalZeroPointTwentyFiveWeight: parseFloat(
        statisticsRow.totalZeroPointTwentyFiveWeight || 0
      ),
      totalZeroPointFiftyWeight: parseFloat(
        statisticsRow.totalZeroPointFiftyWeight || 0
      ),
      totalOneCaratWeight: parseFloat(statisticsRow.totalOneCaratWeight || 0),
      totalUnpackedWeight: parseFloat(statisticsRow.totalUnpackedWeight || 0),
    };

    // ---- sorting (same map) ----
    const sortMap = {
      id: ['id'],
      purchaseDate: [
        { model: DiamondPurchase, as: 'purchaseDetail' },
        'purchaseDate',
      ],
      totalWeight: ['totalWeight'],
      sieveSize: [{ model: SieveSize, as: 'sieveSizeDetail' }, 'size'],
      unpackedQty: ['unpackedWeight'],
      shape: [{ model: DiamondGrade, as: 'gradeDetail' }, 'shape'],
      color: [{ model: DiamondGrade, as: 'gradeDetail' }, 'color'],
      clarity: [{ model: DiamondGrade, as: 'gradeDetail' }, 'clarity'],
      purchaseLocation: [
        { model: DiamondPurchase, as: 'purchaseDetail' },
        'purchaseLocation',
      ],
      isOnBook: [{ model: DiamondPurchase, as: 'purchaseDetail' }, 'isOnBook'],
    };

    const sortKey = sortMap[sortBy] || sortMap.id;
    const direction =
      String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [
      Array.isArray(sortKey) ? [...sortKey, direction] : [sortKey, direction],
    ];

    // ---- fetch rows (same as getDiamonds) ----
    // UPDATED: Calculate packet counts by weight category only for packets NOT available for store
    const packetCountLiteral = Sequelize.literal(
      `(
        SELECT COUNT(*)
        FROM diamond_packets
        WHERE diamond_packets.lot = "DiamondLot"."id"
        AND diamond_packets."isAvailableForStore" = false
        AND diamond_packets."deletedAt" IS NULL
      )`
    );

    const zeroPointTwentyFiveCountLiteral = Sequelize.literal(
      `(
        SELECT COUNT(*)
        FROM diamond_packets
        WHERE diamond_packets.lot = "DiamondLot"."id"
        AND diamond_packets."isAvailableForStore" = false
        AND diamond_packets."deletedAt" IS NULL
        AND diamond_packets.weight = 0.25
      )`
    );

    const zeroPointFiftyCountLiteral = Sequelize.literal(
      `(
        SELECT COUNT(*)
        FROM diamond_packets
        WHERE diamond_packets.lot = "DiamondLot"."id"
        AND diamond_packets."isAvailableForStore" = false
        AND diamond_packets."deletedAt" IS NULL
        AND diamond_packets.weight = 0.50
      )`
    );

    const oneCaratCountLiteral = Sequelize.literal(
      `(
        SELECT COUNT(*)
        FROM diamond_packets
        WHERE diamond_packets.lot = "DiamondLot"."id"
        AND diamond_packets."isAvailableForStore" = false
        AND diamond_packets."deletedAt" IS NULL
        AND diamond_packets.weight = 1.00
      )`
    );

    const rows = await DiamondLot.findAll({
      where,
      include: [...baseIncludes, includePackets],
      attributes: {
        include: [
          [packetCountLiteral, 'packetCount'],
          [
            zeroPointTwentyFiveCountLiteral,
            'availableZeroPointTwentyFivePacketCount',
          ],
          [zeroPointFiftyCountLiteral, 'availableZeroPointFiftyPacketCount'],
          [oneCaratCountLiteral, 'availableOneCaratPacketCount'],
        ],
        exclude: ['purchase', 'grade', 'sieveSize'],
      },
      order,
      offset,
      limit: parseInt(limit),
      subQuery: true,
      distinct: true,
    });

    // convert to plain objects and remove internal fields purchase/grade/sieveSize as original
    const processedRows = rows.map((row) => {
      const plainRow = row.get({ plain: true });
      const { purchase, grade, sieveSize, ...cleanRow } = plainRow;
      return { ...cleanRow };
    });

    const gradeMap = new Map();

    processedRows.forEach((lot) => {
      const gradeObj = lot.gradeDetail || null;
      const sieveObj = lot.sieveSizeDetail || null;

      const gradeId = gradeObj ? gradeObj.id : lot.grade || 'unknown';
      const sieveId = sieveObj ? sieveObj.id : lot.sieveSize || 'unknown';

      // find or create grade
      if (!gradeMap.has(gradeId)) {
        gradeMap.set(gradeId, {
          id: gradeObj ? gradeObj.id : null,
          code: gradeObj ? gradeObj.code : null,
          shapeDetail: gradeObj ? gradeObj.shapeDetail || null : null,
          colorDetail: gradeObj ? gradeObj.colorDetail || null : null,
          clarityDetail: gradeObj ? gradeObj.clarityDetail || null : null,
          sieves: [],
        });
      }

      const gradeEntry = gradeMap.get(gradeId);

      let sieveEntry = gradeEntry.sieves.find((s) => s.sieveId === sieveId);
      if (!sieveEntry) {
        sieveEntry = {
          sieveId: sieveObj ? sieveObj.id : null,
          sieveSize: sieveObj ? sieveObj.size : null,
          lots: [],
          totalWeight: 0,
          totalPacketCount: 0,
        };
        gradeEntry.sieves.push(sieveEntry);
      }

      lot.deallocateZeroPointTwentyFivePacketCount = Math.abs(
        lot?.zeroPointTwentyFivePacketCount -
        lot?.availableZeroPointTwentyFivePacketCount
      );
      lot.deallocateZeroPointFiftyPacketCount = Math.abs(
        lot?.zeroPointFiftyPacketCount - lot?.availableZeroPointFiftyPacketCount
      );
      lot.deallocateOneCaratPacketCount = Math.abs(
        lot?.oneCaratPacketCount - lot?.availableOneCaratPacketCount
      );

      lot.deallocateZeroPointTwentyFivePacketCount = Math.abs(
        lot?.zeroPointTwentyFivePacketCount -
        lot?.availableZeroPointTwentyFivePacketCount
      );
      lot.deallocateZeroPointFiftyPacketCount = Math.abs(
        lot?.zeroPointFiftyPacketCount - lot?.availableZeroPointFiftyPacketCount
      );
      lot.deallocateOneCaratPacketCount = Math.abs(
        lot?.oneCaratPacketCount - lot?.availableOneCaratPacketCount
      );
     
      sieveEntry.lots.push(lot);

      const lotWeight = parseFloat(lot.totalWeight || 0);
      const lotPacketCount = parseInt(lot.packetCount || 0, 10) || 0;
      sieveEntry.totalWeight += lotWeight;
      sieveEntry.totalPacketCount += lotPacketCount;
    });

    const grades = Array.from(gradeMap.values());

    const paginationData = await pagination(total, page, limit);

    return successResponse(res, 5002, {
      paginationData,
      grades,
      statistics,
    });
  } catch (err) {
    console.error('getDiamondsGroupedByGrade err', err);
    return errorResponse(res, err.message || err, 500);
  }
};

export const allocatePacketsForStore = async (req, res) => {
  const payload = req.body;
  if (
    !payload ||
    !Array.isArray(payload.allocations) ||
    payload.allocations.length === 0
  ) {
    return errorResponse(res, 5027);
  }

  const SIZE_META = {
    0.25: { lotField: 'zeroPointTwentyFivePacketCount', weight: 0.25 },
    '0.50': { lotField: 'zeroPointFiftyPacketCount', weight: 0.5 },
    '1.00': { lotField: 'oneCaratPacketCount', weight: 1.0 },
  };

  const canonicalSizeKey = (raw) => {
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n.toFixed(2);
  };

  const needMap = new Map();
  const lotIdsSet = new Set();

  for (const alloc of payload.allocations) {
    const lotId = Number(alloc.lotId);
    if (!lotId) return errorResponse(res, 'invalid lotId in allocations');
    lotIdsSet.add(lotId);

    const sizeCounts = alloc.sizeCounts || {};
    for (const rawKey of Object.keys(sizeCounts)) {
      const cKey = canonicalSizeKey(rawKey);
      if (!cKey) return errorResponse(res, `invalid size key: ${rawKey}`);
      const needed = Number(sizeCounts[rawKey]) || 0;
      if (needed <= 0) continue;
      const mapKey = `${lotId}::${cKey}`;
      const existing = needMap.get(mapKey) || {
        lotId,
        sizeKey: cKey,
        needed: 0,
      };
      existing.needed += needed;
      needMap.set(mapKey, existing);
    }
  }

  if (needMap.size === 0)
    return errorResponse(res, 'no valid size counts provided');

  const lotIds = Array.from(lotIdsSet);

  const t = await db.sequelize.transaction();
  try {
    const lots = await DiamondLot.findAll({
      where: { id: { [Op.in]: lotIds } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const foundLotIds = lots.map((l) => Number(l.id));
    const missingLots = lotIds.filter((id) => !foundLotIds.includes(id));
    if (missingLots.length) {
      await t.rollback();
      return errorResponse(res, `Lot(s) not found: ${missingLots.join(',')}`);
    }

    const lotById = new Map(lots.map((l) => [Number(l.id), l]));

    for (const { lotId, sizeKey, needed } of needMap.values()) {
      const meta = SIZE_META[sizeKey];
      if (!meta) {
        await t.rollback();
        return errorResponse(res, `Unsupported size key '${sizeKey}'`);
      }
      const lot = lotById.get(Number(lotId));
      const availableCount = Number(lot[meta.lotField] || 0);
      if (availableCount < needed) {
        await t.rollback();
        return errorResponse(
          res,
          5029,
          `Not enough packets in lot ${lotId} for size ${sizeKey} — requested ${needed}, lot has ${availableCount}`
        );
      }
    }

    const priorityOrderLiteral = db.sequelize.literal(
      `CASE WHEN "isOnBookFlag"='on_book' THEN 1 WHEN "isOnBookFlag"='off_book' THEN 2 ELSE 3 END`
    );

    const selections = [];

    for (const { lotId, sizeKey, needed } of needMap.values()) {
      const meta = SIZE_META[sizeKey];
      if (!meta) {
        await t.rollback();
        return errorResponse(res, `Unsupported size key '${sizeKey}'`);
      }
      const targetWeight = meta.weight;

      const where = {
        lot: lotId,
        weight: targetWeight,
        isUnpacked: false,
        isAvailableForStore: false,
        remainingWeight: { [Op.gt]: 0 },
      };

      const packets = await DiamondPacket.findAll({
        where,
        limit: needed,
        order: [priorityOrderLiteral, ['createdAt', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!packets || packets.length < needed) {
        await t.rollback();
        return errorResponse(
          res,
          'Not enough packets available',
          `Not enough packets available to satisfy lot ${lotId} size ${sizeKey} (requested ${needed}, found ${packets ? packets.length : 0})`
        );
      }

      selections.push({ lotId, sizeKey, needed, packets });
    }

    const now = new Date();
    const availableBy = req.admin?.id || null;
    const allMarkedPacketIds = [];
    const breakdown = [];

    for (const sel of selections) {
      const packetIds = sel.packets.map((p) => p.id);
      if (packetIds.length === 0) continue;

      await DiamondPacket.update(
        { isAvailableForStore: true, availableSince: now, availableBy },
        { where: { id: { [Op.in]: packetIds } }, transaction: t }
      );

      const movements = packetIds.map((pid) => ({
        type: 'adjustment',
        packet: pid,
        lot: sel.lotId || null,
        purchase: null,
        weightDelta: 0,
        onBookDelta: 0,
        offBookDelta: 0,
        user: availableBy,
        note: `Marked available for store by ${availableBy || 'system'} (lot:${sel.lotId} size:${sel.sizeKey})`,
        createdAt: now,
        updatedAt: now,
      }));

      if (movements.length)
        await InventoryMovement.bulkCreate(movements, { transaction: t });

      allMarkedPacketIds.push(...packetIds);
      breakdown.push({
        lotId: sel.lotId,
        sizeKey: sel.sizeKey,
        markedCount: packetIds.length,
      });
    }

    await t.commit();
    return successResponse(res, 5024, {
      marked: allMarkedPacketIds,
      breakdown,
    });
  } catch (err) {
    await t.rollback();
    console.error('allocatePacketsForStore err', err);
    return errorResponse(res, err.message || err);
  }
};

export const deallocatePacketsFromStore = async (req, res) => {
  const payload = req.body;

  const deallocations = Array.isArray(payload.deallocations)
    ? payload.deallocations
    : null;

  if (!deallocations || deallocations.length === 0) {
    return errorResponse(res, 5037);
  }

  const SIZE_META = {
    0.25: { lotField: 'zeroPointTwentyFivePacketCount', weight: 0.25 },
    '0.50': { lotField: 'zeroPointFiftyPacketCount', weight: 0.5 },
    '1.00': { lotField: 'oneCaratPacketCount', weight: 1.0 },
  };

  const canonicalSizeKey = (raw) => {
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n.toFixed(2);
  };

  const needMap = new Map();
  const lotIdsSet = new Set();

  for (const alloc of deallocations) {
    const lotId = Number(alloc.lotId);
    if (!lotId) return errorResponse(res, 5035);
    lotIdsSet.add(lotId);

    const sizeCounts = alloc.sizeCounts || {};
    for (const rawKey of Object.keys(sizeCounts)) {
      const cKey = canonicalSizeKey(rawKey);
      if (!cKey) return errorResponse(res, 9127);
      const needed = Number(sizeCounts[rawKey]) || 0;
      if (needed <= 0) continue;
      const mapKey = `${lotId}::${cKey}`;
      const existing = needMap.get(mapKey) || {
        lotId,
        sizeKey: cKey,
        needed: 0,
      };
      existing.needed += needed;
      needMap.set(mapKey, existing);
    }
  }

  if (needMap.size === 0)
    return errorResponse(res, 'no valid size counts provided');

  const lotIds = Array.from(lotIdsSet);

  const t = await db.sequelize.transaction();
  try {
    const lots = await DiamondLot.findAll({
      where: { id: { [Op.in]: lotIds } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const foundLotIds = lots.map((l) => Number(l.id));
    const missingLots = lotIds.filter((id) => !foundLotIds.includes(id));
    if (missingLots.length) {
      await t.rollback();
      return errorResponse(res, 5018);
    }


    const priorityOrderLiteral = db.sequelize.literal(
      `CASE WHEN "isOnBookFlag"='on_book' THEN 1 WHEN "isOnBookFlag"='off_book' THEN 2 ELSE 3 END`
    );

    const selections = [];

    for (const { lotId, sizeKey, needed } of needMap.values()) {
      const meta = SIZE_META[sizeKey];
      if (!meta) {
        await t.rollback();
        return errorResponse(res, `Unsupported size key '${sizeKey}'`);
      }
      const targetWeight = meta.weight;

      const whereCount = {
        lot: lotId,
        weight: targetWeight,
        isUnpacked: false,
        isAvailableForStore: true,
        remainingWeight: { [Op.gt]: 0 },
      };

      const availableCount = await DiamondPacket.count({
        where: whereCount,
        transaction: t,
      });

      if (availableCount < needed) {
        await t.rollback();
        return errorResponse(
          res,
          5033,
          `Not enough store-available packets in lot ${lotId} for size ${sizeKey} — requested ${needed}, available ${availableCount}`
        );
      }

      const whereFetch = { ...whereCount };
      const packets = await DiamondPacket.findAll({
        where: whereFetch,
        limit: needed,

        order: [
          priorityOrderLiteral,
          ['availableSince', 'DESC'],
          ['createdAt', 'ASC'],
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!packets || packets.length < needed) {
        await t.rollback();
        return errorResponse(
          res,
          5033,
          `Not enough packets available to deallocate from lot ${lotId} size ${sizeKey} (requested ${needed}, found ${packets ? packets.length : 0})`
        );
      }

      selections.push({ lotId, sizeKey, needed, packets });
    }

    const now = new Date();
    const availableBy = payload.createdBy || req.admin?.id || null;
    const allMarkedPacketIds = [];
    const breakdown = [];

    for (const sel of selections) {
      const packetIdsToUnmark = sel.packets.map((p) => p.id);
      if (packetIdsToUnmark.length === 0) continue;

      await DiamondPacket.update(
        { isAvailableForStore: false, availableSince: null, availableBy: null },
        { where: { id: { [Op.in]: packetIdsToUnmark } }, transaction: t }
      );

      const movements = packetIdsToUnmark.map((pid, idx) => {
        const p = sel.packets[idx];
        return {
          type: 'adjustment',
          packet: pid,
          lot: sel.lotId || null,
          purchase: p ? p.purchase || null : null,
          weightDelta: 0,
          onBookDelta: 0,
          offBookDelta: 0,
          user: availableBy,
          note: `Marked unavailable for store by ${availableBy || 'system'} (lot:${sel.lotId} size:${sel.sizeKey})`,
          createdAt: now,
          updatedAt: now,
        };
      });

      if (movements.length)
        await InventoryMovement.bulkCreate(movements, { transaction: t });

      allMarkedPacketIds.push(...packetIdsToUnmark);
      breakdown.push({
        lotId: sel.lotId,
        sizeKey: sel.sizeKey,
        unmarkedCount: packetIdsToUnmark.length,
      });
    }

    await t.commit();
    return successResponse(res, 5025, {
      unmarked: allMarkedPacketIds,
      breakdown,
    });
  } catch (err) {
    await t.rollback();
    console.error('markPacketsUnavailable err', err);
    return errorResponse(res, err.message || err);
  }
};

// export const unpackDiamondsLot = async (req, res) => {
//   const payload = req.body;

//   const sourcePacketIds = JSON.parse(payload.sourcePacketIds) || [];

//   let grades = [];
//   try {
//     grades =
//       typeof payload.grades === 'string'
//         ? JSON.parse(payload.grades)
//         : payload.grades || [];
//   } catch (err) {
//     return errorResponse(res, 'Invalid grades JSON');
//   }

//   if (!Array.isArray(sourcePacketIds) || sourcePacketIds.length === 0) {
//     return errorResponse(res, 'sourcePacketIds required');
//   }
//   if (!Array.isArray(grades) || grades.length === 0) {
//     return errorResponse(res, 'grades required');
//   }

//   const t = await sequelize.transaction();
//   try {
//     const sources = await DiamondPacket.findAll({
//       where: { id: { [Op.in]: sourcePacketIds } },
//       order: [['createdAt', 'ASC']],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!sources || sources.length === 0) {
//       await t.rollback();
//       return errorResponse(res, 'No source packets found');
//     }

//     const locationSet = new Set();
//     for (const source of sources) {
//       if (source.location !== null && source.location !== undefined) {
//         locationSet.add(source.location);
//       }
//     }

//     if (locationSet.size > 1) {
//       await t.rollback();
//       return errorResponse(
//         res,
//         `Cannot create mixed packet from multiple source locations (${Array.from(locationSet).join(',')}). Mixed packets must be created only from sources at the same location.`
//       );
//     }

//     const commonLocationId =
//       locationSet.size === 1 ? Array.from(locationSet)[0] : null;

//     const lotIds = Array.from(
//       new Set(sources.map((s) => s.lot).filter(Boolean))
//     );
//     let lotById = {};
//     if (lotIds.length > 0) {
//       const lotRows = await DiamondLot.findAll({
//         where: { id: { [Op.in]: lotIds } },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });
//       lotById = lotRows.reduce((acc, l) => {
//         acc[l.id] = l;
//         return acc;
//       }, {});
//     }

//     let totalAvailable = new Decimal(0);
//     const sourceMap = {};
//     for (const s of sources) {
//       const rem = new Decimal(s.remainingWeight || 0);
//       if (rem.lte(0)) continue;
//       const origOn = new Decimal(s.onBookWeight || 0);
//       const origOff = new Decimal(s.offBookWeight || 0);
//       const denom = origOn.plus(origOff);
//       let availOn = new Decimal(0);
//       let availOff = new Decimal(0);
//       if (denom.gt(0)) {
//         availOn = rem.mul(origOn.div(denom));
//         availOff = rem.mul(origOff.div(denom));
//       } else {
//         availOn = rem;
//         availOff = new Decimal(0);
//       }

//       if (availOn.lt(1e-12)) availOn = new Decimal(0);
//       if (availOff.lt(1e-12)) availOff = new Decimal(0);

//       sourceMap[s.id] = {
//         packet: s,
//         remaining: rem,
//         availOn,
//         availOff,
//         origOn,
//         origOff,
//         lotDetail: lotById[s.lot] || null,
//       };
//       totalAvailable = totalAvailable.plus(rem);
//     }

//     let totalRequested = new Decimal(0);
//     const expandedTargets = [];
//     for (const g of grades) {
//       const lots = g.lots || [];
//       for (const lot of lots) {
//         const lotTotal = new Decimal(lot.total_weight || 0);
//         const zero025Count = safeParseInt(
//           lot.zero_point_twenty_five_carat_packet_count ||
//             lot.zeroPointTwentyFiveCount ||
//             0
//         );
//         const zero050Count = safeParseInt(
//           lot.zero_point_fifty_carat_packet_count ||
//             lot.zeroPointFiftyCount ||
//             0
//         );
//         const oneCount = safeParseInt(
//           lot.one_carat_packet_count || lot.oneCaratCount || 0
//         );
//         const unpackedQuantity = safeParseFloat(
//           lot.unpacked_quantity || lot.unpackedWeight || 0
//         );

//         for (let i = 0; i < zero025Count; i++) {
//           expandedTargets.push({
//             gradePayload: g,
//             lotPayload: lot,
//             sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
//             weight: 0.25,
//             isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
//           });
//           totalRequested = totalRequested.plus(0.25);
//         }
//         for (let i = 0; i < zero050Count; i++) {
//           expandedTargets.push({
//             gradePayload: g,
//             lotPayload: lot,
//             sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
//             weight: 0.5,
//             isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
//           });
//           totalRequested = totalRequested.plus(0.5);
//         }
//         for (let i = 0; i < oneCount; i++) {
//           expandedTargets.push({
//             gradePayload: g,
//             lotPayload: lot,
//             sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
//             weight: 1.0,
//             isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
//           });
//           totalRequested = totalRequested.plus(1.0);
//         }
//         if (unpackedQuantity > 0) {
//           expandedTargets.push({
//             gradePayload: g,
//             lotPayload: lot,
//             sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
//             weight: unpackedQuantity,
//             isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
//             isUnpackedTrue: true,
//           });
//           totalRequested = totalRequested.plus(unpackedQuantity);
//         }

//         if (
//           lotTotal.gt(0) &&
//           zero025Count +
//             zero050Count +
//             oneCount +
//             (unpackedQuantity > 0 ? 1 : 0) ===
//             0
//         ) {
//           expandedTargets.push({
//             gradePayload: g,
//             lotPayload: lot,
//             sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
//             weight: lotTotal.toNumber(),
//             isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
//             isUnpackedTrue: true,
//           });
//           totalRequested = totalRequested.plus(lotTotal);
//         }
//       }
//     }

//     if (new Decimal(totalRequested).gt(totalAvailable)) {
//       await t.rollback();
//       return errorResponse(
//         res,
//         `Requested ${totalRequested.toString()} ct exceeds available ${totalAvailable.toString()} ct`
//       );
//     }

//     const onQueue = [];
//     const offQueue = [];

//     for (const s of sources) {
//       const info = sourceMap[s.id];
//       if (!info) continue;
//       if (info.availOn && info.availOn.gt(0))
//         onQueue.push({ sourceId: s.id, available: info.availOn });
//       if (info.availOff && info.availOff.gt(0))
//         offQueue.push({ sourceId: s.id, available: info.availOff });
//     }

//     const consumeFromQueues = (needed, preferOn = true) => {
//       let remain = new Decimal(needed);
//       const contributions = []; // { sourceId, fromOn, fromOff, used }
//       const consumeOneQueue = (queue, isOn) => {
//         while (remain.gt(new Decimal(1e-9)) && queue.length > 0) {
//           const head = queue[0];
//           const headAvail = new Decimal(head.available);
//           if (headAvail.lte(new Decimal(1e-12))) {
//             queue.shift();
//             continue;
//           }
//           const take = Decimal.min(headAvail, remain);

//           contributions.push({
//             sourceId: head.sourceId,
//             fromOn: isOn ? take.toNumber() : 0,
//             fromOff: isOn ? 0 : take.toNumber(),
//             used: take.toNumber(),
//           });

//           head.available = new Decimal(head.available).minus(take).toNumber();
//           const sm = sourceMap[head.sourceId];
//           if (isOn) {
//             sm.availOn = sm.availOn.minus(take);
//           } else {
//             sm.availOff = sm.availOff.minus(take);
//           }

//           sm.remaining = sm.remaining.minus(take);

//           remain = remain.minus(take);
//           if (new Decimal(head.available).lte(new Decimal(1e-12)))
//             queue.shift();
//         }
//       };

//       if (preferOn) {
//         consumeOneQueue(onQueue, true);
//         if (remain.gt(new Decimal(1e-9))) consumeOneQueue(offQueue, false);
//       } else {
//         consumeOneQueue(offQueue, false);
//         if (remain.gt(new Decimal(1e-9))) consumeOneQueue(onQueue, true);
//       }

//       if (remain.gt(new Decimal(1e-6))) {
//         throw new Error(
//           'Insufficient resources while consuming queues (should not happen after validation)'
//         );
//       }
//       return contributions;
//     };

//     const createdPackets = [];
//     const createdLotIds = [];

//     for (const reqItem of expandedTargets) {
//       const { gradePayload, lotPayload, sieveSizeId, weight, isOnBookDesired } =
//         reqItem;

//       // findOrCreate grade
//       const [grade] = await DiamondGrade.findOrCreate({
//         where: {
//           shape:
//             gradePayload.shapeId || gradePayload.shape || gradePayload.shapeId,
//           color:
//             gradePayload.colorId || gradePayload.color || gradePayload.colorId,
//           clarity:
//             gradePayload.clarityId ||
//             gradePayload.clarity ||
//             gradePayload.clarityId,
//         },
//         defaults: { code: gradePayload.code || null },
//         transaction: t,
//       });

//       // findOrCreate target lot (purchase = null because these are created from unpack)
//       const lotWhere = {
//         // purchase: null,
//         grade: grade.id,
//         sieveSize: sieveSizeId || null,
//       };
//       const [lot] = await DiamondLot.findOrCreate({
//         where: lotWhere,
//         defaults: {
//           totalWeight: 0,
//           zeroPointTwentyFivePacketCount: 0,
//           zeroPointFiftyPacketCount: 0,
//           oneCaratPacketCount: 0,
//           unpackedWeight: 0,
//         },
//         transaction: t,
//       });

//       if (!createdLotIds.includes(lot.id)) createdLotIds.push(lot.id);

//       // consume contributions for this packet weight (prefer on_book)
//       const contributions = consumeFromQueues(weight, true);

//       // aggregate per-source contributions
//       let onSum = new Decimal(0),
//         offSum = new Decimal(0);
//       const perSource = {}; // sourceId => { on: Decimal, off: Decimal }
//       for (const c of contributions) {
//         const sid = c.sourceId;
//         if (!perSource[sid])
//           perSource[sid] = { on: new Decimal(0), off: new Decimal(0) };
//         perSource[sid].on = perSource[sid].on.plus(new Decimal(c.fromOn || 0));
//         perSource[sid].off = perSource[sid].off.plus(
//           new Decimal(c.fromOff || 0)
//         );
//         onSum = onSum.plus(new Decimal(c.fromOn || 0));
//         offSum = offSum.plus(new Decimal(c.fromOff || 0));
//       }

//       // create packet
//       const pktObj = {
//         lot: lot.id,
//         purchase: null,
//         grade: grade.id,
//         qrCode: generateTempQR(),
//         weight: new Decimal(weight).toNumber(),
//         onBookWeight: onSum.toNumber(),
//         offBookWeight: offSum.toNumber(),
//         isOnBookFlag:
//           onSum.gt(0) && offSum.gt(0)
//             ? 'mix'
//             : onSum.gt(0)
//               ? 'on_book'
//               : 'off_book',
//         isUnpacked: false,
//         remainingWeight: new Decimal(weight).toNumber(),
//         location: commonLocationId,
//         meta: null,
//       };
//       const newPacket = await DiamondPacket.create(pktObj, { transaction: t });

//       // finalize qrCode
//       const finalQr = `PKT-${newPacket.id}`;
//       await newPacket.update({ qrCode: finalQr }, { transaction: t });

//       // create PacketSource entries
//       for (const sidStr of Object.keys(perSource)) {
//         const sid = parseInt(sidStr, 10);
//         const vals = perSource[sid];
//         // only persist if > 0
//         if (vals.on.plus(vals.off).gt(0)) {
//           await PacketSource.create(
//             {
//               newPacket: newPacket.id,
//               sourcePacket: sid,
//               sourceLot: sourceMap[sid] ? sourceMap[sid].packet.lot : null,
//               contributedOnBookWeight: vals.on.toNumber(),
//               contributedOffBookWeight: vals.off.toNumber(),
//               note: `Unpack created packet ${newPacket.id}`,
//             },
//             { transaction: t }
//           );
//         }
//       }

//       // update lot aggregates
//       const incObj = { totalWeight: weight };
//       if (Math.abs(weight - 0.25) < 0.00001)
//         incObj.zeroPointTwentyFivePacketCount = 1;
//       else if (Math.abs(weight - 0.5) < 0.00001)
//         incObj.zeroPointFiftyPacketCount = 1;
//       else if (Math.abs(weight - 1.0) < 0.00001) incObj.oneCaratPacketCount = 1;
//       else incObj.unpackedWeight = (incObj.unpackedWeight || 0) + weight;

//       await lot.increment(incObj, { transaction: t });

//       await InventoryMovement.create(
//         {
//           type: 'unpack',
//           packet: newPacket.id,
//           lot: lot.id,
//           weightDelta: weight,
//           onBookDelta: onSum.toNumber(),
//           offBookDelta: offSum.toNumber(),
//           user: payload.createdBy || null,
//           note: `Unpack created packet ${newPacket.id}`,
//         },
//         { transaction: t }
//       );

//       createdPackets.push({
//         id: newPacket.id,
//         qrCode: finalQr,
//         weight: newPacket.weight,
//         onBookWeight: newPacket.onBookWeight,
//         offBookWeight: newPacket.offBookWeight,
//         isOnBookFlag: newPacket.isOnBookFlag,
//       });
//     }

//     const createdPacketIds = createdPackets.map((p) => p.id);
//     const psRows = await PacketSource.findAll({
//       where: { newPacket: { [Op.in]: createdPacketIds } },
//       transaction: t,
//     });

//     const consumedPerSource = {};
//     for (const ps of psRows) {
//       const sid = ps.sourcePacket;
//       consumedPerSource[sid] = consumedPerSource[sid] || {
//         on: new Decimal(0),
//         off: new Decimal(0),
//         total: new Decimal(0),
//       };
//       consumedPerSource[sid].on = consumedPerSource[sid].on.plus(
//         new Decimal(ps.contributedOnBookWeight || 0)
//       );
//       consumedPerSource[sid].off = consumedPerSource[sid].off.plus(
//         new Decimal(ps.contributedOffBookWeight || 0)
//       );
//       consumedPerSource[sid].total = consumedPerSource[sid].total
//         .plus(new Decimal(ps.contributedOnBookWeight || 0))
//         .plus(new Decimal(ps.contributedOffBookWeight || 0));
//     }

//     const EPS = new Decimal(1e-9);

//     for (const s of sources) {
//       const sid = s.id;
//       const consumed =
//         consumedPerSource[sid] && consumedPerSource[sid].total
//           ? consumedPerSource[sid].total
//           : new Decimal(0);
//       if (consumed.gt(0)) {
//         const originalRem = new Decimal(s.remainingWeight || 0);
//         const newRem = Decimal.max(new Decimal(0), originalRem.minus(consumed));
//         await DiamondPacket.update(
//           {
//             remainingWeight: newRem.toNumber(),
//             isUnpacked: newRem.lte(EPS),
//           },
//           { where: { id: sid }, transaction: t }
//         );

//         const onConsumed =
//           consumedPerSource[sid] && consumedPerSource[sid].on
//             ? consumedPerSource[sid].on
//             : new Decimal(0);
//         const offConsumed =
//           consumedPerSource[sid] && consumedPerSource[sid].off
//             ? consumedPerSource[sid].off
//             : new Decimal(0);
//         await InventoryMovement.create(
//           {
//             type: 'unpack',
//             packet: sid,
//             lot: s.lot || null,
//             purchase: s.purchase,
//             weightDelta: -consumed.toNumber(),
//             onBookDelta: -onConsumed.toNumber(),
//             offBookDelta: -offConsumed.toNumber(),
//             user: payload.createdBy || null,
//             note: `Consumed for unpack`,
//           },
//           { transaction: t }
//         );

//         const lotId = s.lot;
//         if (lotId) {
//           let lotInstance = lotById[lotId];
//           if (!lotInstance) {
//             lotInstance = await DiamondLot.findByPk(lotId, {
//               transaction: t,
//               lock: t.LOCK.UPDATE,
//             });
//             lotById[lotId] = lotInstance;
//           }
//           if (lotInstance) {
//             // Always decrement total weight
//             await lotInstance.decrement(
//               { totalWeight: consumed.toNumber() },
//               { transaction: t }
//             );

//             const packetWeight = new Decimal(s.weight || 0);
//             const fullyConsumed = newRem.lte(EPS);

//             // Check if this is an unpacked packet (isUnpacked flag or doesn't match standard weights)
//             const isStandardWeight =
//               packetWeight
//                 .sub(new Decimal(0.25))
//                 .abs()
//                 .lte(new Decimal(1e-9)) ||
//               packetWeight.sub(new Decimal(0.5)).abs().lte(new Decimal(1e-9)) ||
//               packetWeight.sub(new Decimal(1.0)).abs().lte(new Decimal(1e-9));

//             if (fullyConsumed) {
//               // If packet is fully consumed, decrement the appropriate count
//               if (
//                 packetWeight.sub(new Decimal(0.25)).abs().lte(new Decimal(1e-9))
//               ) {
//                 await lotInstance.decrement(
//                   { zeroPointTwentyFivePacketCount: 1 },
//                   { transaction: t }
//                 );
//               } else if (
//                 packetWeight.sub(new Decimal(0.5)).abs().lte(new Decimal(1e-9))
//               ) {
//                 await lotInstance.decrement(
//                   { zeroPointFiftyPacketCount: 1 },
//                   { transaction: t }
//                 );
//               } else if (
//                 packetWeight.sub(new Decimal(1.0)).abs().lte(new Decimal(1e-9))
//               ) {
//                 await lotInstance.decrement(
//                   { oneCaratPacketCount: 1 },
//                   { transaction: t }
//                 );
//               } else {
//                 // This is an unpacked packet (non-standard weight), decrement unpacked weight by consumed amount
//                 await lotInstance.decrement(
//                   { unpackedWeight: consumed.toNumber() },
//                   { transaction: t }
//                 );
//               }
//             } else {
//               // If packet is partially consumed and it's not a standard weight (i.e., it's unpacked)
//               if (!isStandardWeight) {
//                 await lotInstance.decrement(
//                   { unpackedWeight: consumed.toNumber() },
//                   { transaction: t }
//                 );
//               }
//               // Note: For standard weight packets that are partially consumed,
//               // we don't decrement the count until they're fully consumed
//             }
//           }
//         }
//       }
//     }

//     await t.commit();

//     const lotsWithDetails = await DiamondLot.findAll({
//       where: { id: { [Op.in]: createdLotIds } },
//       attributes: { exclude: ['purchase', 'grade', 'sieveSize'] },
//       include: [
//         {
//           model: DiamondGrade,
//           as: 'gradeDetail',
//           attributes: { include: ['id', 'code'] },
//           include: [
//             {
//               model: Shape,
//               as: 'shapeDetail',
//               attributes: ['id', 'shape'],
//               required: false,
//             },
//             {
//               model: Color,
//               as: 'colorDetail',
//               attributes: ['id', 'color'],
//               required: false,
//             },
//             {
//               model: Clarity,
//               as: 'clarityDetail',
//               attributes: ['id', 'clarity'],
//               required: false,
//             },
//           ],
//         },
//         {
//           model: SieveSize,
//           as: 'sieveSizeDetail',
//           attributes: ['id', 'size', 'shape_id'],
//           required: false,
//         },
//       ],
//       order: [['id', 'ASC']],
//     });

//     const processedLots = (lotsWithDetails || []).map((lot) => {
//       const plainLot = lot.get({ plain: true });
//       const { purchase, grade, sieveSize, ...cleanLot } = plainLot;
//       return { ...cleanLot };
//     });

//     const response = {
//       packets: createdPackets,
//       lots: processedLots,
//     };

//     return successResponse(res, 5001, response);
//   } catch (err) {
//     await t.rollback();
//     console.error('unpackDiamondsLot err', err);
//     return errorResponse(res, err.message || err);
//   }
// };

export const unpackDiamondsLot = async (req, res) => {
  const payload = req.body;

  let sourcePacketIds = [];
  try {
    sourcePacketIds =
      typeof payload.sourcePacketIds === 'string'
        ? JSON.parse(payload.sourcePacketIds)
        : payload.sourcePacketIds || [];
  } catch (err) {
    return errorResponse(res, 'Invalid sourcePacketIds JSON');
  }

  let grades = [];
  try {
    grades =
      typeof payload.grades === 'string'
        ? JSON.parse(payload.grades)
        : payload.grades || [];
  } catch (err) {
    return errorResponse(res, 'Invalid grades JSON');
  }

  if (!Array.isArray(sourcePacketIds) || sourcePacketIds.length === 0) {
    return errorResponse(res, 'sourcePacketIds required');
  }
  if (!Array.isArray(grades) || grades.length === 0) {
    return errorResponse(res, 'grades required');
  }

  const t = await sequelize.transaction();
  try {
    // 1) fetch & lock source packets (FIFO)
    const sources = await DiamondPacket.findAll({
      where: { id: { [Op.in]: sourcePacketIds } },
      order: [['createdAt', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!sources || sources.length === 0) {
      await t.rollback();
      return errorResponse(res, 'No source packets found');
    }

    // 1.a) ensure all sources are at same location
    const locationSet = new Set();
    for (const s of sources) {
      if (s.location !== null && s.location !== undefined)
        locationSet.add(String(s.location));
    }
    if (locationSet.size > 1) {
      await t.rollback();
      return errorResponse(
        res,
        `Cannot create mixed packet from multiple source locations (${Array.from(
          locationSet
        ).join(
          ','
        )}). Mixed packets must be created only from sources at the same location.`
      );
    }
    const commonLocationId =
      locationSet.size === 1 ? Number(Array.from(locationSet)[0]) : null;

    // 1.b) preload lots of sources (we need to decrement counts later)
    const lotIds = Array.from(
      new Set(sources.map((s) => s.lot).filter(Boolean))
    );
    let lotById = {};
    if (lotIds.length > 0) {
      const lotRows = await DiamondLot.findAll({
        where: { id: { [Op.in]: lotIds } },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      lotById = lotRows.reduce((acc, l) => {
        acc[l.id] = l;
        return acc;
      }, {});
    }

    // 2) compute availability map (on/off portion per source proportional to remaining)
    let totalAvailable = new Decimal(0);
    const sourceMap = {}; // id => { packet, remaining, availOn, availOff, origOn, origOff, lotDetail }
    for (const s of sources) {
      const rem = new Decimal(s.remainingWeight || 0);
      if (rem.lte(0)) continue;
      const origOn = new Decimal(s.onBookWeight || 0);
      const origOff = new Decimal(s.offBookWeight || 0);
      const denom = origOn.plus(origOff);
      let availOn = new Decimal(0);
      let availOff = new Decimal(0);
      if (denom.gt(0)) {
        // distribute remaining proportionally to original composition
        availOn = rem.mul(origOn.div(denom));
        availOff = rem.mul(origOff.div(denom));
      } else {
        // defensive default: treat all as on_book (so admin-visible for on-book users)
        availOn = rem;
        availOff = new Decimal(0);
      }

      // clamp tiny negative rounding
      if (availOn.lt(new Decimal('1e-12'))) availOn = new Decimal(0);
      if (availOff.lt(new Decimal('1e-12'))) availOff = new Decimal(0);

      sourceMap[s.id] = {
        packet: s,
        remaining: rem,
        availOn,
        availOff,
        origOn,
        origOff,
        lotDetail: lotById[s.lot] || null,
      };
      totalAvailable = totalAvailable.plus(rem);
    }

    // 3) expand requested grades -> explicit packet creation targets
    let totalRequested = new Decimal(0);
    const expandedTargets = [];
    for (const g of grades) {
      const lots = g.lots || [];
      for (const lot of lots) {
        const lotTotal = new Decimal(lot.total_weight || 0);
        const zero025Count = safeParseInt(
          lot.zero_point_twenty_five_carat_packet_count ||
          lot.zeroPointTwentyFiveCount ||
          0
        );
        const zero050Count = safeParseInt(
          lot.zero_point_fifty_carat_packet_count ||
          lot.zeroPointFiftyCount ||
          0
        );
        const oneCount = safeParseInt(
          lot.one_carat_packet_count || lot.oneCaratCount || 0
        );
        const unpackedQuantity = safeParseFloat(
          lot.unpacked_quantity || lot.unpackedWeight || 0
        );

        for (let i = 0; i < zero025Count; i++) {
          expandedTargets.push({
            gradePayload: g,
            lotPayload: lot,
            sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
            weight: 0.25,
            isUnpackedTrue: false,
            isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
          });
          totalRequested = totalRequested.plus(0.25);
        }
        for (let i = 0; i < zero050Count; i++) {
          expandedTargets.push({
            gradePayload: g,
            lotPayload: lot,
            sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
            weight: 0.5,
            isUnpackedTrue: false,
            isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
          });
          totalRequested = totalRequested.plus(0.5);
        }
        for (let i = 0; i < oneCount; i++) {
          expandedTargets.push({
            gradePayload: g,
            lotPayload: lot,
            sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
            weight: 1.0,
            isUnpackedTrue: false,
            isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
          });
          totalRequested = totalRequested.plus(1.0);
        }
        if (unpackedQuantity > 0) {
          expandedTargets.push({
            gradePayload: g,
            lotPayload: lot,
            sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
            weight: unpackedQuantity,
            isUnpackedTrue: true,
            isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
          });
          totalRequested = totalRequested.plus(unpackedQuantity);
        }

        // fallback if counts are zero but lotTotal provided
        if (
          lotTotal.gt(0) &&
          zero025Count +
          zero050Count +
          oneCount +
          (unpackedQuantity > 0 ? 1 : 0) ===
          0
        ) {
          expandedTargets.push({
            gradePayload: g,
            lotPayload: lot,
            sieveSizeId: lot.sieve_size || lot.sieveSizeId || null,
            weight: lotTotal.toNumber(),
            isUnpackedTrue: true,
            isOnBookDesired: lot.isOnBook ? lot.isOnBook === 'on_book' : true,
          });
          totalRequested = totalRequested.plus(lotTotal);
        }
      }
    }

    // 4) validate availability
    if (new Decimal(totalRequested).gt(totalAvailable)) {
      await t.rollback();
      return errorResponse(
        res,
        `Requested ${totalRequested.toString()} ct exceeds available ${totalAvailable.toString()} ct`
      );
    }

    // 5) Build FIFO queues for on-book and off-book (each entry has {sourceId, available: Decimal})
    const onQueue = [];
    const offQueue = [];
    for (const s of sources) {
      const info = sourceMap[s.id];
      if (!info) continue;
      if (info.availOn && info.availOn.gt(0))
        onQueue.push({ sourceId: s.id, available: new Decimal(info.availOn) });
      if (info.availOff && info.availOff.gt(0))
        offQueue.push({
          sourceId: s.id,
          available: new Decimal(info.availOff),
        });
    }

    // 6) consumer which takes from onQueue first then offQueue (FIFO) and records per-source contributions
    const consumeFromQueues = (needed, preferOn = true) => {
      let remain = new Decimal(needed);
      const contributions = []; // { sourceId, fromOn, fromOff, used }
      const consumeOneQueue = (queue, isOn) => {
        while (remain.gt(new Decimal('1e-9')) && queue.length > 0) {
          const head = queue[0];
          let headAvail = new Decimal(head.available);
          if (headAvail.lte(new Decimal('1e-12'))) {
            queue.shift();
            continue;
          }
          const take = Decimal.min(headAvail, remain);
          contributions.push({
            sourceId: head.sourceId,
            fromOn: isOn ? take.toNumber() : 0,
            fromOff: isOn ? 0 : take.toNumber(),
            used: take.toNumber(),
          });
          // decrement head.available in place
          head.available = headAvail.minus(take).toNumber();
          const sm = sourceMap[head.sourceId];
          if (isOn) {
            sm.availOn = sm.availOn.minus(take);
          } else {
            sm.availOff = sm.availOff.minus(take);
          }
          sm.remaining = sm.remaining.minus(take);
          remain = remain.minus(take);
          if (new Decimal(head.available).lte(new Decimal('1e-12')))
            queue.shift();
        }
      };

      if (preferOn) {
        consumeOneQueue(onQueue, true);
        if (remain.gt(new Decimal('1e-9'))) consumeOneQueue(offQueue, false);
      } else {
        consumeOneQueue(offQueue, false);
        if (remain.gt(new Decimal('1e-9'))) consumeOneQueue(onQueue, true);
      }

      if (remain.gt(new Decimal('1e-6'))) {
        throw new Error(
          'Insufficient resources while consuming queues (should not happen after validation)'
        );
      }
      return contributions;
    };

    // 7) iterate expandedTargets and create lots + packets
    const createdPackets = [];
    const createdLotIds = [];

    for (const reqItem of expandedTargets) {
      const { gradePayload, lotPayload, sieveSizeId, weight, isUnpackedTrue } =
        reqItem;

      // Resolve shape/color/clarity -> allow numeric id or string name
      // shape/color/clarity keys in gradePayload might be either { shapeId,colorId,clarityId } or { shape,color,clarity } strings
      const shapeRef =
        gradePayload.shapeId || gradePayload.shape || gradePayload.shape_id;
      const colorRef =
        gradePayload.colorId || gradePayload.color || gradePayload.color_id;
      const clarityRef =
        gradePayload.clarityId ||
        gradePayload.clarity ||
        gradePayload.clarity_id;

      const shapeId = await resolveRefId(Shape, shapeRef, t);
      const colorId = await resolveRefId(Color, colorRef, t);
      const clarityId = await resolveRefId(Clarity, clarityRef, t);

      if (!shapeId || !colorId || !clarityId) {
        await t.rollback();
        return errorResponse(
          res,
          `Invalid grade references. Ensure shape/color/clarity exist and are provided as IDs or valid names.`
        );
      }

      // findOrCreate DiamondGrade using resolved ids
      const [grade] = await DiamondGrade.findOrCreate({
        where: { shape: shapeId, color: colorId, clarity: clarityId },
        defaults: { code: gradePayload.code || null },
        transaction: t,
      });

      // findOrCreate target lot — these are unpack-created lots, hence purchase=null
      const lotWhere = {
        // purchase: null,
        grade: grade.id,
        sieveSize: sieveSizeId || null,
      };
      const [lot] = await DiamondLot.findOrCreate({
        where: lotWhere,
        defaults: {
          totalWeight: 0,
          zeroPointTwentyFivePacketCount: 0,
          zeroPointFiftyPacketCount: 0,
          oneCaratPacketCount: 0,
          unpackedWeight: 0,
        },
        transaction: t,
      });

      if (!createdLotIds.includes(lot.id)) createdLotIds.push(lot.id);

      // consume contributions for this packet weight (prefer on-book so onBook gets used first)
      const contributions = consumeFromQueues(weight, true);

      // aggregate per-source contributions
      let onSum = new Decimal(0);
      let offSum = new Decimal(0);
      const perSource = {}; // sourceId => { on: Decimal, off: Decimal }
      for (const c of contributions) {
        const sid = c.sourceId;
        if (!perSource[sid])
          perSource[sid] = { on: new Decimal(0), off: new Decimal(0) };
        perSource[sid].on = perSource[sid].on.plus(new Decimal(c.fromOn || 0));
        perSource[sid].off = perSource[sid].off.plus(
          new Decimal(c.fromOff || 0)
        );
        onSum = onSum.plus(new Decimal(c.fromOn || 0));
        offSum = offSum.plus(new Decimal(c.fromOff || 0));
      }

      // new packet object — set packet-level location = commonLocationId
      const pktObj = {
        lot: lot.id,
        purchase: null,
        grade: grade.id,
        qrCode: generateTempQR(),
        weight: new Decimal(weight).toNumber(),
        onBookWeight: onSum.toNumber(),
        offBookWeight: offSum.toNumber(),
        isOnBookFlag:
          onSum.gt(0) && offSum.gt(0)
            ? 'mix'
            : onSum.gt(0)
              ? 'on_book'
              : 'off_book',
        isUnpacked: !!isUnpackedTrue,
        remainingWeight: new Decimal(weight).toNumber(),
        location: commonLocationId,
        meta: null,
      };

      const newPacket = await DiamondPacket.create(pktObj, { transaction: t });

      // finalize qr
      const finalQr = `PKT-${newPacket.id}`;
      await newPacket.update({ qrCode: finalQr }, { transaction: t });

      // create PacketSource rows
      for (const sidStr of Object.keys(perSource)) {
        const sid = parseInt(sidStr, 10);
        const vals = perSource[sid];
        if (vals.on.plus(vals.off).gt(0)) {
          await PacketSource.create(
            {
              newPacket: newPacket.id,
              sourcePacket: sid,
              sourceLot: sourceMap[sid] ? sourceMap[sid].packet.lot : null,
              contributedOnBookWeight: vals.on.toNumber(),
              contributedOffBookWeight: vals.off.toNumber(),
              note: `Unpack created packet ${newPacket.id}`,
            },
            { transaction: t }
          );
        }
      }

      // update target lot aggregates
      const incObj = { totalWeight: weight };
      if (Math.abs(weight - 0.25) < 0.00001)
        incObj.zeroPointTwentyFivePacketCount = 1;
      else if (Math.abs(weight - 0.5) < 0.00001)
        incObj.zeroPointFiftyPacketCount = 1;
      else if (Math.abs(weight - 1.0) < 0.00001) incObj.oneCaratPacketCount = 1;
      else incObj.unpackedWeight = (incObj.unpackedWeight || 0) + weight;

      await lot.increment(incObj, { transaction: t });

      // inventory movement for created packet
      await InventoryMovement.create(
        {
          type: 'unpack',
          packet: newPacket.id,
          lot: lot.id,
          weightDelta: weight,
          onBookDelta: onSum.toNumber(),
          offBookDelta: offSum.toNumber(),
          user: payload.createdBy || null,
          note: `Unpack created packet ${newPacket.id}`,
        },
        { transaction: t }
      );

      createdPackets.push({
        id: newPacket.id,
        qrCode: finalQr,
        weight: newPacket.weight,
        onBookWeight: newPacket.onBookWeight,
        offBookWeight: newPacket.offBookWeight,
        isOnBookFlag: newPacket.isOnBookFlag,
      });
    } // end expandedTargets loop

    // 8) Update source packets remainingWeight & create InventoryMovement consumption rows
    const createdPacketIds = createdPackets.map((p) => p.id);
    const psRows = await PacketSource.findAll({
      where: { newPacket: { [Op.in]: createdPacketIds } },
      transaction: t,
    });

    // aggregate per source
    const consumedPerSource = {};
    for (const ps of psRows) {
      const sid = ps.sourcePacket;
      consumedPerSource[sid] = consumedPerSource[sid] || {
        on: new Decimal(0),
        off: new Decimal(0),
        total: new Decimal(0),
      };
      consumedPerSource[sid].on = consumedPerSource[sid].on.plus(
        new Decimal(ps.contributedOnBookWeight || 0)
      );
      consumedPerSource[sid].off = consumedPerSource[sid].off.plus(
        new Decimal(ps.contributedOffBookWeight || 0)
      );
      consumedPerSource[sid].total = consumedPerSource[sid].total
        .plus(new Decimal(ps.contributedOnBookWeight || 0))
        .plus(new Decimal(ps.contributedOffBookWeight || 0));
    }

    const EPS = new Decimal('1e-9');

    for (const s of sources) {
      const sid = s.id;
      const consumed =
        consumedPerSource[sid] && consumedPerSource[sid].total
          ? consumedPerSource[sid].total
          : new Decimal(0);
      if (consumed.gt(0)) {
        const originalRem = new Decimal(s.remainingWeight || 0);
        const newRem = Decimal.max(new Decimal(0), originalRem.minus(consumed));
        await DiamondPacket.update(
          {
            remainingWeight: newRem.toNumber(),
            isUnpacked: newRem.lte(EPS),
          },
          { where: { id: sid }, transaction: t }
        );

        const onConsumed =
          consumedPerSource[sid] && consumedPerSource[sid].on
            ? consumedPerSource[sid].on
            : new Decimal(0);
        const offConsumed =
          consumedPerSource[sid] && consumedPerSource[sid].off
            ? consumedPerSource[sid].off
            : new Decimal(0);

        await InventoryMovement.create(
          {
            type: 'unpack',
            packet: sid,
            lot: s.lot || null,
            purchase: s.purchase,
            weightDelta: -consumed.toNumber(),
            onBookDelta: -onConsumed.toNumber(),
            offBookDelta: -offConsumed.toNumber(),
            user: payload.createdBy || null,
            note: `Consumed for unpack`,
          },
          { transaction: t }
        );

        // update source lot aggregates if source had a lot
        const lotId = s.lot;
        if (lotId) {
          let lotInstance = lotById[lotId];
          if (!lotInstance) {
            lotInstance = await DiamondLot.findByPk(lotId, {
              transaction: t,
              lock: t.LOCK.UPDATE,
            });
            lotById[lotId] = lotInstance;
          }
          if (lotInstance) {
            // always decrement totalWeight by consumed
            await lotInstance.decrement(
              { totalWeight: consumed.toNumber() },
              { transaction: t }
            );

            const packetWeight = new Decimal(s.weight || 0);
            const fullyConsumed = newRem.lte(EPS);

            const isStandardWeight =
              packetWeight
                .sub(new Decimal(0.25))
                .abs()
                .lte(new Decimal('1e-9')) ||
              packetWeight
                .sub(new Decimal(0.5))
                .abs()
                .lte(new Decimal('1e-9')) ||
              packetWeight.sub(new Decimal(1.0)).abs().lte(new Decimal('1e-9'));

            if (fullyConsumed) {
              // fully consumed => decrement count
              if (
                packetWeight
                  .sub(new Decimal(0.25))
                  .abs()
                  .lte(new Decimal('1e-9'))
              ) {
                await lotInstance.decrement(
                  { zeroPointTwentyFivePacketCount: 1 },
                  { transaction: t }
                );
              } else if (
                packetWeight
                  .sub(new Decimal(0.5))
                  .abs()
                  .lte(new Decimal('1e-9'))
              ) {
                await lotInstance.decrement(
                  { zeroPointFiftyPacketCount: 1 },
                  { transaction: t }
                );
              } else if (
                packetWeight
                  .sub(new Decimal(1.0))
                  .abs()
                  .lte(new Decimal('1e-9'))
              ) {
                await lotInstance.decrement(
                  { oneCaratPacketCount: 1 },
                  { transaction: t }
                );
              } else {
                // unpacked packet (non-standard weight)
                await lotInstance.decrement(
                  { unpackedWeight: consumed.toNumber() },
                  { transaction: t }
                );
              }
            } else {
              // partially consumed: if packet is unpacked (non-standard) decrement unpackedWeight by consumed
              if (!isStandardWeight) {
                await lotInstance.decrement(
                  { unpackedWeight: consumed.toNumber() },
                  { transaction: t }
                );
              }
              // for standard packets partial consumption, we keep count until fully consumed
            }
          }
        }
      }
    }

    await t.commit();

    // fetch created lots for response (similar to addDiamond)
    const lotsWithDetails = await DiamondLot.findAll({
      where: { id: { [Op.in]: createdLotIds } },
      attributes: { exclude: ['purchase', 'grade', 'sieveSize'] },
      include: [
        {
          model: DiamondGrade,
          as: 'gradeDetail',
          attributes: { include: ['id', 'code'] },
          include: [
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
          ],
        },
      ],
      order: [['id', 'ASC']],
    });

    const processedLots = (lotsWithDetails || []).map((lot) => {
      const plainLot = lot.get({ plain: true });
      const { purchase, grade, sieveSize, ...cleanLot } = plainLot;
      return { ...cleanLot };
    });

    const response = { packets: createdPackets, lots: processedLots };
    return successResponse(res, 5001, response);
  } catch (err) {
    await t.rollback();
    console.error('unpackDiamondsLot err', err);
    return errorResponse(res, err.message || err);
  }
};

export const allocDeallocPacketsExcel = async (req, res) => {
  const t = await db.sequelize.transaction();
  try { 
      const errors = [];
      
      if(req.files && req.files.length > 0) {
        let file = req.files[0];
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {         

          const data = await GetExcelData(file);

          if(data?.length > 0) {

              for(const item of data) {
               
                 // allocatePacketsForStore start
                 //check size exist or not via meta                  
                  const lotId = Number(item.lot_id);
                  const shape = await Shape.findOne({where: { shape: item.shape }});
                  const color = await Color.findOne({where: { color: item.color }});
                  const clarity = await Clarity.findOne({where: { clarity: item.clarity }});
                  const grade = await DiamondGrade.findOne({where: { shape: shape?.id, color: color?.id, clarity: clarity?.id }});
                 
                  //Check Grade Exists or Not
                  if(!grade){
                    errors.push({ lot_id: lotId, error: 'Invalid grade'});
                    continue;
                  }
                  //check lotid exist or not
                  const lotData = await DiamondLot.findOne({
                                    where: { id: lotId, grade: grade?.id },
                                    transaction: t
                                });

                  if(!lotData){
                    errors.push({ lot_id: lotId, error: 'Invalid lot id'});
                    continue;
                  }                  
                  
                  if(item?.max_alloc_0_25 != 0 && item?.alloc_0_25 != 0 && item?.alloc_0_25 > item?.max_alloc_0_25){
                    errors.push({ lot_id: lotId, error: 'Max allocation limit reached for 0.25 carat packets.'});
                    continue;
                  }else if(item?.['T0.25'] == 0 && item?.max_alloc_0_25 == 0 && item?.alloc_0_25 > 0){
                    errors.push({ lot_id: lotId, error: 'Max allocation limit reached for 0.25 carat packets.'});
                    continue;
                  }else{
                    if(errors.length == 0 && item?.alloc_0_25 > 0){
                      await allocDeallocData(req, t, lotId, 0.25, 'allocate', item?.alloc_0_25);                      
                    }
                  }            

                  if(item?.max_alloc_0_50 != 0 && item?.alloc_0_50 != 0 && item?.alloc_0_50 > item?.max_alloc_0_50){
                    errors.push({ lot_id: lotId, error: 'Max allocation limit reached for 0.50 carat packets.'});
                    continue;
                  }else if(item?.['T0.50'] == 0 && item?.max_alloc_0_50 == 0 && item?.alloc_0_50 > 0){
                     errors.push({ lot_id: lotId, error: 'Max allocation limit reached for 0.50 carat packets.'});
                    continue;
                  }else{
                    if(errors.length == 0 && item?.alloc_0_50 > 0){
                      await allocDeallocData(req, t, lotId, 0.50, 'allocate', item?.alloc_0_50); 
                    }
                  }

                  if(item?.max_alloc_1_00 != 0 && item?.alloc_1 != 0 && item?.alloc_1 > item?.max_alloc_1_00){
                     errors.push({ lot_id: lotId, error: 'Max allocation limit reached for 1.00 carat packets.'});
                    continue;
                  }else if(item?.['T1.00'] == 0 && item?.max_alloc_1_00 == 0 && item?.alloc_1 > 0){
                     errors.push({ lot_id: lotId, error: 'Max allocation limit reached for 1.00 carat packets.'});
                    continue;
                  }else{
                    if(errors.length == 0 && item?.alloc_1 > 0){
                      await allocDeallocData(req, t, lotId, 1.0, 'allocate', item?.alloc_1); 
                    }
                  }    
                 // allocatePacketsForStore end

                 // deallocatePacketsFromStore start
                 if(item?.max_dealloc_0_25 != 0 && item?.dealloc_0_25 != 0 && item?.dealloc_0_25 > item?.max_dealloc_0_25){
                     errors.push({ lot_id: lotId, error: 'Max deallocation limit reached for 0.25 carat packets.'});
                    continue;
                  }else if(item?.['T0.25'] == 0 && item?.max_dealloc_0_25 == 0 && item?.dealloc_0_25 > 0){
                     errors.push({ lot_id: lotId, error: 'Max deallocation limit reached for 0.25 carat packets.'});
                    continue;
                  }else{
                    if(errors.length == 0 && item?.dealloc_0_25 > 0){
                      await allocDeallocData(req, t, lotId, 0.25, 'deallocate', item?.dealloc_0_25); 
                    } 
                  }

                  if(item?.max_dealloc_0_50 != 0 && item?.dealloc_0_50 != 0 && item?.dealloc_0_50 > item?.max_dealloc_0_50){
                     errors.push({ lot_id: lotId, error: 'Max deallocation limit reached for 0.50 carat packets.'});
                    continue;
                  }else if(item?.['T0.50'] == 0 && item?.max_dealloc_0_50 == 0 && item?.dealloc_0_50 > 0){
                     errors.push({ lot_id: lotId, error: 'Max deallocation limit reached for 0.50 carat packets.'});
                    continue;
                  }else{
                    if(errors.length == 0 && item?.dealloc_0_50 > 0){
                      await allocDeallocData(req, t, lotId, 0.50, 'deallocate', item?.dealloc_0_50); 
                    } 
                  }

                  if(item?.max_dealloc_1_00 != 0 && item?.dealloc_1 != 0 && item?.dealloc_1 > item?.max_dealloc_1_00){
                     errors.push({ lot_id: lotId, error: 'Max deallocation limit reached for 1.00 carat packets.'});
                    continue;
                  }else if(item?.['T1.00'] == 0 && item?.max_dealloc_1_00 == 0 && item?.dealloc_1 > 0){
                     errors.push({ lot_id: lotId, error: 'Max deallocation limit reached for 1.00 carat packets.'});
                    continue;
                  }else{
                    if(errors.length == 0 && item?.dealloc_1 > 0){
                      await allocDeallocData(req, t, lotId, 1.0, 'deallocate', item?.dealloc_1); 
                    } 
                  }
                 // deallocatePacketsFromStore end
              }; 

              if(errors.length > 0){
                await t.rollback();
                return errorResponse(res, 5001, errors);
              }else{
                 await t.commit();
                return successResponse(res, 5001);
              }            
          }
        }else{
          return errorResponse(res, "Unsupported file format. Please upload an Excel or CSV file.");
        }
      }else{
        return errorResponse(res, "No File Uploaded.");
      }
  } catch (err) {
       console.log('err :>> ', err);
      await t.rollback();
      return errorResponse(res, err.message || err);
  }
};

export default {
  addDiamond,
  getDiamonds,
  getDiamondsQRCodes,
  scanDiamondQRCode,
  deleteDiamond,
  getPurchaseHistory,
  allocatePacketsForStore,
  deallocatePacketsFromStore,
  getDiamondsGroupedByGrade,
  unpackDiamondsLot,
  allocDeallocPacketsExcel
};

/**
 * =========================================== Helpers ===========================================
 */

async function resolveRefId(model, value, transaction) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    return Number(value);
  }

  if (!model) return null;
  const column =
    model === Shape
      ? 'shape'
      : model === Color
        ? 'color'
        : model === Clarity
          ? 'clarity'
          : null;
  if (!column) return null;
  const row = await model.findOne({
    where: { [column]: String(value) },
    transaction,
  });
  if (!row) {
    return null;
  }
  return row.id;
}

const generateTempQR = () =>
  `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sum = (arr) => arr.reduce((s, v) => s + parseFloat(v || 0), 0);

const safeParseFloat = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const safeParseInt = (v) => {
  const n = parseInt(v);
  return Number.isFinite(n) ? n : 0;
};

const parseIdsFromPayload = (maybe) => {
  if (!maybe) return [];
  if (Array.isArray(maybe))
    return maybe.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
  try {
    const parsed = typeof maybe === 'string' ? JSON.parse(maybe) : maybe;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
  } catch (e) {
    return null;
  }
};



const allocDeallocData = async (req, t, lotId, size, flag, needed) => {
  const now = new Date();
  const availableBy = req.admin?.id || null;

  const priorityOrderLiteral = db.sequelize.literal(
        `CASE WHEN "isOnBookFlag"='on_book' THEN 1 WHEN "isOnBookFlag"='off_book' THEN 2 ELSE 3 END`
      );
  const where = {
                    lot: lotId,
                    weight: size,
                    isUnpacked: false,
                    isAvailableForStore: (flag === 'allocate' ? false : true),
                    remainingWeight: { [Op.gt]: 0 },
                };

  const packets = await DiamondPacket.findAll({
                      where,
                      limit: needed,
                      order: [priorityOrderLiteral, ['createdAt', 'ASC']],
                      transaction: t,
                      lock: t.LOCK.UPDATE,
                  }); 

  const packetIds = packets.map((p) => p.id);  
  let updData = { isAvailableForStore: false, availableSince: null, availableBy: null };  // for deallocate
  if(flag === 'allocate'){
    updData = { isAvailableForStore: true, availableSince: now, availableBy };    // for allocate
  } 

  console.log('packetId :>> ', packetIds);
  await DiamondPacket.update(
     updData,
    { where: { id: { [Op.in]: packetIds } }, transaction: t }
  );

  const movements = packetIds.map((pid) => ({
                      type: 'adjustment',
                      packet: pid,
                      lot: lotId || null,
                      purchase: null,
                      weightDelta: 0,
                      onBookDelta: 0,
                      offBookDelta: 0,
                      user: availableBy,
                      note: `Marked ${flag == "allocate" ? "available" : "unavailable"} for store by ${availableBy || 'system'} (lot:${lotId} size: ${size})`,
                      createdAt: now,
                      updatedAt: now,
                  }));

    if (movements.length)
    await InventoryMovement.bulkCreate(movements, { transaction: t });
}

