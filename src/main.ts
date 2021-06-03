import express from 'express'

const app: express.Application = express()
app.use(express.json())
// app.use(express.static(path.join(__dirname, '/../../client-dist'))) // Uncomment if applicable

// Example API route
app.get('/api/hello-world', async (req, res) => {
    res.send('Hello World\!')
})

// Example SPA serve route; uncomment if applicable
/* app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/../../client-dist/index.html'))
}) */

app.listen(process.env.PORT || 8080, () => {
    console.log(`Express server launched (port ${process.env.PORT || 8080})`)
})
