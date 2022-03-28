import * as vscode from 'vscode'
import { getCallNode } from './call'
import { generateDot } from './dot'
import { startServer } from './server'
import * as path from 'path'
import * as fs from 'fs'

export const output = vscode.window.createOutputChannel('CallGraph')

export function activate(context: vscode.ExtensionContext) {
	const serverConfig = vscode.workspace.getConfiguration('call-graph.server')
	const host = serverConfig.get<string>('host')!
	const port = serverConfig.get<number>('port')!

	const disposable = vscode.commands.registerCommand('CallGraph.showCallGraph', async () => {
		vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Call Graph: generate call graph', cancellable: false }, async () => {
			const activeTextEditor = vscode.window.activeTextEditor!
			const entry: vscode.CallHierarchyItem[] = await vscode.commands.executeCommand(
				'vscode.prepareCallHierarchy',
				activeTextEditor.document.uri,
				activeTextEditor.selection.active
			)
			if (!entry || !entry[0]) {
				const msg = 'Call Graph: can\'t resolve entry function'
				vscode.window.showErrorMessage(msg)
				throw new Error(msg)
			}
			const graph = await getCallNode(vscode.workspace.workspaceFolders![0].uri.toString(), entry[0])			
			const dotDir = vscode.workspace.getConfiguration().get<string>('call-graph.dotDir')
			if (dotDir && !fs.existsSync(dotDir)) fs.mkdirSync(dotDir, { recursive: true })
			generateDot(graph, dotDir ? path.resolve(dotDir, new Date().getTime() + '.dot') : undefined)
			if (serverConfig.get<boolean>('open')) vscode.env.openExternal(vscode.Uri.parse(`http://${host}:${port}`))
		})
	});
	try { startServer(host, port) } catch (err) {
		vscode.window.showErrorMessage(JSON.stringify(err))
	}
	context.subscriptions.push(disposable)
}
