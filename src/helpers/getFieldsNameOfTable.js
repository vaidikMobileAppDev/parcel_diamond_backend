const getFieldsNameOfTable = async (tableName) => {
  let names = await tableName.describe();
  return Object.keys(names);
};

export { getFieldsNameOfTable };
