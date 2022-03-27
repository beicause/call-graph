import * as vscode from 'vscode'
import { getCallNode } from './call'
import { generateDot } from './dot'
import { startServer } from './server'
import * as path from 'path'

export function activate(context: vscode.ExtensionContext) {
	const serverConfig = vscode.workspace.getConfiguration('call-graph.server')
	const host = serverConfig.get<string>('host')!
	const port = serverConfig.get<number>('port')!

	const disposable = vscode.commands.registerCommand('CallGraph.showCallGraph', async () => {
		vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'generate call graph', cancellable: false }, async () => {
			const activeTextEditor = vscode.window.activeTextEditor!
			console.log(activeTextEditor.document.uri, activeTextEditor.selection.active);

			const entry: vscode.CallHierarchyItem[] = await vscode.commands.executeCommand(
				'vscode.prepareCallHierarchy',
				activeTextEditor.document.uri,
				activeTextEditor.selection.active
			)
			const graph = await getCallNode(vscode.workspace.workspaceFolders![0].uri.toString(), entry[0])
			const dotDir = vscode.workspace.getConfiguration().get<string>('dotDir')
			generateDot(graph, dotDir ? path.resolve(dotDir, new Date().getTime() + '.dot') : undefined)
			vscode.env.openExternal(vscode.Uri.parse(`http://${host}:${port}`))
		})
	});
	startServer(host,port)
	context.subscriptions.push(disposable)
}

export function deactivate() { }
