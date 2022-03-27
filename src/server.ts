// @ts-ignore
import * as connect from 'connect'
import * as sirv from 'sirv'
import * as path from 'path'
import * as http from 'http'

export async function startServer(hostname: string, port: number) {
    const app = new connect()
    // @ts-ignore
    app.use('/', sirv(path.resolve(__dirname, '../static'), { dev: true }))
    http.createServer(app).listen(port, hostname)
    console.log(`webpage server: http://${hostname}:${port}`)
}
