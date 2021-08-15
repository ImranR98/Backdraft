// Environment variable validation and parsing
// Be sure to import and run ensureEnvVars() at the earliest possible point in the app execution

import dotenv from 'dotenv'

// Tell TypeScript that process.env should have these variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      JWT_AUTH_KEY: string
      JWT_EMAIL_VERIFICATION_KEY: string
      DB_CONN_STRING: string
      SENDER_EMAIL: string
      STRINGIFIED_NODEMAILER_OPTIONS_JSON: string
      REFRESH_TOKEN_CLEANUP_1_DAYS: number
      REFRESH_TOKEN_CLEANUP_2_DAYS: number
      ACCESS_TOKEN_DURATION_MINUTES: number
      EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES: number
      PASSWORD_RESET_TOKEN_DURATION_MINUTES: number
    }
  }
}

// Import variables from .env file if it exists
dotenv.config()

// Validate and parse the environment variables as defined in the process.env interface declared above
export const ensureEnvVars = () => {
  ['NODE_ENV', 'JWT_AUTH_KEY', 'JWT_EMAIL_VERIFICATION_KEY', 'DB_CONN_STRING', 'SENDER_EMAIL'].forEach(ev => ensureNonEmptyString(process.env[ev], ev))

  if (!(process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'development' || process.env['NODE_ENV'] === 'test'))
    throw new Error('process.env.NODE_ENV must be either \'production\', \'development\', or \'test\'')

  ensureJSONString(process.env['STRINGIFIED_NODEMAILER_OPTIONS_JSON'], 'STRINGIFIED_NODEMAILER_OPTIONS_JSON')

  process.env.REFRESH_TOKEN_CLEANUP_1_DAYS = parsePositiveNum(process.env['REFRESH_TOKEN_CLEANUP_1_DAYS'], 'REFRESH_TOKEN_CLEANUP_1_DAYS')
  process.env.REFRESH_TOKEN_CLEANUP_2_DAYS = parsePositiveNum(process.env['REFRESH_TOKEN_CLEANUP_2_DAYS'], 'REFRESH_TOKEN_CLEANUP_2_DAYS')
  process.env.ACCESS_TOKEN_DURATION_MINUTES = parsePositiveNum(process.env['ACCESS_TOKEN_DURATION_MINUTES'], 'ACCESS_TOKEN_DURATION_MINUTES')
  process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES = parsePositiveNum(process.env['EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES'], 'EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES')
  process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES = parsePositiveNum(process.env['PASSWORD_RESET_TOKEN_DURATION_MINUTES'], 'PASSWORD_RESET_TOKEN_DURATION_MINUTES')
}

// Validation helpers used above
const ensureNonEmptyString = (value: any, name: string | null = null) => {
  if (!(typeof value === 'string' && value.length > 0)) throw new Error(`${name ? `${name}` : 'Variable'} is not a string`)
}
const ensureJSONString = (value: any, name: string | null = null) => {
  let valid = false
  if (typeof value === 'string') {
    try {
      JSON.parse(value)
      valid = true
    } catch { }
  }
  if (!valid) throw new Error(`${name ? `${name}` : 'Variable'} is not a JSON string`)
  return value
}
const parsePositiveNum = (value: any, name: string | null = null) => {
  if (typeof value === 'string') {
    try {
      value = Number.parseFloat(value)
    } catch { }
  }
  if (!(typeof value === 'number' && value > 0)) throw new Error(`Failed to parse${name ? ` ${name} ` : ' '}as a positive number`)
  return value
}