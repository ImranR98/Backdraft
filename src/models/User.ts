// User model for MongoDB

// Module imports
import mongoose from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'

// Define refresh token schema
const refreshTokenSchema = new mongoose.Schema()

// Define schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email not provided.'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email is invalid.']
  },
  password: {
    type: String,
    required: [true, 'Password not provided.'],
    minlength: [6, 'Password must be at least 12 characters.'],
  },
  refreshTokens: {
    type: [{
      refreshToken: {
        type: String,
        required: [true, 'Refresh token not provided.'],
      },
      ip: {
        type: String,
        required: [true, 'IP not provided.'],
      },
      userAgent: {
        type: String,
        required: [true, 'User agent not provided.']
      }
    }]
  }
})

// Hash the password before saving a new User to the DB
userSchema.pre('save', async function (this: any, next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Add a static login function to the schema
userSchema.statics.login = async function (this: any, email, password) {
  const user = await this.findOne({ email })
  if (user) {
    const auth = await bcrypt.compare(password, user.password)
    if (auth) {
      return user
    }
    throw Error('Incorrect password.')
  }
  throw Error('Email not found.')
}

// Define and export the model
const User = mongoose.model('user', userSchema)
export default User