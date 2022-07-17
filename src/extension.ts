import * as vscode from 'vscode'
import { getIncomingCallNode, getOutgoingCallNode } from './call'
import { generateDot } from './dot'
import { getHtmlContent } from './html'
import * as path from 'path'
import * as fs from 'fs'

export const output = vscode.window.createOutputChannel('CallGraph')

const getDefaultProgressOptions = (title: string): vscode.ProgressOptions => {
    return {
        location: vscode.ProgressLocation.Notification,
        title: title,
        cancellable: false
    }
}

const generateGraph = (
    callNodeFunction: Function,
    dotFile: vscode.Uri,
    staticDir: string,
    onReceiveMsg: any
 ) => {
    return async () => {
        const activeTextEditor = vscode.window.activeTextEditor!
        const entry: vscode.CallHierarchyItem[] =
            await vscode.commands.executeCommand(
                'vscode.prepareCallHierarchy',
                activeTextEditor.document.uri,
                activeTextEditor.selection.active
            )
        if (!entry || !entry[0]) {
            const msg = "Can't resolve entry function"
            vscode.window.showErrorMessage(msg)
            throw new Error(msg)
        }
        const graph = await callNodeFunction(
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
}


export function activate(context: vscode.ExtensionContext) {
    const staticDir = path.resolve(context.extensionPath, 'static')
    if(!fs.existsSync(staticDir))fs.mkdirSync(staticDir)
    const workspace = vscode.workspace.workspaceFolders?.[0].uri!
    const dotFile = vscode.Uri.file(path.resolve(staticDir, 'graph_data.dot'))
    const onReceiveMsg = (msg: any) => {
        const existed = (p: string) =>
            vscode.window.showErrorMessage(`Already exists.\n${p} `)

        if (msg.command === 'download') {
            const dir = vscode.workspace
                .getConfiguration()
                .get<string>('call-graph.saveDir')
                ?.replace('${workspace}', workspace.fsPath)
            let f = dir ? vscode.Uri.file(dir) : workspace
            if (!fs.existsSync(f.fsPath))
                fs.mkdirSync(f.fsPath, { recursive: true })

            switch (msg.type) {
                case 'dot':
                    f = vscode.Uri.joinPath(f, 'call_graph.dot')
                    if (!fs.existsSync(f.fsPath)) {
                        fs.copyFileSync(dotFile.fsPath, f.fsPath)
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
    const incomingDisposable = vscode.commands.registerCommand(
        'CallGraph.showIncomingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                generateGraph(getIncomingCallNode, dotFile, staticDir, onReceiveMsg)
            )
        }
    )
    const outgoingDisposable = vscode.commands.registerCommand(
        'CallGraph.showOutgoingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                generateGraph(getOutgoingCallNode, dotFile, staticDir, onReceiveMsg)
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

    context.subscriptions.push(incomingDisposable)
    context.subscriptions.push(outgoingDisposable)
}
