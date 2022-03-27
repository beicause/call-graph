import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'

export interface CallHierarchyNode {
    item: CallHierarchyItem,
    children: CallHierarchyNode[]
}

export async function getCallNode(rootUri: string, entryItem: CallHierarchyItem) {
    const nodes = new Set<CallHierarchyNode>()
    const insertNode = async (node: CallHierarchyNode) => {
        nodes.add(node)
        const calls: vscode.CallHierarchyOutgoingCall[] = await vscode.commands.executeCommand('vscode.provideOutgoingCalls', node.item)
        for (const call of calls) {
            if (!call.to.uri.toString().startsWith(rootUri)) continue
            console.log('resolve: ', JSON.stringify(call.to))
            for (const n of nodes) {
                if (JSON.stringify(n.item).replace(/"_sessionId":".*","_itemId":".*"/, '') === JSON.stringify(call.to).replace(/"_sessionId":".*","_itemId":".*"/, '')) {
                    console.log('skip, already resolve: ', n.item.name);
                    node.children.push(n)
                    return
                }
            }
            const child = { item: call.to, children: [] }
            node.children.push(child)
            await insertNode(child)
        }
    }
    const graph = { item: entryItem, children: [] as CallHierarchyNode[] }
    await insertNode(graph)
    return graph
}
