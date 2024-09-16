const express = require("express");
const router = express.Router();
const { planMission } = require("../controllers/drone.controller");
const { validateRequest } = require("../services/request.validation");
const { AuthUser } = require("../middleware/auth.middleware");

// Route for planning mission
router.post("/plan-mission", AuthUser, validateRequest, planMission);

module.exports = router;
