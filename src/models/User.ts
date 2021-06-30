// User model for MongoDB

// Module imports
import mongoose from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

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
  refreshTokens: [refreshTokenSchema]
})

// Hash the password before saving a new User to the DB
userSchema.pre('save', async function (this, next) {
  const salt = await bcrypt.genSalt();
  this.set('password', await bcrypt.hash(this.get('password'), salt))
  next()
})

// Static login function
userSchema.statics.login = async function (this, email, password, ip, userAgent) {
  const refreshToken = crypto.randomBytes(64).toString('hex')
  const user = await this.findOne({ email })
  if (user) {
    const auth = await bcrypt.compare(password, user.password)
    if (auth) {
      await this.updateOne({ _id: user._id }, {
        $push: { refreshTokens: { refreshToken, ip, userAgent, date: new Date() } }
      })
      // Get rid of any refresh token that hasn't been used in 30 days and is from the same IP and user-agent combo
      let lastMonth = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 30.44)
      await this.updateOne({ _id: user._id }, {
        $pull: { refreshTokens: { ip, userAgent, date: { $lt: lastMonth } } },
      })
      // Get rid of any refresh tokens that haven't been used in a year, regardless of IP or user-agent combo
      let lastYear = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 365.2425)
      await this.updateOne({ _id: user._id }, {
        $pull: { refreshTokens: { date: { $lt: lastYear } } },
      })
      return { user, refreshToken }
    }
    throw Error('Password is incorrect.')
  }
  throw Error('Email not found.')
}

// Satic revoke token function (could have been done without email, but this is more efficient)
userSchema.statics.revokeRefreshToken = async function (this, email, _id) {
  await this.updateOne({ email }, { $pull: { refreshTokens: { _id } } })
}

// Static validate refresh token function (updates the token as well)
userSchema.statics.validateRefreshToken = async function (this, refreshToken, ip, userAgent) {
  const user = await this.findOne({ refreshTokens: { refreshToken } })
  if (user) {
    // Update the refresh token last used date, along with IP and user agent (although those are likely unchanged)
    await this.updateOne({ _id: user._id, refreshTokens: { refreshToken } },
      { $set: { "refreshTokens.$.ip": ip, "refreshTokens.$.userAgent": userAgent, "refreshTokens.$.date": new Date() } })
    return user._id
  } else throw Error('Refresh token is invalid.')
}

// Define and export the model
const User = mongoose.model('user', userSchema)
export default User