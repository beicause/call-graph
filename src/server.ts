// @ts-ignore
import * as connect from 'connect'
import * as sirv from 'sirv'
import * as path from 'path'
import * as http from 'http'
import { output } from './extension'

export async function startServer(hostname: string, port: number) {
    const app = new connect()
    // @ts-ignore
    app.use('/', sirv(path.resolve(__dirname, '../static'), { dev: true }))
    http.createServer(app).listen(port, hostname)
    output.appendLine(`webpage server: http://${hostname}:${port}`)
}
