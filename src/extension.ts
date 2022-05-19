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
    const dotFile = vscode.Uri.file(path.resolve(staticDir, 'graph_data.dot'))
    const onReceiveMsg = (msg: any) => {
        const existed = (p: string) =>
            vscode.window.showErrorMessage(`Already exists.\n${p} `)

        if (msg.command === 'download') {
            let f = workspace
            switch (msg.type) {
                case 'dot':
                    f = vscode.Uri.joinPath(f, 'call_graph.dot')
                    if (!fs.existsSync(f.fsPath)) {
                        vscode.workspace.fs.copy(dotFile, f)
                        vscode.window.showInformationMessage(f.fsPath)
                    } else existed(f.fsPath)
                    break
                case 'svg':
                    f = vscode.Uri.joinPath(f, 'call_graph.svg')
                    if (!fs.existsSync(f.fsPath)) {
                        fs.writeFileSync(f.fsPath, msg.data)
                        vscode.window.showInformationMessage(f.fsPath)
                    } else existed(f.fsPath)
                    break
            }
        }
    }
    const disposable = vscode.commands.registerCommand(
        'CallGraph.showCallGraph',
        async () => {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Call Graph: generate call graph',
                    cancellable: false
                },
                async () => {
                    const activeTextEditor = vscode.window.activeTextEditor!
                    const entry: vscode.CallHierarchyItem[] =
                        await vscode.commands.executeCommand(
                            'vscode.prepareCallHierarchy',
                            activeTextEditor.document.uri,
                            activeTextEditor.selection.active
                        )
                    if (!entry || !entry[0]) {
                        const msg = "Call Graph: can't resolve entry function"
                        vscode.window.showErrorMessage(msg)
                        throw new Error(msg)
                    }
                    const graph = await getCallNode(
                        vscode.workspace.workspaceFolders![0].uri.toString(),
                        entry[0]
                    )
                    generateDot(graph, dotFile.fsPath)

                    const panel = vscode.window.createWebviewPanel(
                        'CallGraph.preview',
                        'Call Graph',
                        vscode.ViewColumn.Beside,
                        {
                            localResourceRoots: [vscode.Uri.file(staticDir)],
                            enableScripts: true
                        }
                    )
                    const dotFileUri = panel.webview
                        .asWebviewUri(dotFile)
                        .toString()
                    panel.webview.html = getHtmlContent(dotFileUri)
                    panel.webview.onDidReceiveMessage(onReceiveMsg)
                }
            )
        }
    )

    vscode.window.registerWebviewPanelSerializer('CallGraph.preview', {
        async deserializeWebviewPanel(
            webviewPanel: vscode.WebviewPanel,
            state: string
        ) {
            if (!state) {
                vscode.window.showErrorMessage(
                    'CallGraph: fail to load previous state'
                )
                return
            }
            webviewPanel.webview.html = getHtmlContent(state)
            webviewPanel.webview.onDidReceiveMessage(onReceiveMsg)
        }
    })

    context.subscriptions.push(disposable)
}
