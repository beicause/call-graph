import * as vscode from 'vscode'
import { CallHierarchyItem } from 'vscode'
import { output } from './extension'

export interface CallHierarchyNode {
    item: CallHierarchyItem
    children: CallHierarchyNode[]
}

async function getCallNode(
    entryItem: CallHierarchyItem,
    ignore: (item: vscode.CallHierarchyItem) => boolean,
    outgoing: Boolean = true
) {
    const command = outgoing
        ? 'vscode.provideOutgoingCalls'
        : 'vscode.provideIncomingCalls'
    const nodes = new Set<CallHierarchyNode>()
    const insertNode = async (node: CallHierarchyNode) => {
        output.appendLine('resolve: ' + node.item.name)
        nodes.add(node)
        const calls:
            | vscode.CallHierarchyOutgoingCall[]
            | vscode.CallHierarchyIncomingCall[] =
            await vscode.commands.executeCommand(command, node.item)

        if (calls.length === 0 && node.item.name.length > 7) {
            const subStr = node.item.name.substring(node.item.name.length - 7)
            if (subStr === '.func()') {
                let exes: any = await vscode.commands.executeCommand(
                    'vscode.executeDocumentSymbolProvider',
                    node.item.uri
                )
                for (const exe of exes) {
                    if (exe.range.contains(node.item.range)) {
                        let methods: vscode.CallHierarchyItem[] =
                            await vscode.commands.executeCommand(
                                'vscode.prepareCallHierarchy',
                                node.item.uri,
                                exe.selectionRange.start
                            )
                        if (methods.length > 0) {
                            const child = { item: methods[0], children: [] }
                            node.children.push(child)
                            await insertNode(child)
                        }
                        break
                    }
                }
            }
        }

        for (const call of calls) {
            const next =
                call instanceof vscode.CallHierarchyOutgoingCall
                    ? call.to
                    : call.from
            if (ignore(next)) {
                output.appendLine('ignore it in config, ' + next.name)
                continue
            }
            let isSkip = false
            for (const n of nodes) {
                if (isEqual(n.item, next)) {
                    output.appendLine('skip, already resolve: ' + next.name)
                    node.children.push(n)
                    isSkip = true
                }
            }
            if (isSkip) continue
            const child = { item: next, children: [] }
            node.children.push(child)
            await insertNode(child)
        }
    }
    const graph = { item: entryItem, children: [] as CallHierarchyNode[] }
    await insertNode(graph)
    return graph
}

export async function getIncomingCallNode(
    entryItem: CallHierarchyItem,
    ignore: (item: vscode.CallHierarchyItem) => boolean
) {
    return await getCallNode(entryItem, ignore, false)
}

export async function getOutgoingCallNode(
    entryItem: CallHierarchyItem,
    ignore: (item: vscode.CallHierarchyItem) => boolean
) {
    return await getCallNode(entryItem, ignore, true)
}

function isEqual(a: CallHierarchyItem, b: CallHierarchyItem) {
    return (
        a.name === b.name &&
        a.kind === b.kind &&
        a.uri.toString() === b.uri.toString() &&
        a.range.start.line === b.range.start.line &&
        a.range.start.character === b.range.start.character
    )
}
