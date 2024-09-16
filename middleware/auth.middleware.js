const jwt = require('jsonwebtoken');
require('dotenv').config();

const extractToken = (req) => {
    const authHeader = req.headers['authorization'];
    return authHeader && authHeader.split(' ')[1];
};

const verifyToken = (token, res, callback) => {
    if (!token) {
        return res.status(401).json({ error: 100, message: 'Access denied. No token provided.', success: false });
    }

    jwt.verify(token, process.env.SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 101, message: 'Token has expired! Please login.', success: false });
        }
        callback(user);
    });
};

const AuthUser = (req, res, next) => {
    const token = extractToken(req);
    verifyToken(token, res, (user) => {
        req.user = user;
        next();
    });
};

const CheckAuth = (req, res) => {
    const token = extractToken(req);
    verifyToken(token, res, () => {
        return res.status(200).json({ error: 0, message: 'User authenticated.', success: true });
    });
};

module.exports = {
    AuthUser,
    CheckAuth,
};
