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
        <div class="download">
            <button id="downloadDot">save dot file</button>
            <button id="downloadSvg">save as svg</button>
        </div>
        <div id="hide" style="display: none;"><div/>
    </body>
    <script>
        (async function () {
            const vscode = acquireVsCodeApi()
            const dot='${dot}'
            vscode.setState(dot)
            const res =await (await fetch(dot)).text()
            d3.select('#app').graphviz().renderDot(res)
            d3.select('#hide').graphviz({zoom:false}).renderDot(res)

            d3.select('#downloadSvg').on('click',()=>{
                const serializer = new XMLSerializer()
                // The svg in #app may have been scaled or moved, use #hide
                const svg = serializer.serializeToString(d3.select('#hide>svg').node())

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
        .download{
            position: fixed;
            bottom: 0;
        }
    <style/>
    </html>`
}