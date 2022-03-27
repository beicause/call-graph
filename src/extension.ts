import * as vscode from 'vscode'
import { getCallNode } from './call'
import { generateDot } from './dot';
import {startServer} from './server'

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "call-graph" is now active!');

	const disposable = vscode.commands.registerCommand('CallGraph.showCallGraph', async () => {
		const activeTextEditor = vscode.window.activeTextEditor!
		console.log(activeTextEditor.document.uri, activeTextEditor.selection.active);

		const entry: vscode.CallHierarchyItem[] = await vscode.commands.executeCommand(
			'vscode.prepareCallHierarchy',
			activeTextEditor.document.uri,
			activeTextEditor.selection.active
		)
		console.log(entry)
		const graph = await getCallNode(vscode.workspace.workspaceFolders![0].uri.toString(),entry[0])
		generateDot(graph)
	});
	startServer('127.0.0.1',8080)
	context.subscriptions.push(disposable)
}

export function deactivate() { }
