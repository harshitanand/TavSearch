const { body, query, param, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return next(new ValidationError('Validation failed', 400, errorMessages));
  }
  
  next();
};

const validateAnalysisRequest = [
  body('query')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Query must be between 5 and 1000 characters'),
  
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  
  handleValidationErrors
];

const validateQueryParams = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be 0 or greater'),
  
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status value'),
  
  handleValidationErrors
];

const validateObjectId = [
  param('queryId')
    .isMongoId()
    .withMessage('Invalid query ID format'),
  
  handleValidationErrors
];

module.exports = {
  validateAnalysisRequest,
  validateQueryParams,
  validateObjectId,
  handleValidationErrors
};
