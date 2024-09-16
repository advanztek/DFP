// controllers/drone.controller.js
const axios = require('axios');

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
        const response = await axios.get(`https://api.weather.com/v3/wx/forecast/daily?lat=${coordinates.lat}&lon=${coordinates.lng}&apiKey=YOUR_API_KEY`);
        // Return relevant weather data
        return response.data;
    } catch (err) {
        console.error('Error fetching weather data:', err);
        return null;
    }
};

// Enhanced mission evaluation based on drone data and weather
const evaluateMission = (distance, weather, droneData) => {
    const { endurance, range, payloadCapacity, maxSpeed, ceiling, maxTakeoffWeight, width } = droneData;

    // Weather conditions thresholds
    const maxWindSpeed = 20; // in km/h (example threshold)
    const maxTemperature = 40; // in degrees Celsius (example threshold)
    const minTemperature = -10; // in degrees Celsius (example threshold)
    const maxHumidity = 90; // example threshold

    // Conditions evaluation
    let reasons = [];

    // Check if the distance is feasible based on the drone's range
    if (range < distance) {
        reasons.push("Insufficient range to cover the distance.");
    }

    // Check if endurance is enough for the flight duration
    const requiredTime = distance / maxSpeed;
    if (endurance < requiredTime) {
        reasons.push("Insufficient endurance for the required flight time.");
    }

    // Check wind speed
    if (weather.wind_speed > maxWindSpeed) {
        reasons.push("Wind speed is too high for safe operation.");
    }

    // Check temperature
    if (weather.temperature > maxTemperature) {
        reasons.push("Temperature is too high for safe drone operation.");
    }
    if (weather.temperature < minTemperature) {
        reasons.push("Temperature is too low for safe drone operation.");
    }

    // Check humidity
    if (weather.humidity > maxHumidity) {
        reasons.push("Humidity levels are too high for safe operation.");
    }

    // Determine success rate
    const successRate = reasons.length === 0 ? 100 : Math.max(0, 100 - reasons.length * 20);

    return {
        successRate,
        reasons: reasons.length === 0 ? ["Mission is feasible."] : reasons
    };
};

// Main controller function to handle mission planning
const planMission = async (req, res) => {
    const {
        endurance,
        range,
        payloadCapacity,
        maxSpeed,
        ceiling,
        maxTakeoffWeight,
        width,
        takeoffCoordinates,
        landingCoordinates,
        missionDateTime
    } = req.body;

    try {
        // Calculate distance between takeoff and landing
        const distance = calculateDistance(takeoffCoordinates, landingCoordinates);

        // Fetch weather data for the takeoff coordinates and time
        const weather = await getWeatherData(takeoffCoordinates, missionDateTime);

        if (!weather) {
            return res.status(500).json({ message: "Failed to retrieve weather data." });
        }

        // Evaluate the mission's feasibility based on drone data and weather
        const droneData = { endurance, range, payloadCapacity, maxSpeed, ceiling, maxTakeoffWeight, width };
        const missionEvaluation = evaluateMission(distance, weather, droneData);

        return res.status(200).json({
            success: true,
            distance,
            weather,
            missionEvaluation
        });
    } catch (error) {
        console.error('Error planning mission:', error);
        return res.status(500).json({ message: "Failed to plan mission." });
    }
};

module.exports = {
    planMission
};
