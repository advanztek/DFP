// controllers/drone.controller.js
require("dotenv").config();
const axios = require('axios');
const missionSchema = require('../services/mission.validation');

// Helper function to calculate distance using the Haversine formula
const calculateDistance = (takeoffCoordinates, landingCoordinates) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = takeoffCoordinates.lat * Math.PI / 180;
    const φ2 = landingCoordinates.lat * Math.PI / 180;
    const Δφ = (landingCoordinates.lat - takeoffCoordinates.lat) * Math.PI / 180;
    const Δλ = (landingCoordinates.lng - takeoffCoordinates.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return distance / 1000; // Convert to kilometers
};

// Function to get weather data based on coordinates and time (replace with actual API)
const getWeatherData = async (coordinates, missionDateTime) => {
    try {
        // Convert missionDateTime to Unix timestamp
        const date = new Date(missionDateTime);
        const timestamp = Math.floor(date.getTime() / 1000);

        const response = await axios.get(`https://api.openweathermap.org/data/3.0/onecall/timemachine?dt=${timestamp}&lat=${coordinates.lat}&lon=${coordinates.lng}&appid=${process.env.WEATHER_API_KEY}`);

        // Return relevant weather data
        return response.data;
    } catch (err) {
        console.error('Error fetching weather data:', err);
        return null;
    }
};

// Enhanced mission evaluation based on drone data and weather
const evaluateMission = (distance, weather, droneData) => {
    const { endurance, range, maxSpeed, maxTemperature, minTemperature, maxHumidity } = droneData;

    // Convert wind speed from m/s to km/h
    const windSpeedInKmh = weather.wind_speed * 3.6;

    // Conditions evaluation
    let reasons = [];
    let checks = [];
    let missionFeasible = true;
    let penalty = 0; // Penalty percentage accumulator

    // Define penalties for each condition
    const CRITICAL_PENALTY = 50; // Critical failures remove 50% per failure
    const SECONDARY_PENALTY = 10; // Secondary issues remove 10% per failure

    // Check if the distance is feasible based on the drone's range
    if (range < distance) {
        reasons.push("Insufficient range to cover the distance.");
        checks.push({
            check: "Range",
            result: "Fail",
            impact: CRITICAL_PENALTY,
            values: { required: distance, available: range }
        });
        missionFeasible = false;  // Critical failure
        penalty += CRITICAL_PENALTY;
    } else {
        checks.push({
            check: "Range",
            result: "Pass",
            impact: 0,
            values: { required: distance, available: range }
        });
    }

    // Check if endurance is enough for the flight duration
    const requiredTime = distance / maxSpeed;
    if (endurance < requiredTime) {
        reasons.push("Insufficient endurance for the required flight time.");
        checks.push({
            check: "Endurance",
            result: "Fail",
            impact: CRITICAL_PENALTY,
            values: { required: requiredTime, available: endurance }
        });
        missionFeasible = false;  // Critical failure
        penalty += CRITICAL_PENALTY;
    } else {
        checks.push({
            check: "Endurance",
            result: "Pass",
            impact: 0,
            values: { required: requiredTime, available: endurance }
        });
    }

    // If there are any critical failures, stop further evaluation
    if (!missionFeasible) {
        return {
            successRate: Math.max(0, 100 - penalty),
            reasons,
            checks
        };
    }

    // Secondary checks (less critical but still important)

    // Check wind speed relative to the drone's maximum speed
    if (windSpeedInKmh >= maxSpeed) {
        reasons.push("Wind speed is too high for safe operation.");
        checks.push({
            check: "Wind Speed",
            result: "Fail",
            impact: SECONDARY_PENALTY,
            values: { current: windSpeedInKmh, maxAllowed: maxSpeed }
        });
        penalty += SECONDARY_PENALTY;
    } else if (windSpeedInKmh >= 0.5 * maxSpeed) {
        reasons.push("Wind speed is approaching the upper limit of safe operation.");
        checks.push({
            check: "Wind Speed",
            result: "Warning",
            impact: SECONDARY_PENALTY,
            values: { current: windSpeedInKmh, maxAllowed: maxSpeed }
        });
        penalty += SECONDARY_PENALTY;
    } else {
        checks.push({
            check: "Wind Speed",
            result: "Pass",
            impact: 0,
            values: { current: windSpeedInKmh, maxAllowed: maxSpeed }
        });
    }

    // Check temperature
    if (weather.temp > maxTemperature) {
        reasons.push("Temperature is too high for safe drone operation.");
        checks.push({
            check: "Temperature",
            result: "Fail",
            impact: SECONDARY_PENALTY,
            values: { current: weather.temp, maxAllowed: maxTemperature }
        });
        penalty += SECONDARY_PENALTY;
    } else if (weather.temp < minTemperature) {
        reasons.push("Temperature is too low for safe drone operation.");
        checks.push({
            check: "Temperature",
            result: "Fail",
            impact: SECONDARY_PENALTY,
            values: { current: weather.temp, minAllowed: minTemperature }
        });
        penalty += SECONDARY_PENALTY;
    } else {
        checks.push({
            check: "Temperature",
            result: "Pass",
            impact: 0,
            values: { current: weather.temp, minAllowed: minTemperature, maxAllowed: maxTemperature }
        });
    }

    // Check humidity
    if (weather.humidity > maxHumidity) {
        reasons.push("Humidity levels are too high for safe operation.");
        checks.push({
            check: "Humidity",
            result: "Fail",
            impact: SECONDARY_PENALTY,
            values: { current: weather.humidity, maxAllowed: maxHumidity }
        });
        penalty += SECONDARY_PENALTY;
    } else {
        checks.push({
            check: "Humidity",
            result: "Pass",
            impact: 0,
            values: { current: weather.humidity, maxAllowed: maxHumidity }
        });
    }

    // Calculate final success rate
    const successRate = Math.max(0, 100 - penalty);

    return {
        successRate,
        reasons: reasons.length === 0 ? ["Mission is feasible."] : reasons,
        checks
    };
};

// Main controller function to handle mission planning
const planMission = async (req, res) => {
    const {
        endurance,
        range,
        maxSpeed,
        takeoffCoordinates,
        landingCoordinates,
        missionDateTime,
        minTemperature,
        maxTemperature,
        maxHumidity
    } = req.body;

    try {
        // Validate user input
        const { error } = await missionSchema.validateAsync(req.body);

        if (error) {
            throw new Error(error.details.map(d => d.message).join(', '));
        }

        // Default thresholds
        const DEFAULT_MIN_TEMPERATURE = -10; // in degrees Celsius
        const DEFAULT_MAX_TEMPERATURE = 40;  // in degrees Celsius
        const DEFAULT_MAX_HUMIDITY = 90;     // as a percentage

        // Apply default values if the provided values are invalid
        const validMinTemperature = (typeof minTemperature === 'number') ? minTemperature : DEFAULT_MIN_TEMPERATURE;
        const validMaxTemperature = (typeof maxTemperature === 'number') ? maxTemperature : DEFAULT_MAX_TEMPERATURE;
        const validMaxHumidity = (typeof maxHumidity === 'number') ? maxHumidity : DEFAULT_MAX_HUMIDITY;

        // Calculate distance between takeoff and landing
        const distance = calculateDistance(takeoffCoordinates, landingCoordinates);

        // Fetch weather data for the takeoff coordinates and time
        const weather = await getWeatherData(takeoffCoordinates, missionDateTime);

        if (!weather) {
            return res.status(500).json({ message: "Failed to retrieve weather data." });
        }

        // Evaluate the mission's feasibility based on drone data and weather
        const droneData = {
            endurance,
            range,
            maxSpeed,
            maxTemperature: validMaxTemperature,
            minTemperature: validMinTemperature,
            maxHumidity: validMaxHumidity
        };
        const missionEvaluation = evaluateMission(distance, weather, droneData);

        return res.status(200).json({
            success: true,
            distance,
            weather,
            missionEvaluation
        });
    } catch (error) {
        console.error('Error planning mission:', error);
        return res.status(500).json({ message: error?.message || "Failed to plan mission." });
    }
};


module.exports = {
    planMission
};
