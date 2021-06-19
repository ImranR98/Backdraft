// Example request handlers
import express from 'express'

// Hello World
const helloWorld = async (req: express.Request, res: express.Response) => {
    res.send('Hello World\!')
}

// Protected
const protectedRoute = async (req: express.Request, res: express.Response) => {
    res.send('You are accessing a protected route\!')
}

export default { helloWorld, protectedRoute }