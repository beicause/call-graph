# call-graph

![call-graph](https://raw.githubusercontent.com/beicause/call-graph/master/images/call-graph.png)
vscode extension for generate call graph in [graphviz dot language](https://www.graphviz.org/doc/info/lang.html), based on vscode call hierarchy language feature.

## Features

* generate call graph in dot language and preview.
* save graph as dot or svg file

## Quick start
1. Open your folder and select a entry function
2. Run `CallGraph.showOutgoingCallGraph` command using `Ctrl+Shift+P` or context menu to show outgoing calls
3. Or Run `CallGraph.showIncomingCallGraph` command using `Ctrl+Shift+P` or context menu to show incoming calls

## How it works
It dependents `vscode.provideOutgoingCalls` and `vscode.provideIncomingCalls` built-in commands.

### For more information
* [GitHub](https://github.com/beicause/call-graph)

**Enjoy!**
