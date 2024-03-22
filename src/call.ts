import { CallHierarchyItem } from 'vscode'
import * as vscode from 'vscode'
import { output } from './extension'
import cloneDeep = require('lodash.clonedeep')

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
            | vscode.CallHierarchyIncomingCall[] = await vscode.commands.executeCommand(
                command,
                node.item
            )
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
            let next2 = showOnlyFileName(next);
            for (const n of nodes) {
                if (isEqual(n.item, next2)) {
                    output.appendLine('skip, already resolve: ' + next2.name)
                    node.children.push(n)
                    isSkip = true
                }
            }
            if (isSkip) continue
            const child = { item: next2, children: [] }
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

function showOnlyFileName(item: CallHierarchyItem): CallHierarchyItem {
    let itemClone = cloneDeep(item);

    let uri = itemClone.uri.path.split('/');
    itemClone.uri = vscode.Uri.file(uri[uri.length - 1]);

    return itemClone
}