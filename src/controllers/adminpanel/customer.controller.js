import Validator from 'validatorjs';

import db from '../../config/db.config.js';
import { getFieldsNameOfTable } from '../../helpers/getFieldsNameOfTable.js';
import { uploadFile } from '../../helpers/image.js';
import { pagination } from '../../helpers/pagination.js';
import { errorResponse, successResponse } from '../../helpers/response.js';

const { Customer, Op, literal, fn, col, CustomerBusinessCard, CustomerBusinessCertificate, CustomerCartItem, DiamondLot, DiamondGrade, SieveSize, Shape, Color, Clarity } = db;
const addCustomer = async (req, res) => {
  const transaction = await db.sequelize.transaction();
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
      // business_class_code: 'required',
      // business_class_name: 'required',
      business_country_code: 'required',
      business_phone_no: 'required',
      // display_order: 'required',
      kyc_date: 'required',
      kyc_exp_date: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      await transaction.rollback();
      return errorResponse(res, firstMessage);
    }

    const files = req.files;

    if (!files || files.length == 0) {
      await transaction.rollback();
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
      // business_class_code,
      // business_class_name,
      business_country_code,
      business_phone_no,
      // display_order,
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
      // business_class_code,
      // business_class_name,
      business_country_code,
      business_phone_no,
      // display_order,
      kyc_date,
      kyc_exp_date,
      // business_certificate,
      // business_card,
      password: name,
    };

    const addedCustomer = await Customer.create(data, { transaction });

    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].fieldname == 'business_certificate') {
          let business_certificate = await uploadFile(
            files[i],
            'customer/business_certificate'
          );
          await CustomerBusinessCertificate.create(
            {
              customer_id: addedCustomer.id,
              business_certificate,
            },
            { transaction }
          );
        } else if (files[i].fieldname == 'business_card') {
          let business_card = await uploadFile(
            files[i],
            'customer/business_card'
          );
          await CustomerBusinessCard.create(
            {
              customer_id: addedCustomer.id,
              business_card,
            },
            { transaction }
          );
        } else {
          await transaction.rollback();
          return errorResponse(res, 9006);
        }
      }
    }

    await transaction.commit();
    return successResponse(res, 2001);
  } catch (error) {
    console.log('error', error);
    await transaction.rollback();
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
      // business_class_name,
      status,
      sort_field = 'id',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;

    const { fields } = req.permission;

    const getCustomerTableFields = await getFieldsNameOfTable(Customer);
    const getPermissionFieldsOfCustomer = fields.filter((field) =>
      getCustomerTableFields.includes(field)
    );

    const getCustomerBusinessCardTableFields =
      await getFieldsNameOfTable(CustomerBusinessCard);
    const getPermissionFieldsOfCustomerBusinessCard = fields.filter((field) =>
      getCustomerBusinessCardTableFields.includes(field)
    );

    const getCustomerBusinessCertificateTableFields =
      await getFieldsNameOfTable(CustomerBusinessCertificate);
    const getPermissionFieldsOfCustomerBusinessCertificate = fields.filter(
      (field) => getCustomerBusinessCertificateTableFields.includes(field)
    );

    const data = await Customer.findAndCountAll({
      attributes: getPermissionFieldsOfCustomer,
      where: {
        ...(search && {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { name: { [Op.iLike]: `%${search}%` } },
            { company_name: { [Op.iLike]: `%${search}%` } },
            { country: { [Op.iLike]: `%${search}%` } },
            { phone_no: { [Op.iLike]: `%${search}%` } },
            { business_type: { [Op.iLike]: `%${search}%` } },
          ],
        }),
        ...(start_date &&
          end_date && {
            created_at: {
              [Op.between]: [new Date(`${start_date}T00:00:00`), new Date(`${end_date}T23:59:59`)],
            },
          }),
        ...(country && { country: country.toUpperCase() }),
        ...(customer_type && { customer_type: customer_type }),
        // ...(business_class_name && {
        //   business_class_name: business_class_name,
        // }),
        ...(status && { status: status }),
      },
      include: [
        {
          model: CustomerBusinessCard,
          attributes: getPermissionFieldsOfCustomerBusinessCard,
        },
        {
          model: CustomerBusinessCertificate,
          attributes: getPermissionFieldsOfCustomerBusinessCertificate,
        },
      ],
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

const getCustomerWithCart = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      start_date,
      end_date,
      country,
      customer_type,
      // business_class_name,
      status,
      sort_field = 'id',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;

    const { fields } = req.permission;

    const getCustomerTableFields = await getFieldsNameOfTable(Customer);
    const getPermissionFieldsOfCustomer = fields.filter((field) =>
      getCustomerTableFields.includes(field)
    );

    const getCustomerBusinessCardTableFields =
      await getFieldsNameOfTable(CustomerBusinessCard);
    const getPermissionFieldsOfCustomerBusinessCard = fields.filter((field) =>
      getCustomerBusinessCardTableFields.includes(field)
    );

    const getCustomerBusinessCertificateTableFields =
      await getFieldsNameOfTable(CustomerBusinessCertificate);
    const getPermissionFieldsOfCustomerBusinessCertificate = fields.filter(
      (field) => getCustomerBusinessCertificateTableFields.includes(field)
    );  
  

    const data = await Customer.findAndCountAll({
          attributes: {
            // include: [
            //   [fn("COUNT", col("cartItems.id")), "cartItemsCount"]
            // ],
            exclude: ["password", "created_at", "updated_at","forgot_pass_token","forgot_pass_otp"],
          },
          where: {
            ...(search && {
              [Op.or]: [
                { email: { [Op.iLike]: `%${search}%` } },
                { name: { [Op.iLike]: `%${search}%` } },
                { company_name: { [Op.iLike]: `%${search}%` } },
                { country: { [Op.iLike]: `%${search}%` } },
                { phone_no: { [Op.iLike]: `%${search}%` } },
                { business_type: { [Op.iLike]: `%${search}%` } },
              ],
            }),
            ...(start_date && end_date && {
              created_at: {
                [Op.between]: [
                  new Date(`${start_date}T00:00:00`),
                  new Date(`${end_date}T23:59:59`),
                ],
              },
            }),
            ...(country && { country: country.toUpperCase() }),
            ...(customer_type && { customer_type }),
            ...(status && { status }),
          },
          include: [        
            {
              model: CustomerCartItem,
              as: "cartItems",
              required: true ,
              include: [
                {
                  model: DiamondLot,
                  as: "lotDetail",
                  include: [
                    {
                      model: DiamondGrade,
                      as: "gradeDetail",
                      attributes : ['id','shape','color','clarity'],
                      include: [
                        {
                          model: Shape,
                          as: "shapeDetail",
                          attributes : ['id','shape']
                        },
                        {
                          model: Color,
                          as: "colorDetail",
                          attributes : ['id','color']
                        },
                        {
                          model: Clarity,
                          as: "clarityDetail",
                          attributes : ['id','clarity']
                        },
                      ]
                    },
                    {
                      model: SieveSize,
                      as: "sieveSizeDetail"
                    }
                  ]
                },
              ]
            },
          ],
          group: [
              "customers.id",
              "cartItems.id",
              "cartItems->lotDetail.id",
              "cartItems->lotDetail->gradeDetail.id",
              "cartItems->lotDetail->sieveSizeDetail.id",
              "cartItems->lotDetail->gradeDetail->shapeDetail.id",
              "cartItems->lotDetail->gradeDetail->colorDetail.id",
              "cartItems->lotDetail->gradeDetail->clarityDetail.id"
          ], 
          order: [[literal(`COUNT("cartItems"."id")`), "DESC"]], 
          subQuery: false,
          limit: Number(limit),
          offset: Number(offset),
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

export default {
  addCustomer,
  getCustomerList,
  updateCustomerStatus,
  getCustomerWithCart
};
