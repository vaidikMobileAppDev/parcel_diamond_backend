export default (sequelize, Sequelize) => {
  const AuditLog = sequelize.define('audit_logs', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userId: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    method: {
      type: Sequelize.STRING,
    },
    baseUrl: {
      type: Sequelize.STRING,
    },
    url: {
      type: Sequelize.STRING,
    },
    payload: {
      type: Sequelize.JSONB,
    },
    query: {
      type: Sequelize.JSONB,
    },
    params: {
      type: Sequelize.JSONB,
    },
    timestamp: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
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
  return AuditLog;
};
