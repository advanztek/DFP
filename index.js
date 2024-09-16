require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

const port = process.env.PORT || 8080;

// Rate limiter setup
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // limit each IP to 500 requests per windowMs
});

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'activitypassword'],
}));


const mongoUri = `mongodb+srv://advanztek:${process.env.MONGO_PASS}@cluster0.wbs4e.mongodb.net/dfp_db?retryWrites=true&w=majority&appName=Cluster0`

// Connect to MongoDB
mongoose.connect(mongoUri)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

app.use(bodyParser.json({ limit: `${process.env.REQUEST_SIZE_LIMIT}mb` }));
app.use(bodyParser.urlencoded({ limit: `${process.env.REQUEST_SIZE_LIMIT}mb`, extended: true }));

app.use(limiter);

// Serve static files from the 'uploads' directory
app.use('/assets', express.static(`./assets`));

const APP_VERSION = "V1"

const appRoute = require("./routes/drone.route");
const authRoute = require("./routes/auth.route");

app.use(`/${APP_VERSION}/drone`, appRoute);
app.use(`/${APP_VERSION}/auth`, authRoute);

// Health check
app.get("/health", (req, res) => {
    console.log("Health check");
    res.status(200).json({ message: "Server is running." });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}. | http://localhost:${port}/`)
})