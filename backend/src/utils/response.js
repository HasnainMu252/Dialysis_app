export const sendSuccess = (res, { statusCode = 200, data = {}, message = '', meta = {} } = {}) =>
  res.status(statusCode).json({ success: true, data, message, errors: [], ...meta });

export const sendError = (res, { statusCode = 500, message = 'Internal server error', errors = [] } = {}) =>
  res.status(statusCode).json({ success: false, data: {}, message, errors });
