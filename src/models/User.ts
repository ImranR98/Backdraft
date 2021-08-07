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

// Define pending verification sub-schema
// If not null, user has a pending email change yet to be verified
// If email in this sub-schema is the same as the main user email, then the user is a new signup and even their current email has never been verified
const pendingVerificationSchema = new mongoose.Schema({
  email: String,
  key: String
})


// Define user schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email not provided'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email is invalid']
  },
  password: {
    type: String,
    required: [true, 'Password not provided'],
  },
  refreshTokens: [refreshTokenSchema],
  pendingVerification: pendingVerificationSchema
})

// Define and export the model
const User = mongoose.model('user', userSchema)
export default User