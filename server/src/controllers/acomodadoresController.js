const { generarPdfAcomodadores } = require('../services/acomodadoresPdf.service');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.generarAcomodadoresPdf = catchAsync(async (req, res, next) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return next(new AppError('Debes proporcionar el año (year) y el mes (month).', 400));
  }

  const pdfBuffer = await generarPdfAcomodadores(req.user.id, parseInt(year), parseInt(month));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Acomodadores-${month}-${year}.pdf`);
  res.send(pdfBuffer);
});
