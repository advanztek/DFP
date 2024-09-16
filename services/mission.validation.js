const Joi = require("joi");

const missionSchema = Joi.object({
  endurance: Joi.number().required(),
  range: Joi.number().required(),
  maxSpeed: Joi.number().required(),
  takeoffCoordinates: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  landingCoordinates: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  missionDateTime: Joi.date().required(),
  minTemperature: Joi.number().optional(),  
  maxTemperature: Joi.number().optional(),  
  maxHumidity: Joi.number().optional()      
});

module.exports = missionSchema;
