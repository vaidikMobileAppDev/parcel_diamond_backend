import Sequelize from 'sequelize';
import config from './config.js';
import rolesData from '../../seedsData/roles.js';
import permissionsData from '../../seedsData/permissions.js';
import sieveSizeData from '../../seedsData/sieve_size.js';
import countryData from '../../seedsData/country.js';
import colorData from '../../seedsData/color.js';
import shapeData from '../../seedsData/shapes.js';
import clarityData from '../../seedsData/clarity.js';

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

import adminModel from '../models/admin.model.js';
import adminSessionModel from '../models/admin_sessions.model.js';
import userModel from '../models/customer.model.js';
import userSessionModel from '../models/customer_session.model.js';
import rolesModel from '../models/roles.model.js';
import adminPanelPermissionsModel from '../models/admin_panel_permission.model.js';
import employeePermissionsModel from '../models/employee_permissions.model.js';
import customerRoleModel from '../models/customer_role.model.js';
import globalPriceModel from '../models/global_price.model.js';
import supplierModel from '../models/supplier.model.js';
import auditLogModel from '../models/audit_log.model.js';
import sieveSizeModel from '../models/sieve_size.model.js';
import diamondsModel from '../models/diamonds.model.js';
import diamondsGradesModel from '../models/diamonds_grades.model.js';
import diamondsLotsModel from '../models/diamonds_lots.model.js';
import countryModel from '../models/country_model.js';
import colorModel from '../models/color.model.js';
import shapeModel from '../models/shape.model.js';
import clarityModel from '../models/clarity.model.js';
import diamondsLotsQRCodesModel from '../models/diamonds_lot_qr_code.model.js';
import diamondsPaymentsModel from '../models/diamonds_payments.model.js';

//APP configration models
db.Country = countryModel(sequelize, Sequelize);
db.Color = colorModel(sequelize, Sequelize);
db.Shape = shapeModel(sequelize, Sequelize);
db.Clarity = clarityModel(sequelize, Sequelize);
db.SieveSize = sieveSizeModel(sequelize, Sequelize);
db.Roles = rolesModel(sequelize, Sequelize);

//Functionality models
db.AuditLog = auditLogModel(sequelize, Sequelize);
db.Admin = adminModel(sequelize, Sequelize);
db.AdminSession = adminSessionModel(sequelize, Sequelize);
db.Customer = userModel(sequelize, Sequelize);
db.CustomerSession = userSessionModel(sequelize, Sequelize);
db.AdminPanelPermissions = adminPanelPermissionsModel(sequelize, Sequelize);
db.EmployeePermissions = employeePermissionsModel(sequelize, Sequelize);
db.CustomerRoles = customerRoleModel(sequelize, Sequelize);
db.GlobalPrice = globalPriceModel(sequelize, Sequelize);
db.Supplier = supplierModel(sequelize, Sequelize);
db.Diamonds = diamondsModel(sequelize, Sequelize);
db.DiamondsGrades = diamondsGradesModel(sequelize, Sequelize);
db.DiamondsLots = diamondsLotsModel(sequelize, Sequelize);
db.DiamondsLotsQRCodes = diamondsLotsQRCodesModel(sequelize, Sequelize);
db.DiamondsPayments = diamondsPaymentsModel(sequelize, Sequelize);

db.AdminPanelPermissions.hasMany(db.EmployeePermissions, {
  foreignKey: 'admin_panel_permission_id',
});
db.EmployeePermissions.belongsTo(db.AdminPanelPermissions, {
  foreignKey: 'admin_panel_permission_id',
});

db.Supplier.hasMany(db.Diamonds, {
  foreignKey: 'supplier_id',
});
db.Diamonds.belongsTo(db.Supplier, {
  foreignKey: 'supplier_id',
});
db.Diamonds.hasMany(db.DiamondsLots, {
  foreignKey: 'diamond_id',
});
db.DiamondsLots.belongsTo(db.Diamonds, {
  foreignKey: 'diamond_id',
});

db.DiamondsLots.hasMany(db.DiamondsLotsQRCodes, {
  foreignKey: 'diamond_lot_id',
});
db.DiamondsLotsQRCodes.belongsTo(db.DiamondsLots, {
  foreignKey: 'diamond_lot_id',
});
db.Diamonds.hasMany(db.DiamondsLotsQRCodes, {
  foreignKey: 'diamond_id',
});
db.DiamondsLotsQRCodes.belongsTo(db.Diamonds, {
  foreignKey: 'diamond_id',
});
db.Diamonds.hasMany(db.DiamondsGrades, {
  foreignKey: 'diamond_id',
});
db.DiamondsGrades.belongsTo(db.Diamonds, {
  foreignKey: 'diamond_id',
});
db.DiamondsGrades.hasMany(db.DiamondsLots, {
  foreignKey: 'diamond_grade_id',
});
db.DiamondsLots.belongsTo(db.DiamondsGrades, {
  foreignKey: 'diamond_grade_id',
});
db.DiamondsLots.hasMany(db.DiamondsPayments, {
  foreignKey: 'diamond_id',
});
db.DiamondsPayments.belongsTo(db.DiamondsLots, {
  foreignKey: 'diamond_id',
});

db.sequelize
  .sync({ alter: true })
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
      await db.EmployeePermissions.create({
        admin_id: 2,
        admin_panel_permission_id: 1,
        frontend_path: '/dashboard',
        backend_path: '/get-dashboard',
        fields: ['order_id'],
      });
      console.log('Admin Panel Permissions created successfully');
    }

    if ((await db.SieveSize.count()) === 0) {
      await db.SieveSize.bulkCreate(sieveSizeData);
      console.log('Sieve Size created successfully');
    }
    if ((await db.Country.count()) === 0) {
      await db.Country.bulkCreate(countryData);
      console.log('Country created successfully');
    }
    if ((await db.Color.count()) === 0) {
      await db.Color.bulkCreate(colorData);
      console.log('Color created successfully');
    }
    if ((await db.Shape.count()) === 0) {
      await db.Shape.bulkCreate(shapeData);
      console.log('Shape created successfully');
    }
    if ((await db.Clarity.count()) === 0) {
      await db.Clarity.bulkCreate(clarityData);
      console.log('Clarity created successfully');
    }
    console.log('Database synced successfully');
  })
  .catch((error) => {
    console.log(error);
  });

export default db;
