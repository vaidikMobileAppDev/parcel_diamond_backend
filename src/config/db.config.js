import Sequelize from 'sequelize';
import config from './config.js';
import rolesData from '../../seedsData/roles.js';
import permissionsData from '../../seedsData/permissions.js';
import sieveSizeData from '../../seedsData/sieve_size.js';
import countryData from '../../seedsData/country.js';
import colorData from '../../seedsData/color.js';
import shapeData from '../../seedsData/shapes.js';
import clarityData from '../../seedsData/clarity.js';
import supplierCategoryData from '../../seedsData/supplier_category.js';

export const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    dialect: config.database.dialect,
    port: config.database.port,
    logging: false,
    // if you use local posgtres then comment this code
    ...(config.database.host !== 'localhost' && {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }),
  }
);

let db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.Op = Sequelize.Op;
db.col = Sequelize.col;
db.fn = Sequelize.fn;
db.literal = Sequelize.literal;

import adminModel from '../models/admin.model.js';
import adminSessionModel from '../models/admin_sessions.model.js';
import userModel from '../models/customer.model.js';
import userSessionModel from '../models/customer_session.model.js';
import customerWishListModel from '../models/customerWishList.model.js';
import customerCartItemModel from '../models/customerCartItem.model.js';
import rolesModel from '../models/roles.model.js';
import adminPanelPermissionsModel from '../models/admin_panel_permission.model.js';
import employeePermissionsModel from '../models/employee_permissions.model.js';
import customerRoleModel from '../models/customer_role.model.js';
import globalPriceModel from '../models/global_price.model.js';
import supplierModel from '../models/supplier.model.js';
import auditLogModel from '../models/audit_log.model.js';
import sieveSizeModel from '../models/sieve_size.model.js';
import countryModel from '../models/country_model.js';
import regionModel from '../models/region.model.js';
import regionCountryModel from '../models/regionCountry.model.js';
import colorModel from '../models/color.model.js';
import shapeModel from '../models/shape.model.js';
import clarityModel from '../models/clarity.model.js';
import customerBusinessCardModel from '../models/customer_business_card.model.js';
import customerBusinessCertificateModel from '../models/customer_business_certificate.model.js';
import supplierCategoryModel from '../models/supplier_category.model.js';
import locationModel from '../models/location.model.js';
import diamondPurchaseModel from '../models/DiamondPurchase.model.js';
import diamondGradeModel from '../models/DiamondGrade.model.js';
import diamondLotModel from '../models/DiamondLot.model.js';
import diamondPacketModel from '../models/DiamondPacket.model.js';
import packetSourceModel from '../models/PacketSource.model.js';
import diamondPaymentModel from '../models/DiamondPayment.model.js';
import pricePerCaratRegionModel from '../models/pricePerCaratRegion.model.js';
import inventoryMovementModel from '../models/InventoryMovement.model.js';
import Order_status_caption from '../models/order_status_caption.model.js';
import OrderModel from '../models/order.model.js';
import Order_addressModel from '../models/order_address.model.js';
import Order_packet_detailModel from '../models/order_packet_detail.model.js';
import order_paymentModel from '../models/order_payment.model.js';
import Packet_status from '../models/packet_status.model.js';
import Customer_address from '../models/customer_address.model.js';

//APP configration models
db.Location = locationModel(sequelize, Sequelize);
db.Country = countryModel(sequelize, Sequelize);
db.Region = regionModel(sequelize, Sequelize);
db.RegionCountry = regionCountryModel(sequelize, Sequelize);
db.Color = colorModel(sequelize, Sequelize);
db.Shape = shapeModel(sequelize, Sequelize);
db.Clarity = clarityModel(sequelize, Sequelize);
db.SieveSize = sieveSizeModel(sequelize, Sequelize);
db.Roles = rolesModel(sequelize, Sequelize);
db.SupplierCategory = supplierCategoryModel(sequelize, Sequelize);
db.Order_status_caption = Order_status_caption(sequelize, Sequelize);
db.Packet_status = Packet_status(sequelize, Sequelize);

//Functionality models
db.AuditLog = auditLogModel(sequelize, Sequelize);
db.Admin = adminModel(sequelize, Sequelize);
db.AdminSession = adminSessionModel(sequelize, Sequelize);
db.Customer = userModel(sequelize, Sequelize);
db.CustomerSession = userSessionModel(sequelize, Sequelize);
db.CustomerWishList = customerWishListModel(sequelize, Sequelize);
db.CustomerCartItem = customerCartItemModel(sequelize, Sequelize);
db.CustomerBusinessCard = customerBusinessCardModel(sequelize, Sequelize);
db.CustomerBusinessCertificate = customerBusinessCertificateModel(
  sequelize,
  Sequelize
);
db.AdminPanelPermissions = adminPanelPermissionsModel(sequelize, Sequelize);
db.EmployeePermissions = employeePermissionsModel(sequelize, Sequelize);
db.CustomerRoles = customerRoleModel(sequelize, Sequelize);
db.GlobalPrice = globalPriceModel(sequelize, Sequelize);
db.Supplier = supplierModel(sequelize, Sequelize);
db.DiamondPacket = diamondPacketModel(sequelize, Sequelize);
db.DiamondGrade = diamondGradeModel(sequelize, Sequelize);
db.DiamondLot = diamondLotModel(sequelize, Sequelize);
db.DiamondPayment = diamondPaymentModel(sequelize, Sequelize);
db.DiamondPurchase = diamondPurchaseModel(sequelize, Sequelize);
db.InventoryMovement = inventoryMovementModel(sequelize, Sequelize);
db.PacketSource = packetSourceModel(sequelize, Sequelize);
db.PricePerCaratRegion = pricePerCaratRegionModel(sequelize, Sequelize);

//Order models
db.Order = OrderModel(sequelize, Sequelize);
db.Order_address = Order_addressModel(sequelize, Sequelize);
db.Order_packet_detail = Order_packet_detailModel(sequelize, Sequelize);
db.Order_payment = order_paymentModel(sequelize, Sequelize);
db.Customer_address = Customer_address(sequelize, Sequelize);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.AdminPanelPermissions.hasMany(db.EmployeePermissions, {
  foreignKey: 'admin_panel_permission_id',
});
db.EmployeePermissions.belongsTo(db.AdminPanelPermissions, {
  foreignKey: 'admin_panel_permission_id',
});

db.Customer.hasMany(db.CustomerBusinessCard, {
  foreignKey: 'customer_id',
});
db.CustomerBusinessCard.belongsTo(db.Customer, {
  foreignKey: 'customer_id',
});
db.Customer.hasMany(db.CustomerBusinessCertificate, {
  foreignKey: 'customer_id',
});
db.CustomerBusinessCertificate.belongsTo(db.Customer, {
  foreignKey: 'customer_id',
});

db.sequelize
  .sync({ alter: true })
  // .sync({ force: true })
  .then(async () => {
    if ((await db.Admin.count()) === 0) {
      await db.Admin.create({
        name: 'superadmin',
        email: 'superadmin@gmail.com',
        password: 'admin',
        role: 'superadmin',
        sub_role: ['all'],
        country: 'USA',
        office: 'USA',
        is_active: true,
        is_account_deleted: false,
      });
      await db.Admin.create({
        name: 'admin',
        email: 'admin@gmail.com',
        password: 'admin',
        role: 'admin',
        sub_role: ['all'],
        country: 'USA',
        office: 'USA',
        is_active: true,
        is_account_deleted: false,
      });
      console.log('admins created successfully');
    }
    if ((await db.Roles.count()) === 0) {
      await db.Roles.bulkCreate(rolesData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"roles"', 'id'),
          (SELECT MAX(id) FROM "roles")
        )
      `);
      console.log('Roles created successfully');
    }
    // else {
    //   for (let i = 0; i < rolesData.length; i++) {
    //     const roleId = rolesData[i].id;
    //     const checkExistRoles = await db.Roles.findOne({
    //       where: {
    //         id: roleId,
    //       },
    //     });
    //     if (!checkExistRoles) {
    //       await db.Roles.create(rolesData[i]);
    //       console.log('Roles created successfully in if condition');
    //     } else {
    //       await db.Roles.update(rolesData[i], {
    //         where: {
    //           id: roleId,
    //         },
    //       });
    //       console.log('Roles updated successfully.');
    //     }
    //   }
    // }

    if ((await db.AdminPanelPermissions.count()) === 0) {
      await db.AdminPanelPermissions.bulkCreate(permissionsData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"admin_panel_permissions"', 'id'),
          (SELECT MAX(id) FROM "admin_panel_permissions")
        )
      `);
      await db.EmployeePermissions.create({
        admin_id: 2,
        admin_panel_permission_id: 1,
        frontend_path: '/dashboard',
        backend_path: '/get-dashboard',
        fields: ['order_id'],
      });
      console.log('Admin Panel Permissions created successfully');
    }

    if ((await db.Country.count()) === 0) {
      await db.Country.bulkCreate(countryData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"countries"', 'id'),
          (SELECT MAX(id) FROM "countries")
        )
      `);
      console.log('Country created successfully');
    }
    if ((await db.Color.count()) === 0) {
      await db.Color.bulkCreate(colorData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"colors"', 'id'),
          (SELECT MAX(id) FROM "colors")
        )
      `);
      console.log('Color created successfully');
    }
    if ((await db.Shape.count()) === 0) {
      await db.Shape.bulkCreate(shapeData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"shapes"', 'id'),
          (SELECT MAX(id) FROM "shapes")
        )
      `);
      console.log('Shape created successfully');
    }
    if ((await db.SieveSize.count()) === 0) {
      await db.SieveSize.bulkCreate(sieveSizeData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"sieve_sizes"', 'id'),
          (SELECT MAX(id) FROM "sieve_sizes")
        )
      `);
      console.log('Sieve Size created successfully');
    }
    if ((await db.Clarity.count()) === 0) {
      await db.Clarity.bulkCreate(clarityData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"clarities"', 'id'),
          (SELECT MAX(id) FROM "clarities")
        )
      `);
      console.log('Clarity created successfully');
    }
    if ((await db.SupplierCategory.count()) === 0) {
      await db.SupplierCategory.bulkCreate(supplierCategoryData);
      await db.sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"supplier_categories"', 'id'),
          (SELECT MAX(id) FROM "supplier_categories")
        )
      `);
      console.log('supplier Category created successfully');
    }
    console.log('Database synced successfully');
  })
  .catch((error) => {
    console.log(error);
  });

export default db;
