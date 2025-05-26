const { body, validationResult } = require("express-validator");

const validateContact = [
  // Validate name
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage("Name can only contain letters and spaces"),

  // Validate email
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  // Validate message
  body("message")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Message must be between 10 and 1000 characters")
    .escape(),

  // Check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = validateContact;
