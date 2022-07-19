import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'
import { output } from './extension'

export interface CallHierarchyNode {
    item: CallHierarchyItem,
    children: CallHierarchyNode[]
}

async function getCallNode(rootUri: string, entryItem: CallHierarchyItem, outgoing: Boolean = true) {
    const command = outgoing ? 'vscode.provideOutgoingCalls' : 'vscode.provideIncomingCalls'
    const nodes = new Set<CallHierarchyNode>()
    const insertNode = async (node: CallHierarchyNode) => {
        output.appendLine('resolve: ' + node.item.name)
        nodes.add(node)
        const calls: (
            vscode.CallHierarchyOutgoingCall[] | vscode.CallHierarchyIncomingCall[]
        ) = await vscode.commands.executeCommand(command, node.item)
        for (const call of calls) {
            const next = call instanceof vscode.CallHierarchyOutgoingCall ? call.to : call.from
            if (!next.uri.toString().startsWith(rootUri)) continue
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


export async function getIncomingCallNode(rootUri: string, entryItem: CallHierarchyItem) {
    return await getCallNode(rootUri, entryItem, false)
}


export async function getOutgoingCallNode(rootUri: string, entryItem: CallHierarchyItem) {
    return await getCallNode(rootUri, entryItem, true)
}


function isEqual(a: CallHierarchyItem, b: CallHierarchyItem) {
    return a.name === b.name && a.kind === b.kind && a.uri.toString() === b.uri.toString() && a.range.start.line === b.range.start.line && a.range.start.character === b.range.start.character
}