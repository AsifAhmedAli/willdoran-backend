const { check, validationResult } = require('express-validator');
// validations for registration
const validateRegistration = [
    check('name').not().isEmpty().withMessage('Name is required'),
    check('company').not().isEmpty().withMessage('Company Name is required'),
    check('email').isEmail().withMessage('Invalid email address'),
    check('password'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        next();
    }
]

// validation for login
const validateLogin = [
    check('email').isEmail().withMessage('Invalid email address'),
    check('password'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        next();
    }
]
// validation for Forgot Password
const validateForgotPassword = [
    check('email').isEmail().withMessage('Invalid email address'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        next();
    }
]
// validation for Reset Password
const validateResetPassword = [
    check('password'),
    check('confirm_password'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        next();
    }
]

module.exports = { validateRegistration,validateLogin,validateForgotPassword,validateResetPassword }