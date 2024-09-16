const express = require("express");
const { validateRequest } = require("../services/request.validation");
const AuthController = require('../controllers/auth.controller');
const { CheckAuth, AuthUser } = require("../middleware/auth.middleware");
const router = express.Router();

// AUTHENTICATION
router.post("/login", validateRequest, AuthController.loginUser);
router.post("/create-account", validateRequest, AuthController.registerUser);
router.post('/update-password', AuthUser, AuthController.updatePassword);
router.get("/check-auth", validateRequest, CheckAuth);

module.exports = router;