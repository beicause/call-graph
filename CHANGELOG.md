# Change Log

## [1.1.5] 2024-03-20

- fix .callgraphignore not working in windows
- use uri path instead of file system path to fix incorrect displaying '\\' in graph label in windows

## [1.1.4] 2024-03-18

- fix the file path label in graph, now it's the corresponding file system path instead of encoded Uri.
- now the saved svg fits its original size, not moved or scaled.

## [1.1.3] 2023-10-26

- use [node-ignore](https://www.npmjs.com/package/ignore) for .callgraphignore to fix relative issues([#17](https://github.com/beicause/call-graph/pull/17))
- restrict this extensions to only search in the current workspace

## [1.1.2] 2022-8-29

- add incoming call graph
- add .callgraphignore config

## [1.1.1] 2022-5-20

- fix svg and dot file exporting on Windows([#3](https://github.com/beicause/call-graph/issues/3))
- add config `call-graph.saveDir`

## [1.1.0] 2022-4-12

- use webview panel instead of browser for previewing, so many configs are removed.
- support saving svg and dot file to workspace.

## [1.0.0] 2022-3-28

- Initial release