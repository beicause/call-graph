# Change Log

## [1.2.3] 2024-12-19

-   fix the issue that can't run any commands from v1.2.2 ([#31](https://github.com/beicause/call-graph/issues/31)).

## [1.2.2] 2024-11-25

**IMPORTANT:** This version is not working and can't run any commands ([#31](https://github.com/beicause/call-graph/issues/31)), please update to v1.2.3.

-   fix the issue that svg is not saved correctly.
-   use proper size and view box when saving as svg.

## [1.2.1] 2024-05-30

-   `call-graph.saveDir` setting is removed, replaced by showing a save dialog.
-   beautify the save buttons in preview panel.
-   update the extension icon.

## [1.2.0] 2024-05-27

-   add `call-graph.maxDepth` setting for both incoming and outgoing call graphs.

## [1.1.5] 2024-03-20

-   fix .callgraphignore not working in windows
-   use uri path instead of file system path to fix incorrect displaying '\\' in graph label in windows

## [1.1.4] 2024-03-18

-   fix the file path label in graph, now it's the corresponding file system path instead of encoded Uri.
-   now the saved svg fits its original size, not moved or scaled.

## [1.1.3] 2023-10-26

-   use [node-ignore](https://www.npmjs.com/package/ignore) for .callgraphignore to fix relative issues([#17](https://github.com/beicause/call-graph/pull/17))
-   restrict this extensions to only search in the current workspace

## [1.1.2] 2022-8-29

-   add incoming call graph
-   add .callgraphignore config

## [1.1.1] 2022-5-20

-   fix svg and dot file exporting on Windows([#3](https://github.com/beicause/call-graph/issues/3))
-   add config `call-graph.saveDir`

## [1.1.0] 2022-4-12

-   use webview panel instead of browser for previewing, so many configs are removed.
-   support saving svg and dot file to workspace.

## [1.0.0] 2022-3-28

-   Initial release
