export default (sequelize, Sequelize) => {
  const Custormer_address = sequelize.define('customer_addresses', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },    
    user_id: {
      type: Sequelize.BIGINT,
      allowNull: false      
    },
    first_name:{
      type: Sequelize.STRING,
      allowNull: true
    },
    last_name : {
      type: Sequelize.STRING,
      allowNull: true
    },
    email : {
      type: Sequelize.STRING,
      allowNull: true
    },
    mobcode : {
      type: Sequelize.STRING,
      allowNull: true
    },
    mobileno : {
      type: Sequelize.STRING,
      allowNull: true
    },
    company_name : {
      type: Sequelize.STRING,
      allowNull: true
    },
    address_1 : {
      type: Sequelize.STRING,
      allowNull: true
    },
    address_2 : {
      type: Sequelize.STRING,
      allowNull: true
    },
    country : {
      type: Sequelize.STRING,
      allowNull: true
    },
    state : {
      type: Sequelize.STRING,
      allowNull: true
    },
    city : {
      type: Sequelize.STRING,
      allowNull: true
    }, 
    pincode : {
      type: Sequelize.STRING,
      allowNull: true
    },   
    is_default: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
  return Custormer_address;
};
