const User = require("../models/user.model");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Joi = require('joi');
require('dotenv').config();

const userSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email must be a valid email address',
        'string.empty': 'Email cannot be empty',
        'any.required': 'Email is required'
    }),
    password: Joi.string()
        .pattern(new RegExp('^[a-zA-Z0-9@#\$%\^&\*\(\)]{3,30}$'))
        .required()
        .messages({
            'string.pattern.base': 'Password must be 3-30 characters long and include only alphanumeric characters or @#$%^&*()',
            'string.empty': 'Password cannot be empty',
            'any.required': 'Password is required'
        }),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email must be a valid email address',
        'string.empty': 'Email cannot be empty',
        'any.required': 'Email is required'
    }),
    password: Joi.string()
        .pattern(new RegExp('^[a-zA-Z0-9@#\$%\^&\*\(\)]{3,30}$'))
        .required()
        .messages({
            'string.pattern.base': 'Password must be 3-30 characters long and include only alphanumeric characters or @#$%^&*()',
            'string.empty': 'Password cannot be empty',
            'any.required': 'Password is required'
        })
});

const passwordSchema = Joi.object({
    password: Joi.string()
        .pattern(new RegExp('^[a-zA-Z0-9@#\$%\^&\*\(\)]{3,30}$'))
        .required()
        .messages({
            'string.pattern.base': 'Password must be 3-30 characters long and include only alphanumeric characters or @#$%^&*()',
            'string.empty': 'Password cannot be empty',
            'any.required': 'Password is required'
        })
});

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        // Validate user input
        const { error } = await loginSchema.validateAsync({ email, password });

        if (error) {
            throw new Error(error.details.map(d => d.message).join(', '));
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Compare passwords
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            throw new Error('Invalid email or password');
        }

        // Generate JWT token with user data in payload
        const accessToken = jwt.sign({ id: user._id, email: user.email }, process.env.SECRET, {
            algorithm: 'HS256',
            expiresIn: process.env.TOKEN_EXPIRATION_TIME,
        });
        user.password = null
        res.status(200).json({ user, accessToken, message: 'Login successful', success: true });
    } catch (err) {
        console.error('Error logging in user:', err);
        res.status(400).json({ message: err.message });
    }
}

async function registerUser(req, res) {
    try {
        const { email, password } = req.body;

        // Validate user input
        const { error } = await userSchema.validateAsync({ email, password });

        if (error) {
            throw new Error(error.details.map(d => d.message).join(', '));
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Email is already registered');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            password: hashedPassword,
            role: 1,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime(),
        });

        const user = await newUser.save();
        delete user.password
        delete user.activityPassword

        // Generate JWT token with user data in payload
        const accessToken = jwt.sign({ id: user._id, email: user.email }, process.env.SECRET, {
            algorithm: 'HS256',
            expiresIn: process.env.TOKEN_EXPIRATION_TIME,
        });

        res.status(201).json({ user, accessToken, message: 'Account creation successful', success: true });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(400).json({ message: err.message });
    }
}

async function updatePassword(req, res) {
    try {
        const { password } = req.body;

        // Validate input
        const { error } = await passwordSchema.validateAsync({ password });
        if (error) {
            throw new Error(error.details.map(d => d.message).join(', '));
        }

        // Find user by ID
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new Error('User not found');
        }

        // Hash the activity password
        const newPassword = await bcrypt.hash(password, 10);

        // Update user with new activity password
        user.password = newPassword;
        user.updatedAt = new Date().getTime();

        await user.save();

        res.status(200).json({ message: 'Account password updated successfully', success: true });
    } catch (err) {
        console.error('Error setting/updating activity password:', err);
        res.status(400).json({ message: err.message });
    }
}

module.exports = { loginUser, registerUser, updatePassword };
