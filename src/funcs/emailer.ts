// Functions related to sending emails

import nodemailer from 'nodemailer'
import logger from './logger'

// Creates a nodemailer transport or test transport
const createTransport = async () => {
    if (process.env.NODE_ENV === 'test') {
        const testAccount = await nodemailer.createTestAccount()
        // logger.debug(`Ethereal Email account info: User: ${testAccount.user}, Pass: ${testAccount.pass}`)
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
        from: process.env.SENDER_EMAIL,
        to, subject, text, html
    })
}

export { createTransport, sendEmail }