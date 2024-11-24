export function getHtmlContent(dot?:string){
    return `<!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Call Graph</title>
        <script src="https://d3js.org/d3.v5.min.js"></script>
        <script src="https://unpkg.com/@hpcc-js/wasm@0.3.11/dist/index.min.js"></script>
        <script src="https://unpkg.com/d3-graphviz@3.0.5/build/d3-graphviz.js"></script>
    </head>

    <body>
        <div id="app"></div>
        <div class="btn-container">
            <button class="btn" id="downloadDot">save dot file</button>
            <button class="btn" id="downloadSvg">save as svg</button>
        </div>
    </body>
    <script>
        function getEditorColor(property) {
            return document.getElementsByTagName('html')[0]
                .style.getPropertyValue(property);
        }
        (async function () {
           // --- Styling section ---
            const BACKGROUND = getEditorColor('--vscode-editor-background');
            const PRIMARY = getEditorColor('--vscode-list-activeSelectionBackground');
            const SECONDARY = getEditorColor('--vscode-editor-foreground');    

            const vscode = acquireVsCodeApi()
            const dot='${dot}'
            vscode.setState(dot)
            const res = await (await fetch(dot)).text()
            const styledDot = res.replaceAll('$backgroundColor', BACKGROUND)
                .replaceAll('$primaryColor', PRIMARY)
                .replaceAll('$secondaryColor', SECONDARY)
            const gv = d3.select('#app').graphviz().renderDot(styledDot)

            d3.select('#downloadSvg').on('click',()=>{
                const serializer = new XMLSerializer()
                // Reset it before saving since SVG may be zoomed.
                gv.resetZoom()
                const svg = serializer.serializeToString(d3.select('#app>svg').node())
                vscode.postMessage({
                    command: 'download',
                    type:'svg',
                    data:svg
                })
            })
            d3.select('#downloadDot').on('click',()=>{
                vscode.postMessage({
                    command: 'download',
                    type:'dot'
                })
            })
        })()
    </script>
    <style>
        .btn-container{
            position: fixed;
            bottom: 8px;
        }
        .btn {
            display: inline-block;
            font-weight: 400;
            color: #212529;
            text-align: center;
            border: 1px solid transparent;
            padding: .300rem .60rem;
            font-size: 1rem;
            line-height: 1.5;
            border-radius: .25rem;
            color: #fff;
            background-color: #007bff;
        }
        .btn:hover{
              background-color: #0069d9;

        }
    <style/>
    </html>`
}