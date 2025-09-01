const MESSAGE = {
  1001: 'login successfully',
  1002: 'register successfully',
  1003: 'Email not exist. please register first!',
  1004: 'Your password is not correct.',
  1005: 'Email already exist.',

  2001: 'Customer created successfully.',
  2002: 'Customer list loaded successfully.',
  2003: 'Customer status updated successfully.',
  2004: 'Customer not found. pelase check customer id.',
  2005: 'Customer register successfully.',

  3001: 'Configuration added successfully.',
  3002: 'Configuration role already exist.',
  3003: 'Configuration role not found. pelase check configuration role id.',
  3004: 'Configuration role updated successfully.',
  3005: 'Configuration role deleted successfully.',
  3006: 'Configuration role list loaded successfully.',
  3007: 'Configuration global price added successfully.',
  3008: 'Configuration global price updated successfully.',
  3009: 'Configuration global price deleted successfully.',
  3010: 'Configuration global price list loaded successfully.',
  3011: 'Configuration global price not found. pelase check configuration global price id.',
  3012: 'Configuration global price already exist.',

  4001: 'Supplier created successfully.',
  4002: 'Supplier already exist.',
  4003: 'Supplier list loaded successfully.',

  5001: 'Diamond created successfully.',
  5002: 'Diamond list loaded successfully.',
  5003: 'Diamond not found. pelase check Diamond id.',
  5004: 'Diamond status updated successfully.',
  5005: 'Sieve size not found. pelase check Sieve size id.',
  5006: 'Sieve lot calculation is not correct. please check the input.',
  5007: 'Diamond removed successfully.',
  5008: 'Purchase history loaded successfully.',
  5009: 'Diamond store status updated successfully.',
  5010: "Diamond's QR Code get successfully.",

  9001: 'Unauthorized',
  9002: 'Your account was deleted.',
  9003: 'Your account has been inactive by admin.',
  9004: 'Your account is inactive. Please verify your account.',
  9005: 'You have not permission to access this route.',
  9006: 'Please attach files.',
  9007: 'You have not permission to access of fields. please contact admin to add fields permission.',

  9101: 'Sieve size loaded successfully.',
  9102: 'Country loaded successfully.',
  9103: 'Color loaded successfully.',
  9104: 'Shape loaded successfully.',
  9105: 'Clarity loaded successfully.',

  9999: 'Something went wrong.',
};

const getMessage = (messageCode) => MESSAGE[messageCode] || messageCode;

export { getMessage };
