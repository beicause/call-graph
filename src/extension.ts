import * as vscode from 'vscode'
import { getCallNode } from './call'
import { generateDot } from './dot'
import { getHtmlContent } from './html'
import * as path from 'path'
import * as fs from 'fs'

export const output = vscode.window.createOutputChannel('CallGraph')

export function activate(context: vscode.ExtensionContext) {
	const staticDir = path.resolve(context.extensionPath, 'static')
	const workspace = vscode.workspace.workspaceFolders?.[0].uri!
	const dotFile = path.resolve(staticDir, 'graph_data.dot')
	const onReceiveMsg=(msg:any) => {
		const workspacePath = (s: string) => path.resolve(workspace.path, s)
		const existed = () => {
			vscode.window.showErrorMessage(`fail to save. file 'call_graph.{dot,svg}' already exists`)
		}
		if (msg.command === 'download') {
			let f = ''
			switch (msg.type) {
				case 'dot':
					f = workspacePath('call_graph.dot')
					if (!fs.existsSync(f)) {
						fs.copyFileSync(dotFile, f)
						vscode.window.showInformationMessage(f)
					} else existed()
					break
				case 'svg':
					f = workspacePath('call_graph.svg')
					if (!fs.existsSync(f)) {
						fs.writeFileSync(f, msg.data)
						vscode.window.showInformationMessage(f)
					} else existed()
					break
			}
		}
	}
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
			generateDot(graph)

			const panel = vscode.window.createWebviewPanel('CallGraph.preview', 'Call Graph', vscode.ViewColumn.Beside,
				{
					localResourceRoots: [vscode.Uri.file(staticDir)],
					enableScripts: true
				}
			)
			const dotFileUri = panel.webview.asWebviewUri(vscode.Uri.file(dotFile)).toString()
			panel.webview.html = getHtmlContent(dotFileUri)
			panel.webview.onDidReceiveMessage(onReceiveMsg)
		})
	})

	vscode.window.registerWebviewPanelSerializer('CallGraph.preview', {
		async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: string) {
			if (!state) {
				vscode.window.showErrorMessage('CallGraph: fail to load previous state')
				return
			}
			webviewPanel.webview.html = getHtmlContent(state)
			webviewPanel.webview.onDidReceiveMessage(onReceiveMsg)
		}
	})

	context.subscriptions.push(disposable)
}
