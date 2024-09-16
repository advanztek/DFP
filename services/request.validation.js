const { validationResult } = require('express-validator');

const validateRequest = (request, response, next) => {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }
    return next()
}
module.exports = { validateRequest }