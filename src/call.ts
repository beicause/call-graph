import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'
import { output } from './extension'

export interface CallHierarchyNode {
    item: CallHierarchyItem
    children: CallHierarchyNode[]
}

async function getCallNode(
    entryItem: CallHierarchyItem,
    ignore: (item: vscode.CallHierarchyItem) => boolean,
    outgoing: boolean = true,
) {
    const maxDepth =
        vscode.workspace
            .getConfiguration()
            .get<number>('call-graph.maxDepth') || 0
    const command = outgoing
        ? 'vscode.provideOutgoingCalls'
        : 'vscode.provideIncomingCalls'
    const nodes = new Set<CallHierarchyNode>()
    const insertNode = async (node: CallHierarchyNode, depth = 0) => {
        if (maxDepth > 0 && depth >= maxDepth) return
        output.appendLine('resolve: ' + node.item.name)
        nodes.add(node)
        const calls:
            | vscode.CallHierarchyOutgoingCall[]
            | vscode.CallHierarchyIncomingCall[] =
            await vscode.commands.executeCommand(command, node.item)
        await Promise.all(
            calls.map(call => {
                const next =
                    call instanceof vscode.CallHierarchyOutgoingCall
                        ? call.to
                        : call.from
                if (ignore(next)) {
                    output.appendLine('ignore it in config, ' + next.name)
                    return null
                }
                let isSkip = false
                for (const n of nodes) {
                    if (isCallHierarchyItemEqual(n.item, next)) {
                        output.appendLine('skip, already resolve: ' + next.name)
                        node.children.push(n)
                        isSkip = true
                    }
                }
                if (isSkip) return null
                const child = { item: next, children: [] }
                node.children.push(child)
                return insertNode(child, depth + 1)
            }),
        )
    }
    const graph = { item: entryItem, children: [] as CallHierarchyNode[] }
    await insertNode(graph)
    return graph
}

export async function getIncomingCallNode(
    entryItem: CallHierarchyItem,
    ignore: (item: vscode.CallHierarchyItem) => boolean,
) {
    return await getCallNode(entryItem, ignore, false)
}

export async function getOutgoingCallNode(
    entryItem: CallHierarchyItem,
    ignore: (item: vscode.CallHierarchyItem) => boolean,
) {
    return await getCallNode(entryItem, ignore, true)
}

function isCallHierarchyItemEqual(a: CallHierarchyItem, b: CallHierarchyItem) {
    return (
        a.name === b.name &&
        a.kind === b.kind &&
        a.uri.toString() === b.uri.toString() &&
        a.range.start.line === b.range.start.line &&
        a.range.start.character === b.range.start.character
    )
}
