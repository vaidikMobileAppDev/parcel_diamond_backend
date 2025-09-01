const pagination = async (data, page, limit) => {
  return {
    currentPage: Number(page),
    totalDataCount: Number(data),
    totalPages:
      Math.ceil(Number(data) / Number(limit)) == 0
        ? 1
        : Math.ceil(Number(data) / Number(limit)),
  };
};

export { pagination };
