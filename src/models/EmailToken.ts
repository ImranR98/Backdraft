// Email Token model for MongoDB

import mongoose from 'mongoose'
import validator from 'validator'

// Define email token schema
const emailTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email not provided'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email is invalid']
  },
  user: {
    type: mongoose.mongo.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  verificationKey: {
    type: String,
    required: true,
    unique: true
  }
})

// Define and export the model
const EmailToken = mongoose.model('emailToken', emailTokenSchema)
export default EmailToken