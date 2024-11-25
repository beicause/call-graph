import * as vscode from 'vscode'
import {
    CallHierarchyNode,
    getIncomingCallNode,
    getOutgoingCallNode,
} from './call'
import { generateDot } from './dot'
import * as path from 'path'
import * as fs from 'fs'
import ignore from 'ignore'

export const output = vscode.window.createOutputChannel('CallGraph')

const getDefaultProgressOptions = (title: string): vscode.ProgressOptions => {
    return {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true,
    }
}

const getHtmlContent = (staticDir: string, dotFileUri: string) => {
    return fs
        .readFileSync(path.resolve(staticDir, 'index.html'))
        .toString()
        .replaceAll('$DOT_FILE_URI', dotFileUri)
}
const generateGraph = (
    type: 'Incoming' | 'Outgoing',
    callNodeFunction: (
        entryItem: vscode.CallHierarchyItem,
        ignore: (item: vscode.CallHierarchyItem) => boolean,
    ) => Promise<CallHierarchyNode>,
    dotFile: vscode.Uri,
    staticDir: string,
    onReceiveMsg: (msg: WebviewMsg) => void,
) => {
    return async () => {
        const activeTextEditor = vscode.window.activeTextEditor
        if (!activeTextEditor) {
            vscode.window.showErrorMessage("Can't get active text editor")
            return
        }

        const entry: vscode.CallHierarchyItem[] =
            await vscode.commands.executeCommand(
                'vscode.prepareCallHierarchy',
                activeTextEditor.document.uri,
                activeTextEditor.selection.active,
            )
        if (!entry || !entry[0]) {
            vscode.window.showErrorMessage("Can't resolve entry function")
            return
        }

        const workspace = vscode.workspace.workspaceFolders?.[0].uri
        if (!workspace) {
            vscode.window.showErrorMessage("Can't get workspace uri")
            return
        }

        let ignoreFile: string | null =
            vscode.workspace
                .getConfiguration()
                .get<string>('call-graph.ignoreFile')
                ?.replace('${workspace}', workspace.fsPath) ?? null

        if (ignoreFile && !fs.existsSync(ignoreFile)) ignoreFile = null
        const graph = await callNodeFunction(entry[0], item => {
            if (ignoreFile === null) return false
            // working in the current workspace
            if (!item.uri.fsPath.startsWith(workspace.fsPath)) return true
            const ig = ignore().add(fs.readFileSync(ignoreFile).toString())
            const itemPath = item.uri.path.replace(`${workspace.path}/`, '')
            const ignored = ig.test(itemPath).ignored
            return ignored
        })

        generateDot(graph, dotFile.fsPath)

        const webviewType = `CallGraph.preview${type}`
        const panel = vscode.window.createWebviewPanel(
            webviewType,
            `Call Graph ${type}`,
            vscode.ViewColumn.Beside,
            {
                localResourceRoots: [vscode.Uri.file(staticDir)],
                enableScripts: true,
            },
        )
        const dotFileUri = panel.webview.asWebviewUri(dotFile).toString()
        panel.webview.html = getHtmlContent(staticDir, dotFileUri)
        panel.webview.onDidReceiveMessage(onReceiveMsg)
    }
}

interface WebviewMsg {
    command: string
    type: 'dot' | 'svg'
    data: string
}

const registerWebviewPanelSerializer = (
    staticDir: string,
    webViewType: string,
    onReceiveMsg: (msg: WebviewMsg) => void,
) => {
    vscode.window.registerWebviewPanelSerializer(webViewType, {
        async deserializeWebviewPanel(
            webviewPanel: vscode.WebviewPanel,
            state: string,
        ) {
            if (!state) {
                vscode.window.showErrorMessage(
                    'CallGraph: fail to load previous state',
                )
                return
            }
            webviewPanel.webview.html = getHtmlContent(staticDir, state)
            webviewPanel.webview.onDidReceiveMessage(onReceiveMsg)
        },
    })
}

export function activate(context: vscode.ExtensionContext) {
    const staticDir = path.resolve(context.extensionPath, 'static')
    if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir)

    const workspace = vscode.workspace.workspaceFolders?.[0].uri
    if (!workspace) {
        vscode.window.showErrorMessage("Can't get workspace uri")
        return
    }

    const dotFileOutgoing = vscode.Uri.file(
        path.resolve(staticDir, 'graph_data_outgoing.dot'),
    )
    const dotFileIncoming = vscode.Uri.file(
        path.resolve(staticDir, 'graph_data_incoming.dot'),
    )
    const onReceiveMsgFactory =
        (type: 'Incoming' | 'Outgoing') => (msg: WebviewMsg) => {
            const savedName =
                type === 'Incoming'
                    ? 'call_graph_incoming'
                    : 'call_graph_outgoing'
            if (msg.command === 'download') {
                const onDowload = async (fileType: 'dot' | 'svg') => {
                    const f = await vscode.window.showSaveDialog({
                        filters:
                            fileType === 'svg'
                                ? { Image: ['svg'] }
                                : { Graphviz: ['dot', 'gv'] },
                        defaultUri: vscode.Uri.joinPath(
                            workspace,
                            `${savedName}.${fileType}`,
                        ),
                    })
                    if (!f) return
                    fs.writeFileSync(f.fsPath, msg.data)
                    vscode.window.showInformationMessage(
                        'Call Graph file saved: ' + f.fsPath,
                    )
                }
                onDowload(msg.type)
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
                    onReceiveMsgFactory('Incoming'),
                ),
            )
        },
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
                    onReceiveMsgFactory('Outgoing'),
                ),
            )
        },
    )
    registerWebviewPanelSerializer(
        staticDir,
        `CallGraph.previewIncoming`,
        onReceiveMsgFactory('Incoming'),
    )
    registerWebviewPanelSerializer(
        staticDir,
        'CallGraph.previewOutgoing',
        onReceiveMsgFactory('Outgoing'),
    )
    context.subscriptions.push(incomingDisposable)
    context.subscriptions.push(outgoingDisposable)
}
