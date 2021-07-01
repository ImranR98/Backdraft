// Various helper functions that don't fit elsewhere

import https from 'https'

const simpleHttpGet = (url: string) => {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = ''
            resp.on('data', (chunk) => {
                data += chunk
            })
            resp.on('end', () => {
                resolve(JSON.parse(data))
            })
        }).on("error", (err) => {
            reject(err)
        })
    })
}

export { simpleHttpGet }