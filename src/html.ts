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
        <script src="https://cdnjs.cloudflare.com/ajax/libs/svg.js/3.2.0/svg.js"></script>
    </head>

    <body>
        <div id="app"></div>
        <div class="btn-container">
            <button class="btn" id="downloadDot">save dot file</button>
            <button class="btn" id="downloadSvg">save as svg</button>
        </div>
    </body>
    <script>
        (async function () {
            const vscode = acquireVsCodeApi()
            const dot='${dot}'
            vscode.setState(dot)
            const res = await (await fetch(dot)).text()
            const gv = d3.select('#app').graphviz().renderDot(res, restyleSvg)
            d3.select('#hide').graphviz({zoom:false}).renderDot(res)

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

            // --- Styling section ---
            const BACKGROUND = getEditorColor('--vscode-editor-background');
            const PRIMARY = getEditorColor('--vscode-list-activeSelectionBackground');
            const SECONDARY = getEditorColor('--vscode-editor-foreground');

            document.body.style.backgroundColor = BACKGROUND;

            function getEditorColor(property) {
                return document.getElementsByTagName('html')[0]
                    .style.getPropertyValue(property);
            }

            let classMap = {
                graph: node => {graphClassCallback(node)},
                node: node => {nodeClassCallback(node)},
                edge: node => {edgeClassCallback(node)},
                cluster: node => {clusterClassCallback(node)}
            }


            function clusterClassCallback(parentNode) {
                const clusterPolygonInstance = parentNode.node.children[1].instance;
                const clusterTextInstance = parentNode.node.children[2].instance;

                clusterPolygonInstance.stroke(SECONDARY);
                clusterTextInstance.fill(SECONDARY)
            }


            function graphClassCallback(parentNode) {
                const nodeOuterPolygonInstance = parentNode.node.children[0].instance;
                nodeOuterPolygonInstance.fill(BACKGROUND);
            }


            function nodeClassCallback(parentNode) {
                const nodeEllipseInstance = parentNode.node.children[1].instance;
                const nodeTextInstance = parentNode.node.children[2].instance;
                nodeEllipseInstance.fill(PRIMARY);
                nodeEllipseInstance.stroke(SECONDARY);
                nodeTextInstance.fill(SECONDARY);
            }


            function edgeClassCallback(parentNode) {
                const nodeArrowInstance = parentNode.node.children[1].instance;
                const nodeArrowTipInstance = parentNode.node.children[2].instance;
                nodeArrowInstance.stroke(SECONDARY);
                nodeArrowTipInstance.stroke(SECONDARY);
            }


            function applyRestyle(node) {
                node.node.classList.forEach(domClass => {
                    classCallback = classMap[domClass];
                    if (classCallback) classCallback(node);
                });
            }


            function restyleSvg() {
                let currentNode;

                const draw = SVG('#app');
                const bfs = [draw];
                let i = 0;

                while (i < bfs.length) {
                    currentNode = bfs[i];

                    currentNode.children().forEach(element => {
                        bfs.push(element);
                    });
                    i += 1;
                    applyRestyle(currentNode);
                }
            }
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
