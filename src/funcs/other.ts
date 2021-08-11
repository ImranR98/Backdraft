// Various validation and other functions that don't fit elsewhere

import { StandardError } from './errors'

// Ensures the provided object contains all string properties named in the props array
const validateStringArgs = (object: any, props: string[]) => {
  if (typeof object !== 'object') return props
  const notPresent: string[] = []
  props.forEach(prop => {
    if (typeof object[prop] !== 'string') notPresent.push(prop)
  })
  if (notPresent.length > 0) throw new StandardError(1, notPresent)
}

// Ensures required environment variables exist
const ensureEnvVars = () => {
  const envRequirements = ['JWT_AUTH_KEY', 'JWT_EMAIL_VERIFICATION_KEY', 'DB_CONN_STRING', 'STRINGIFIED_NODEMAILER_OPTIONS_JSON', 'SENDER_EMAIL']
  let envValid = true
  for (let i = 0; i < envRequirements.length && envValid; i++) {
    if (typeof process.env[envRequirements[i]] !== 'string') envValid = false
    else if (process.env[envRequirements[i]]?.length === 0) envValid = false
  }
  if (!envValid) throw new Error('One or more environment variables are missing')
  try {
    JSON.parse(<string>process.env.STRINGIFIED_NODEMAILER_OPTIONS_JSON)
  } catch (err) {
    throw new Error('The STRINGIFIED_NODEMAILER_OPTIONS_JSON environment variable is not valid JSON')
  }
}

export { validateStringArgs, ensureEnvVars }