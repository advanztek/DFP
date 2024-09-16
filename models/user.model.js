const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: Number, default: 1 },
    createdAt: { type: Number, default: Date.now },
    updatedAt: { type: Number, default: Date.now },
});

module.exports = mongoose.model("User", userSchema, 'users');
