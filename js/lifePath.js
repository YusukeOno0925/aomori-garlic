document.addEventListener('DOMContentLoaded', function () {
    fetch('data/careers.json')
        .then(response => response.json())
        .then(data => {
            const universities = ["東京大学", "京都大学", "大阪大学"];
            let currentUniversityIndex = 0;

            const careerPathContainer = document.getElementById('career-path-visualization');
            const indicators = document.querySelectorAll('.indicator');
            const width = careerPathContainer.clientWidth;
            const height = careerPathContainer.clientHeight;

            function drawGraph(university) {
                const svg = d3.select("#career-path-visualization")
                    .html("")  // 前回のグラフをクリア
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("viewBox", `0 0 ${width} ${height}`)
                    .attr("preserveAspectRatio", "xMidYMid meet");

                // 矢印のマーカーを定義
                svg.append("defs").append("marker")
                    .attr("id", "arrowhead")
                    .attr("viewBox", "-0 -5 10 10")
                    .attr("refX", 23)
                    .attr("refY", 0)
                    .attr("orient", "auto")
                    .attr("markerWidth", 13)
                    .attr("markerHeight", 13)
                    .attr("xoverflow", "visible")
                    .append("svg:path")
                    .attr("d", "M 0,-5 L 10 ,0 L 0,5")
                    .attr("fill", "#574637") // 矢印の色を変更
                    .style("stroke", "none");

                // 大学名ラベルを追加
                const universityLabel = svg.append("text")
                    .attr("class", "university-label")
                    .attr("x", 10)
                    .attr("y", 30)
                    .text(university);

                const nodes = {};
                const links = [];

                // 選択された大学をフィルタリング
                const filteredCareers = data.careers.filter(career => career.education === university);

                filteredCareers.forEach(career => {
                    const academicBackground = career.education;
                    if (!nodes[academicBackground]) {
                        nodes[academicBackground] = { id: academicBackground, count: 0, type: 'academic' };
                    }
                    nodes[academicBackground].count++;

                    career.companies.forEach((company, index) => {
                        const industryGroup = company.industry;
                        if (!nodes[industryGroup]) {
                            nodes[industryGroup] = { id: industryGroup, count: 0, type: 'industry' };
                        }
                        nodes[industryGroup].count++;

                        if (index > 0) {
                            const previousCompany = career.companies[index - 1].industry;
                            links.push({ source: previousCompany, target: industryGroup });
                        } else {
                            links.push({ source: academicBackground, target: industryGroup });
                        }
                    });
                });

                const nodeArray = Object.values(nodes);

                // アカデミックノードを左側に配置し、会社のノードを右側に配置する
                nodeArray.forEach(node => {
                    if (node.type === 'academic') {
                        node.x = width * 0.2;
                        node.y = height / 2;
                    } else {
                        node.x = width * 0.7;
                        node.y = height * Math.random();
                    }
                });

                const simulation = d3.forceSimulation(nodeArray)
                    .force("link", d3.forceLink(links).id(d => d.id).distance(200))
                    .force("charge", d3.forceManyBody().strength(-300))
                    .force("x", d3.forceX(d => d.type === 'academic' ? width * 0.2 : width * 0.7).strength(0.5))
                    .force("y", d3.forceY(height / 2).strength(0.05))
                    .on("tick", ticked);

                function ticked() {
                    link
                        .attr("x1", d => d.source.x)
                        .attr("y1", d => d.source.y)
                        .attr("x2", d => d.target.x)
                        .attr("y2", d => d.target.y);

                    node
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y);

                    label
                        .attr("x", d => d.x)
                        .attr("y", d => d.y);
                }

                const link = svg.append("g")
                    .attr("class", "links")
                    .selectAll("line")
                    .data(links)
                    .enter().append("line")
                    .attr("stroke-width", 1)
                    .attr("stroke", "#574637") // 矢印の色
                    .attr("marker-end", "url(#arrowhead)");  // 矢印を追加

                const node = svg.append("g")
                    .attr("class", "nodes")
                    .selectAll("circle")
                    .data(nodeArray)
                    .enter().append("circle")
                    .attr("r", d => 10 + d.count * 2)
                    .attr("fill", d => d.type === 'academic' ? "#8ba141" : "#b7b7b7") // 丸箇所の色
                    .call(d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged)
                        .on("end", dragended));

                const label = svg.append("g")
                    .selectAll("text")
                    .data(nodeArray)
                    .enter().append("text")
                    .attr("dy", ".35em")
                    .attr("text-anchor", "middle")
                    .text(d => d.id);

                function dragstarted(event, d) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }

                function dragged(event, d) {
                    d.fx = event.x;
                    d.fy = event.y;
                }

                function dragended(event, d) {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }
            }

            function updateGraph() {
                drawGraph(universities[currentUniversityIndex]);

                // インジケーターの更新
                indicators.forEach((indicator, index) => {
                    if (index === currentUniversityIndex) {
                        indicator.classList.add('active');
                    } else {
                        indicator.classList.remove('active');
                    }
                });

                currentUniversityIndex = (currentUniversityIndex + 1) % universities.length;
            }

            // 初回グラフの描画
            updateGraph();

            // 5秒ごとにグラフを更新
            setInterval(updateGraph, 5000);

            // インジケータークリック時のイベント
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    currentUniversityIndex = index;
                    updateGraph();
                });
            });
        });
});