// User model for MongoDB

import mongoose from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'

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
  }
})


// Hash the password before saving a new User to the DB
userSchema.pre('save', async (next) => {
  const salt = await bcrypt.genSalt();
  (<any>this).password = await bcrypt.hash((<any>this).password, salt)
  next()
})

// Add a static login function to this model
userSchema.statics.login = async (email, password) => {
  const user = await (<any>this).findOne({ email })
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