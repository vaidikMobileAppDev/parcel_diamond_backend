export default (sequelize, Sequelize) => {
  const Supplier = sequelize.define('suppliers', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    supplier_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    supplier_email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    supplier_phone_no: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    contact_person_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    contact_person_phone_no: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    contact_person_email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    kyc_date: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    category: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('pending', 'approved', 'declined'),
      allowNull: false,
      defaultValue: 'pending',
    },
    is_deleted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      field: 'created_at',
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      field: 'updated_at',
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  return Supplier;
};
