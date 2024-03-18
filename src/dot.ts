import { CallHierarchyNode } from "./call"
import * as fs from 'fs'
import * as vscode from 'vscode'
import { isDeepStrictEqual } from "util"
import { output } from "./extension"

export function generateDot(graph: CallHierarchyNode,path:string) {
    const dot = new Graph()
    const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath??''
    dot.addAttr({ rankdir: "LR" })
    const getNode = (n: CallHierarchyNode) => {
        return {
            name: `"${n.item.uri.fsPath}#${n.item.name}@${n.item.range.start.line}:${n.item.range.start.character}"`,
            attr: { label: n.item.name },
            subgraph: { name: n.item.uri.fsPath, attr: { label: n.item.uri.fsPath.replace(root,'${workspace}') } },
            next: []
        } as Node
    }
    const node = getNode(graph)
    // node.attr!.color = "green"
    // node.attr!.style = "filled"
    const set = new Set<Node>()

    const insertNode = (n: Node, c: CallHierarchyNode) => {
        set.add(n)
        for (const child of c.children) {
            const next = getNode(child)
            let isSkip = false
            for (const s of set) {
                if (isEqual(s, next)) {
                    n.next.push(s)
                    isSkip = true
                }
            }
            if (isSkip) continue
            n.next.push(next)
            insertNode(next, child)
        }
    }
    insertNode(node, graph)
    dot.addNode(node)
    fs.writeFileSync(path, dot.toString())
    output.appendLine('generate dot file: '+ path)
    return dot
}

function isEqual(a: Node, b: Node) {
    return a.name === b.name && isDeepStrictEqual(a.attr, b.attr) && isDeepStrictEqual(a.subgraph, b.subgraph)
}

type Attr = Record<string, string> & { title?: string, label?: string, shape?: string, style?: string, color?: string }

interface Node {
    name: string
    attr?: Attr,
    subgraph?: Subgraph
    next: Node[]
}
interface Subgraph {
    name: string
    attr?: Attr & { node?: Attr }
    cluster?: boolean
}
class Graph {
    private _dot = ''
    private _subgraphs = new Map<string, string>()
    private _nodes = new Set<Node>()
    constructor(title?: string) {
        this._dot = (true ? 'digraph' : 'graph') + ` ${title ?? ''} {\n`
    }
    addAttr(attr: Attr) {
        this._dot += this.getAttr(attr, true)
    }
    addNode(...nodes: Node[]) {
        nodes.forEach(n => {
            this._nodes.add(n)
            const name = n.name + this.getAttr(n.attr)
            if (n.subgraph) this.insertToSubgraph(n.subgraph, n.name + ' ')
            let s = ''
            const removeRepeat = [] as number[]
            if (n.next.length > 0) {
                const children = n.next.map((child, index) => {
                    for (const s of this._nodes) {
                        if (isDeepStrictEqual(s, child)) removeRepeat.push(index)
                    }
                    if (child.subgraph) this.insertToSubgraph(child.subgraph, child.name + ' ')
                    return child.name + this.getAttr(child.attr)
                }).join(' ')
                s += `{${name}} -> {${children}}\n`
            }
            else s += name + '\n'
            this._dot += s
            this.addNode(...n.next.filter((_, index) => !removeRepeat.includes(index)))
        })
    }
    private insertToSubgraph(subgraph: Subgraph, s: string) {
        const name = subgraph.name
        if (!this._subgraphs.has(name)) {
            this._subgraphs.set(name, `subgraph "${(subgraph.cluster ?? true ? 'cluster_' : '') + name}" {\n${this.getAttr(subgraph.attr, true)}`)
        }
        this._subgraphs.set(name, this._subgraphs.get(name) + s)
    }

    private getAttr(attr?: Attr, isSelf = false) {
        if (!attr) return ''
        let s = isSelf ? '' : '['
        Object.keys(attr).forEach(k => {
            s += `${k}="${attr[k]}"` + (isSelf ? '\n' : ', ')
        })
        if (!isSelf) s += ']'
        return s
    }
    toString() {
        let sub = ''
        this._subgraphs.forEach((v, k) => {
            sub += v + '}\n'
        })
        return this._dot + sub + '}\n'
    }
}