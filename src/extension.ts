import * as vscode from 'vscode'
import {
    CallHierarchyNode,
    getIncomingCallNode,
    getOutgoingCallNode
} from './call'
import { generateDot } from './dot'
import { getHtmlContent } from './html'
import * as path from 'path'
import * as fs from 'fs'
import * as pm from 'picomatch'

export const output = vscode.window.createOutputChannel('CallGraph')

const getDefaultProgressOptions = (title: string): vscode.ProgressOptions => {
    return {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
    }
}

const generateGraph = (
    type: 'Incoming' | 'Outgoing',
    callNodeFunction: (
        entryItem: vscode.CallHierarchyItem,
        ignore: (item: vscode.CallHierarchyItem) => boolean
    ) => Promise<CallHierarchyNode>,
    dotFile: vscode.Uri,
    staticDir: string,
    onReceiveMsg: (msg: any) => void
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
        const workspace = vscode.workspace.workspaceFolders?.[0].uri!
        let ignoreFile: string | null =
            vscode.workspace
                .getConfiguration()
                .get<string>('call-graph.ignoreFile')
                ?.replace('${workspace}', workspace.fsPath) ?? null

        if (ignoreFile && !fs.existsSync(ignoreFile)) ignoreFile = null
        const graph = await callNodeFunction(entry[0], item => {
            if (ignoreFile === null) return false
            const patterns = fs
                .readFileSync(ignoreFile)
                .toString()
                .split('\n')
                .filter(str => str.length > 0)
                .map(str => path.resolve(workspace.fsPath, str))
            return pm(patterns)(item.uri.fsPath)
        })

        generateDot(graph, dotFile.fsPath)

        const webviewType = `CallGraph.preview${type}`
        const panel = vscode.window.createWebviewPanel(
            webviewType,
            `Call Graph ${type}`,
            vscode.ViewColumn.Beside,
            {
                localResourceRoots: [vscode.Uri.file(staticDir)],
                enableScripts: true
            }
        )
        const dotFileUri = panel.webview.asWebviewUri(dotFile).toString()
        panel.webview.html = getHtmlContent(dotFileUri)
        panel.webview.onDidReceiveMessage(onReceiveMsg)
    }
}
const registerWebviewPanelSerializer = (
    webViewType: string,
    onReceiveMsg: (msg: any) => void
) => {
    vscode.window.registerWebviewPanelSerializer(webViewType, {
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
}

export function activate(context: vscode.ExtensionContext) {
    const staticDir = path.resolve(context.extensionPath, 'static')
    if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir)
    const workspace = vscode.workspace.workspaceFolders?.[0].uri!
    const dotFileOutgoing = vscode.Uri.file(
        path.resolve(staticDir, 'graph_data_outgoing.dot')
    )
    const dotFileIncoming = vscode.Uri.file(
        path.resolve(staticDir, 'graph_data_incoming.dot')
    )
    const onReceiveMsg = (type: 'Incoming' | 'Outgoing') => (msg: any) => {
        const savedName =
            type === 'Incoming' ? 'call_graph_incoming' : 'call_graph_outgoing'
        const dotFile = type === 'Incoming' ? dotFileIncoming : dotFileOutgoing
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
                    f = vscode.Uri.joinPath(f, `${savedName}.dot`)
                    if (!fs.existsSync(f.fsPath)) {
                        fs.copyFileSync(dotFile.fsPath, f.fsPath)
                        vscode.window.showInformationMessage(f.fsPath)
                    } else existed(f.fsPath)
                    break
                case 'svg':
                    f = vscode.Uri.joinPath(f, `${savedName}.svg`)
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
                generateGraph(
                    'Incoming',
                    getIncomingCallNode,
                    dotFileIncoming,
                    staticDir,
                    onReceiveMsg('Incoming')
                )
            )
        }
    )
    const outgoingDisposable = vscode.commands.registerCommand(
        'CallGraph.showOutgoingCallGraph',
        async () => {
            vscode.window.withProgress(
                getDefaultProgressOptions('Generate call graph'),
                generateGraph(
                    'Outgoing',
                    getOutgoingCallNode,
                    dotFileOutgoing,
                    staticDir,
                    onReceiveMsg('Outgoing')
                )
            )
        }
    )
    registerWebviewPanelSerializer(
        `CallGraph.previewIncoming`,
        onReceiveMsg('Incoming')
    )
    registerWebviewPanelSerializer(
        'CallGraph.previewOutgoing',
        onReceiveMsg('Outgoing')
    )
    context.subscriptions.push(incomingDisposable)
    context.subscriptions.push(outgoingDisposable)
}
