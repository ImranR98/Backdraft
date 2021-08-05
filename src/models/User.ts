// User model for MongoDB
// Contains minimal logic aside from basic data validation

import mongoose from 'mongoose'
import validator from 'validator'

// Define refresh token sub-schema
// No use setting required validators as these are ignored when the sub-schema is in an array, as it is below
const refreshTokenSchema = new mongoose.Schema({
  refreshToken: String,
  ip: String,
  userAgent: String,
  date: Date
})

// Define user schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email not provided'],
    index: { unique: true, sparse: true },
    lowercase: true,
    validate: [validator.isEmail, 'Email is invalid']
  },
  password: {
    type: String,
    required: [true, 'Password not provided'],
  },
  refreshTokens: [refreshTokenSchema]
})

// Define and export the model
const User = mongoose.model('user', userSchema)
export default User