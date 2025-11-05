import Decimal from 'decimal.js';
import db from '../../config/db.config.js';
import { Op, Sequelize, literal, col, fn } from 'sequelize';
import { uploadFile } from '../../helpers/image.js';
import { pagination } from '../../helpers/pagination.js';
import { errorResponse, successResponse } from '../../helpers/response.js';

const {
  DiamondGrade,
  DiamondLot,
  CustomerWishList,
  CustomerCartItem,
  DiamondPacket,
  DiamondPayment,
  DiamondPurchase,
  InventoryMovement,
  PacketSource,
  PricePerCarat,
  PricePerCaratRegion,
  Shape,
  Color,
  Clarity,
  Country,
  Location,
  SieveSize,
  Supplier,
  sequelize,
  RegionCountry
} = db;

const getStoreAvailablePackets = async (req, res) => {

  const ipAddress = req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress;
  const ipAddData = await fetch(`http://ip-api.com/json/${ipAddress}`).then((res) => res.json());
  // const ipAddData = await fetch(`http://ip-api.com/json/24.48.0.1`).then((res) => res.json());
  
  const region = ipAddData?.country || '';

  try {
    const {
      shapeId,
      colorId,
      clarityId,
      sieveSizeId,
      shape,
      color,
      clarity,
      sieve,
      page = 1,
      limit = 100,
      search,
      sortBy = 'id',
      sortOrder = 'ASC',
    } = req.query;

    let CountryData = await Country.findOne({
                          attributes : ['id'],
                          where: {
                            name: { [Op.iLike]: region }
                          },
                          include: [
                          {
                            model: db.RegionCountry,
                            as: "regionCountryDetail", // must match your alias
                            attributes: ["id"],
                            include: [
                              {
                                model: db.Region,
                                as: "regionDetail", // must match your alias
                                attributes: ["id", "name"]
                              }
                            ]
                          },
                          {
                            model: db.Location,
                            as: "LocationDetail", // must match your alias
                            attributes: ["id"]                            
                          }
                        ]
                });
      
      CountryData = CountryData?.get({ plain: true });
      const regionId = CountryData?.regionCountryDetail?.regionDetail?.id || '';
      const locationId = region ? (CountryData?.LocationDetail?.id ? CountryData.LocationDetail.id : -1) : '';

    const parseIds = (val) => {
      if (val === undefined || val === null) return null;
      const arr = Array.isArray(val) ? val : String(val).split(',');
      const nums = arr
        .map((v) => String(v).trim())
        .filter((v) => v !== '')
        .map((v) => Number(v))
        .filter((n) => !Number.isNaN(n));
      return nums.length > 0 ? nums : null;
    };

    const shapeIds = parseIds(shapeId);
    const colorIds = parseIds(colorId);
    const clarityIds = parseIds(clarityId);
    const sieveSizeIds = parseIds(sieveSizeId);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * pageLimit;
    const direction =
      String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const packetWhere = {
      isAvailableForStore: true,
      isUnpacked: false,
      remainingWeight: { [Op.gt]: 0 },
      current_status: {
        [Op.or]: [
          { [Op.eq]: 'available' },
          { [Op.eq]: null },
        ]
      }
    };

    if (locationId) packetWhere.location = Number(locationId);

    if (search && String(search).trim()) {
      const s = String(search).trim();
      const numeric = Number(s);
      if (!Number.isNaN(numeric)) {
        packetWhere.id = numeric;
      } else {
        packetWhere.qrCode = { [Op.iLike]: `%${s}%` };
      }
    }

    const lotWhere = {};
    if (sieveSizeIds) {
      lotWhere.sieveSize = { [Op.in]: sieveSizeIds };
    }

    const gradeInclude = {
      model: DiamondGrade,
      as: 'gradeDetail',
      attributes: ['id', 'code', 'shape', 'color', 'clarity'],
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
      required: false,
    };

    const gradeWhere = {};
    if (shapeIds) gradeWhere.shape = { [Op.in]: shapeIds };
    if (colorIds) gradeWhere.color = { [Op.in]: colorIds };
    if (clarityIds) gradeWhere.clarity = { [Op.in]: clarityIds };
    if (Object.keys(gradeWhere).length > 0) {
      gradeInclude.where = gradeWhere;
      gradeInclude.required = true;
    }

    if (shape && !shapeIds) {
      gradeInclude.include[0].where = { shape: { [Op.iLike]: `%${shape}%` } };
      gradeInclude.include[0].required = true;
      gradeInclude.required = true;
    }
    if (color && !colorIds) {
      gradeInclude.include[1].where = { color: { [Op.iLike]: `%${color}%` } };
      gradeInclude.include[1].required = true;
      gradeInclude.required = true;
    }
    if (clarity && !clarityIds) {
      gradeInclude.include[2].where = {
        clarity: { [Op.iLike]: `%${clarity}%` },
      };
      gradeInclude.include[2].required = true;
      gradeInclude.required = true;
    }

    const sieveInclude = {
      model: SieveSize,
      as: 'sieveSizeDetail',
      attributes: ['id', 'size', 'shape_id'],
      include: [
        {
          model: Shape,
          as: 'shapeDetail',
          attributes: ['id', 'shape'],
          required: false,
        },
      ],
      required: false,
    };

    if (sieve && !sieveSizeIds) {
      sieveInclude.where = { size: { [Op.iLike]: `%${sieve}%` } };
      sieveInclude.required = true;
    }

    const locationInclude = {
      model: Location,
      as: 'locationDetail',
      attributes: [],
      required: false,
    };

    const packetsInclude = {
      model: DiamondPacket,
      as: 'packets',
      attributes: [],
      where: packetWhere,
      required: true,
      include: [locationInclude],
    };   

    const sortMap = {
      id: ['id'],
      totalWeight: ['totalWeight'],
      createdAt: ['createdAt'],
      packetCount: [literal('packetCount')],
      sieveSize: [col('sieveSizeDetail.size')],
      shape: [col('gradeDetail.shape')],
      color: [col('gradeDetail.color')],
      clarity: [col('gradeDetail.clarity')],
    };

    let order;
    const sortKey = sortMap[sortBy] || sortMap.id;
    if (Array.isArray(sortKey) && sortKey[0] instanceof Sequelize) {
      order = [[sortKey[0], direction]];
    } else {
      order = [
        Array.isArray(sortKey) ? [...sortKey, direction] : [sortKey, direction],
      ];
    }

    const total = await DiamondLot.count({
      where: lotWhere,
      include: [
        {
          model: DiamondPacket,
          as: 'packets',
          where: packetWhere,
          required: true,
        },
        gradeInclude,
        sieveInclude,
      ],
      distinct: true,
      col: 'id',
    });

    const rows = await DiamondLot.findAll({
      where: lotWhere,
      attributes: [
        'id',
        'totalWeight',
        'zeroPointTwentyFivePacketCount',
        'zeroPointFiftyPacketCount',
        'oneCaratPacketCount',
        'unpackedWeight',
        'meta',
        'deletedAt',
        'createdAt',
        'updatedAt',
        [fn('COUNT', col('packets.id')), 'packetCount'],
      ],
      include: [packetsInclude, gradeInclude, sieveInclude],
      group: [
        'DiamondLot.id',
        'gradeDetail.id',
        'gradeDetail->shapeDetail.id',
        'gradeDetail->colorDetail.id',
        'gradeDetail->clarityDetail.id',
        'sieveSizeDetail.id',
        'sieveSizeDetail->shapeDetail.id',
      ],
      order,
      limit: pageLimit,
      offset,
      subQuery: false
    });

    const processed = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        packetCount: Number(plain.packetCount || 0),
      };
    });

    const customerId =
      req.customer && req.customer.id ? Number(req.customer.id) : null;

    let processedWithExtras = processed;

    if (customerId && processed.length > 0) {
      const lotIds = processed.map((p) => p.id);

      // fetch wishlist and cart rows in parallel
      const [wishRows, cartRows] = await Promise.all([
        CustomerWishList.findAll({
          where: {
            customer: customerId,
            lot: { [Op.in]: lotIds },
          },
          attributes: ['lot'],
        }),
        CustomerCartItem.findAll({
          where: {
            customer: customerId,
            lot: { [Op.in]: lotIds },
          },
          attributes: [
            'id',
            'lot',
            'zeroPointTwentyFivePacketCount',
            'zeroPointFiftyPacketCount',
            'oneCaratPacketCount',
          ],
        }),
      ]);

      const wishSet = new Set(wishRows.map((w) => Number(w.lot)));
      const cartMap = new Map();
      for (const c of cartRows) {
        const plain = c.get ? c.get({ plain: true }) : c;
        cartMap.set(Number(plain.lot), {
          id: plain.id,
          zeroPointTwentyFivePacketCount:
            Number(plain.zeroPointTwentyFivePacketCount) || 0,
          zeroPointFiftyPacketCount:
            Number(plain.zeroPointFiftyPacketCount) || 0,
          oneCaratPacketCount: Number(plain.oneCaratPacketCount) || 0,
        });
      }

      processedWithExtras = await Promise.all(processed.map(async (p) => {
        const lotNum = Number(p.id);
        const cart = cartMap.get(lotNum) || null;
        const pricePerCT = await PricePerCaratRegion.findOne({
          attributes : ['price'],
          where: { region: Number(regionId), shape: Number(p.gradeDetail.shape), color: Number(p.gradeDetail.color), clarity: Number(p.gradeDetail.clarity), sieveSize: Number(p.sieveSizeDetail.id) },
        });
        return {
          ...p,
          pricePerCT: pricePerCT ? pricePerCT.price : null,
          isWishlist: wishSet.has(lotNum),
          isCart: !!cart,
          cart,
        };
      }));
    } else {

      processedWithExtras = await Promise.all(processed.map(async (p) => {
        const pricePerCT = await PricePerCaratRegion.findOne({
          attributes : ['price'],
          where: { region: Number(regionId), shape: Number(p.gradeDetail.shape), color: Number(p.gradeDetail.color), clarity: Number(p.gradeDetail.clarity), sieveSize: Number(p.sieveSizeDetail.id) },
        });
      
        return {
          ...p,
          pricePerCT: pricePerCT ? pricePerCT.price : null,
          isWishlist: false,
          isCart: false,
          cart: null,
        }
      }));
    }

    const paginationData = await pagination(total, pageNum, pageLimit);

    return successResponse(res, 5026, {
      paginationData,
      diamonds: processedWithExtras,
    });
  } catch (err) {
    console.error('getAvailablePackets error:', err);
    return errorResponse(res, err.message || err);
  }
};

const getStoreAvailablePacketById = async (req, res) => {
  try {
    const { id } = req.params;
    // const { region } = req.query;

    const ipAddress = req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress;
    const ipAddData = await fetch(`http://ip-api.com/json/${ipAddress}`).then((res) => res.json());    
    const region = ipAddData?.country || '';

    let CountryData = await Country.findOne({
                          attributes : ['id'],
                          where: {
                            name: { [Op.iLike]: region }
                          },
                          include: [
                          {
                            model: db.RegionCountry,
                            as: "regionCountryDetail", // must match your alias
                            attributes: ["id"],
                            include: [
                              {
                                model: db.Region,
                                as: "regionDetail", // must match your alias
                                attributes: ["id", "name"]
                              }
                            ]
                          },
                          {
                            model: db.Location,
                            as: "LocationDetail", // must match your alias
                            attributes: ["id"]                            
                          }
                        ]
                });
      
      CountryData = CountryData?.get({ plain: true });
      const regionId = CountryData?.regionCountryDetail?.regionDetail?.id || '';
      const locationId = region ? (CountryData?.LocationDetail?.id ? CountryData.LocationDetail.id : -1) : '';

    const lotId = Number(id);
    if (Number.isNaN(lotId) || lotId <= 0) {
      return errorResponse(res, 'Invalid id parameter.');
    }

    const packetWhere = {
      isAvailableForStore: true,
      isUnpacked: false,
      remainingWeight: { [Op.gt]: 0 },
      current_status: {
        [Op.or]: [
          { [Op.eq]: 'available' },
          { [Op.eq]: null },
        ]
      }
    };

    if (locationId) packetWhere.location = Number(locationId);

    const gradeInclude = {
      model: DiamondGrade,
      as: 'gradeDetail',
      attributes: ['id', 'code', 'shape', 'color', 'clarity'],
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
      required: false,
    };

    const sieveInclude = {
      model: SieveSize,
      as: 'sieveSizeDetail',
      attributes: ['id', 'size', 'shape_id'],
      include: [
        {
          model: Shape,
          as: 'shapeDetail',
          attributes: ['id', 'shape'],
          required: false,
        },
      ],
      required: false,
    };

    const locationInclude = {
      model: Location,
      as: 'locationDetail',
      attributes: [],
      required: false,
    };

    const packetsInclude = {
      model: DiamondPacket,
      as: 'packets',
      attributes: [],
      where: packetWhere,
      required: true,
      include: [locationInclude],
    };

    const rows = await DiamondLot.findAll({
      where: { id: lotId },
      attributes: [
        'id',
        'totalWeight',
        'zeroPointTwentyFivePacketCount',
        'zeroPointFiftyPacketCount',
        'oneCaratPacketCount',
        'unpackedWeight',
        'meta',
        'deletedAt',
        'createdAt',
        'updatedAt',
        [fn('COUNT', col('packets.id')), 'packetCount'],
      ],
      include: [packetsInclude, gradeInclude, sieveInclude],
      group: [
        'DiamondLot.id',
        'gradeDetail.id',
        'gradeDetail->shapeDetail.id',
        'gradeDetail->colorDetail.id',
        'gradeDetail->clarityDetail.id',
        'sieveSizeDetail.id',
        'sieveSizeDetail->shapeDetail.id',
      ],
      limit: 1,
      subQuery: false,
    });

    if (!rows || rows.length === 0) {
      return errorResponse(res, 5035);
    }

    const plain = rows[0].get({ plain: true });

    let isWishlist = false;
    let isCart = false;
    let cart = null;
    if (req.customer && req.customer.id) {
      const customerId = Number(req.customer.id);

      const [wishlistCount, cartRow] = await Promise.all([
        CustomerWishList.count({
          where: { customer: customerId, lot: lotId },
        }),
        CustomerCartItem.findOne({
          where: { customer: customerId, lot: lotId },
          attributes: [
            'id',
            'zeroPointTwentyFivePacketCount',
            'zeroPointFiftyPacketCount',
            'oneCaratPacketCount',
          ],
        }),
      ]);

      isWishlist = wishlistCount > 0;

      if (cartRow) {
        const cplain = cartRow.get ? cartRow.get({ plain: true }) : cartRow;
        isCart = true;
        cart = {
          id: cplain.id,
          zeroPointTwentyFivePacketCount:
            Number(cplain.zeroPointTwentyFivePacketCount) || 0,
          zeroPointFiftyPacketCount:
            Number(cplain.zeroPointFiftyPacketCount) || 0,
          oneCaratPacketCount: Number(cplain.oneCaratPacketCount) || 0,
        };
      }
    }

    const pricePerCT = await PricePerCaratRegion.findOne({
                        attributes : ['price'],
                        where: { region: Number(regionId), shape: Number(plain.gradeDetail.shape), color: Number(plain.gradeDetail.color), clarity: Number(plain.gradeDetail.clarity), sieveSize: Number(plain.sieveSizeDetail.id) },
                      });

    const processed = {
      ...plain,
      pricePerCT: pricePerCT ? pricePerCT.price : null,
      isWishlist,
      isCart,
      cart,
      packetCount: Number(plain.packetCount || 0),
    };

    return successResponse(res, 5034, { diamond: processed });
  } catch (err) {
    console.error('getStoreAvailablePacketById error:', err);
    return errorResponse(res, err.message || err);
  }
};

const toggleCustomerWishlist = async (req, res) => {
  const t = await CustomerWishList.sequelize.transaction();
  try {
    const customer = req.customer;
    if (!customer || !customer.id) {
      await t.rollback();
      return errorResponse(res, 9001, '', 401);
    }
    const { lotId } = req.body || {};
    const lid = Number(lotId);
    if (!lid || Number.isNaN(lid) || lid <= 0) {
      await t.rollback();
      return errorResponse(res, 5035, 404);
    }

    const lot = await DiamondLot.findOne({
      where: { id: lid },
      transaction: t,
    });
    if (!lot) {
      await t.rollback();
      return errorResponse(res, 5035, 404);
    }

    const existing = await CustomerWishList.findOne({
      where: { customer: customer.id, lot: lid },
      paranoid: false,
      transaction: t,
    });

    if (existing) {
      await CustomerWishList.destroy({
        where: { id: existing.id },
        force: true,
        transaction: t,
      });

      await t.commit();
      return successResponse(res, 5035, { message: 'Removed from wishlist' });
    }
    try {
      const [row, created] = await CustomerWishList.findOrCreate({
        where: { customer: customer.id, lot: lid },
        transaction: t,
      });

      await t.commit();
      return successResponse(res, 5035, {
        message: created ? 'Added to wishlist' : 'Added to wishlist',
      });
    } catch (err) {
      if (
        err &&
        (err.name === 'SequelizeUniqueConstraintError' ||
          err.original?.code === '23505')
      ) {
        await t.commit();
        return successResponse(res, 5035, { message: 'Added to wishlist' });
      }
      await t.rollback();
      throw err;
    }
  } catch (err) {
    console.error('toggleCustomerWishlist error:', err);
    return errorResponse(res, err.message || err);
  }
};

const addOrUpdateCartItem = async (req, res) => {
  const t = await CustomerCartItem.sequelize.transaction();
  try {
    const customer = req.customer;
    if (!customer || !customer.id) {
      await t.rollback();
      return errorResponse(res, 9001, '', 401);
    }

    const cartItems = req.body.cartItems ? JSON.parse(req.body.cartItems) : null; 

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      await t.rollback();
      return errorResponse(res, "Cart items not found");
    }
    
    for (let i = 0; i < cartItems.length; i++) {
      const {
        lotId,
        zeroPointTwentyFivePacketCount = 0,
        zeroPointFiftyPacketCount = 0,
        oneCaratPacketCount = 0
      } = cartItems[i];

      const lid = Number(lotId);

      // Validate lot ID
      if (!lid || Number.isNaN(lid) || lid <= 0) {
        await t.rollback();
        return errorResponse(res, 5035);
      }

      // Validate packet counts
      if (
        Number.isNaN(zeroPointTwentyFivePacketCount) ||
        zeroPointTwentyFivePacketCount < 0 ||
        Number.isNaN(zeroPointFiftyPacketCount) ||
        zeroPointFiftyPacketCount < 0 ||
        Number.isNaN(oneCaratPacketCount) ||
        oneCaratPacketCount < 0
      ) {
        await t.rollback();
        return errorResponse(res, 5035);
      }

      // Check if at least one packet count is greater than 0
      const totalPackets =
        zeroPointTwentyFivePacketCount +
        zeroPointFiftyPacketCount +
        oneCaratPacketCount;

      if (totalPackets === 0) {
        await t.rollback();
        return errorResponse(res, 5035, 'At least one packet count must be greater than 0');
      }

      const lot = await DiamondLot.findOne({
                    where: { id: lid },
                    transaction: t,
                  });
      if (!lot) {
        await t.rollback();
        return errorResponse(res, 5035, 404);
      }

        // Check if item already exists in cart
      const existing = await CustomerCartItem.findOne({
                        where: { customer: customer.id, lot: lid },
                        transaction: t,
                      });
      if(existing){
        // Update existing cart item
        await existing.update(
          {
            zeroPointTwentyFivePacketCount,
            zeroPointFiftyPacketCount,
            oneCaratPacketCount,
          },
          { transaction: t }
        );
      }else{
        await CustomerCartItem.create(
          {
            customer: customer.id,
            lot: lid,
            zeroPointTwentyFivePacketCount,
            zeroPointFiftyPacketCount,
            oneCaratPacketCount,
          },
          { transaction: t }
        );
      }
    }  
    
    await t.commit();
    return successResponse(res, 5037);
  } catch (err) {
    try {
      await t.rollback();
    } catch (e) {}
    console.error('addOrUpdateCartItem error:', err);
    return errorResponse(res, err.message || err);
  }
};

const addOrUpdateCartItem_OLD = async (req, res) => {
  const t = await CustomerCartItem.sequelize.transaction();
  try {
    const customer = req.customer;
    if (!customer || !customer.id) {
      await t.rollback();
      return errorResponse(res, 9001, '', 401);
    }

    const {
      lotId,
      zeroPointTwentyFivePacketCount = 0,
      zeroPointFiftyPacketCount = 0,
      oneCaratPacketCount = 0,
    } = req.body || {};
    const lid = Number(lotId);

    // Validate lot ID
    if (!lid || Number.isNaN(lid) || lid <= 0) {
      await t.rollback();
      return errorResponse(res, 5035);
    }

    // Validate packet counts
    if (
      Number.isNaN(zeroPointTwentyFivePacketCount) ||
      zeroPointTwentyFivePacketCount < 0 ||
      Number.isNaN(zeroPointFiftyPacketCount) ||
      zeroPointFiftyPacketCount < 0 ||
      Number.isNaN(oneCaratPacketCount) ||
      oneCaratPacketCount < 0
    ) {
      await t.rollback();
      return errorResponse(res, 5035);
    }

    // Check if at least one packet count is greater than 0
    const totalPackets =
      zeroPointTwentyFivePacketCount +
      zeroPointFiftyPacketCount +
      oneCaratPacketCount;

    if (totalPackets === 0) {
      await t.rollback();
      return errorResponse(
        res,
        5035,
        'At least one packet count must be greater than 0'
      );
    }

    // Check if lot exists
    const lot = await DiamondLot.findOne({
      where: { id: lid },
      transaction: t,
    });
    if (!lot) {
      await t.rollback();
      return errorResponse(res, 5035, 404);
    }

    // Check if item already exists in cart
    const existing = await CustomerCartItem.findOne({
      where: { customer: customer.id, lot: lid },
      transaction: t,
    });

    if (existing) {
      // Update existing cart item
      await existing.update(
        {
          zeroPointTwentyFivePacketCount,
          zeroPointFiftyPacketCount,
          oneCaratPacketCount,
        },
        { transaction: t }
      );

      await t.commit();
      return successResponse(res, 5036, {
        message: 'Cart item updated',
        data: existing,
      });
    }

    // Create new cart item
    const newCartItem = await CustomerCartItem.create(
      {
        customer: customer.id,
        lot: lid,
        zeroPointTwentyFivePacketCount,
        zeroPointFiftyPacketCount,
        oneCaratPacketCount,
      },
      { transaction: t }
    );

    await t.commit();
    return successResponse(res, 5036, {
      message: 'Added to cart',
      data: newCartItem,
    });
  } catch (err) {
    try {
      await t.rollback();
    } catch (e) {}
    console.error('addOrUpdateCartItem error:', err);
    return errorResponse(res, err.message || err);
  }
};

const removeCartItem = async (req, res) => {
  const t = await CustomerCartItem.sequelize.transaction();
  try {
    const customer = req.customer;
    if (!customer || !customer.id) {
      await t.rollback();
      return errorResponse(res, 9001, '', 401);
    }

    const { lotId } = req.body || {};
    const lid = Number(lotId);

    // Validate lot ID
    if (!lid || Number.isNaN(lid) || lid <= 0) {
      await t.rollback();
      return errorResponse(res, 5035);
    }

    // Find the cart item
    const existing = await CustomerCartItem.findOne({
      where: { customer: customer.id, lot: lid },
      transaction: t,
    });

    if (!existing) {
      await t.rollback();
      return errorResponse(res, 5035, 'Item not found in cart', 404);
    }

    // Permanently delete the cart item
    await CustomerCartItem.destroy({
      where: { id: existing.id },
      force: true,
      transaction: t,
    });

    await t.commit();
    return successResponse(res, 5036, { message: 'Removed from cart' });
  } catch (err) {
    try {
      await t.rollback();
    } catch (e) {}
    console.error('removeCartItem error:', err);
    return errorResponse(res, err.message || err);
  }
};

export default {
  getStoreAvailablePackets,
  getStoreAvailablePacketById,
  toggleCustomerWishlist,
  // toggleCustomerCartItem,
  addOrUpdateCartItem,
  removeCartItem,
};
