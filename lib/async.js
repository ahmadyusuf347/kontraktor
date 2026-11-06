// Meneruskan error dari handler async ke error handler Express
module.exports = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
