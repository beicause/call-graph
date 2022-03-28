import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'
import { output } from './extension'

export interface CallHierarchyNode {
    item: CallHierarchyItem,
    children: CallHierarchyNode[]
}

export async function getCallNode(rootUri: string, entryItem: CallHierarchyItem) {
    const nodes = new Set<CallHierarchyNode>()
    const insertNode = async (node: CallHierarchyNode) => {
        output.appendLine('resolve: ' + node.item.name)
        nodes.add(node)
        const calls: vscode.CallHierarchyOutgoingCall[] = await vscode.commands.executeCommand('vscode.provideOutgoingCalls', node.item)
        for (const call of calls) {
            if (!call.to.uri.toString().startsWith(rootUri)) continue
            let isSkip = false
            for (const n of nodes) {
                if (isEqual(n.item, call.to)) {
                    output.appendLine('skip, already resolve: ' + call.to.name)
                    node.children.push(n)
                    isSkip = true
                }
            }
            if (isSkip) continue
            const child = { item: call.to, children: [] }
            node.children.push(child)
            await insertNode(child)
        }
    }
    const graph = { item: entryItem, children: [] as CallHierarchyNode[] }
    await insertNode(graph)
    return graph
}

function isEqual(a: CallHierarchyItem, b: CallHierarchyItem) {
    return a.name === b.name && a.kind === b.kind && a.uri.toString() === b.uri.toString() && a.range.start.line === b.range.start.line && a.range.start.character === b.range.start.character
}