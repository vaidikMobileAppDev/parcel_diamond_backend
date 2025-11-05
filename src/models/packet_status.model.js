import { UCFirstWords } from "../helpers/other_helper.js";

export default (sequelize, Sequelize) => {
  const Packet_status = sequelize.define('packet_statuses', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },    
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      set(value) {     
        this.setDataValue('name', UCFirstWords(value));
      }      
    },
    customer_caption: {
      type: Sequelize.STRING,
      allowNull: true
    },
    admin_caption: {
      type: Sequelize.STRING,
      allowNull: true
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true
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
  return Packet_status;
};
