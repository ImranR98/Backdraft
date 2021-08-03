// Functions related to sending emails

import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

// Import env. vars (assumes they exist; should have been checked on server start)
dotenv.config()

// Creates a nodemailer transport or test transport
const createTransport = async () => {
    if (process.env.NODE_ENV === 'test') {
        const testAccount = await nodemailer.createTestAccount()
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        })
    } else {
        return nodemailer.createTransport(JSON.parse(process.env.STRINGIFIED_NODEMAILER_OPTIONS_JSON || ''))
    }
}

// Send an email
const sendEmail = async (to: string, subject: string, text: string, html: string) => {
    await (await createTransport()).sendMail({
        from: process.env.EMAIL_SENDER,
        to, subject, text, html
    })
}

export { createTransport, sendEmail }