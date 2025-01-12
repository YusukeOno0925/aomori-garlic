function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('career-path-visualization');

    fetch('/career-path-data/', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            const careers = data.careers;

            // 大学ごとの出現回数をカウント（非公開、不明を除外）
            const universityCount = {};
            careers.forEach(career => {
                const uni = career.education;
                if (uni && uni !== '非公開' && uni !== '不明') {
                    universityCount[uni] = (universityCount[uni] || 0) + 1;
                }
            });

            // 上位3校を抽出
            const topUniversities = Object.entries(universityCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(entry => entry[0]);

            // 上位3校に関連するキャリアをフィルタリング
            const filteredCareers = careers.filter(career => topUniversities.includes(career.education));

            // サンキーダイアグラム用のノードとリンクを整形
            const nodesSet = new Set();
            const links = [];

            filteredCareers.forEach(career => {
                const uni = career.education;
                nodesSet.add(uni);
                career.companies.forEach((company, index) => {
                    const industry = company.industry || '不明';
                    nodesSet.add(industry);
                    if (index === 0) {
                        links.push({ source: uni, target: industry, value: 1 });
                    } else {
                        const prevIndustry = career.companies[index - 1].industry || '不明';
                        if (prevIndustry !== industry) {
                            links.push({ source: prevIndustry, target: industry, value: 1 });
                        }
                    }
                });
            });

            // ノード配列とノードマップの作成
            const nodesArray = Array.from(nodesSet).map(name => ({ name }));
            const nodeMap = {};
            nodesArray.forEach((node, i) => nodeMap[node.name] = i);

            // リンクのソース・ターゲットをインデックスに変換
            const linksArray = links.map(link => ({
                source: nodeMap[link.source],
                target: nodeMap[link.target],
                value: link.value
            }));

            // サンキーデータ準備
            const sankeyData = { nodes: nodesArray, links: linksArray };

            container.innerHTML = '';

            // 1) 画面幅を取得
            const viewportWidth = window.innerWidth;

            // 2) sankey用の幅・高さをデフォルトで設定
            let sankeyWidth = 900;
            let sankeyHeight = 500;
                    
            // 768px以下なら少し小さく
            if (viewportWidth <= 768) {
                sankeyWidth = 600;
                sankeyHeight = 400;
            }

            // 450px以下ならさらに小さく
            if (viewportWidth <= 450) {
                sankeyWidth = 450;
                sankeyHeight = 300;
            }

            // 3) SVG自体の幅・高さを ちょっとだけ広め (余白を含む) に設定
            const svgWidth = sankeyWidth + 100;
            const svgHeight = sankeyHeight + 100;

            // --- (1) ツールチップ用のdivを生成 ---
            // body直下に追加し、position: absolute; で表示する
            const tooltip = d3.select("body")
              .append("div")
              .attr("class", "tooltip")
              .style("opacity", 0);  // 初期は透明

            const svg = d3.select(container)
                .append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight);

            // サンキーダイアグラムの設定
            const sankey = d3.sankey()
                .nodeWidth(15)
                .nodePadding(30)
                .extent([[40, 20], [sankeyWidth, sankeyHeight]]);

            const {nodes, links: sankeyLinks} = sankey(sankeyData);

            const nodeColorScale = d3.scaleOrdinal()
               .range(["#8ba141","#88c1d0","#fcb25f","#e67676","#af84db"]);
            const linkColor = "#b0a299";

            // リンク描画
            svg.append("g")
                .attr("class", "links")
                .selectAll("path")
                .data(sankeyLinks)
                .enter().append("path")
                .attr("d", d3.sankeyLinkHorizontal())
                // .attr("stroke", "#574637")
                // .attr("stroke-width", d => Math.max(1, d.width / 1.2))
                // .attr("fill", "none")
                // .attr("opacity", 0.5);
                .attr("stroke", linkColor)
                .attr("fill", "none")
                .attr("stroke-width", d => Math.max(1, d.width))
                .attr("opacity", 0.6)
                .on("mouseover", function(event, d) {
                    // hover時にリンクを強調
                    d3.select(this)
                      .transition().duration(150)
                      .attr("opacity", 1.0)
                      .attr("stroke-width", Math.max(2, d.width + 1));
                    // ツールチップ表示
                    tooltip.html(`${d.source.name} → ${d.target.name}<br/>人数: ${d.value}`)
                      .style("left", (event.pageX + 10) + "px")
                      .style("top", (event.pageY + 10) + "px")
                      .transition().duration(200)
                      .style("opacity", 0.9);
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                      .transition().duration(150)
                      .attr("opacity", 0.6)
                      .attr("stroke-width", Math.max(1, d.width));
                    tooltip.transition().duration(200).style("opacity", 0);
                });

            // ノード描画
            const node = svg.append("g")
                .attr("class", "nodes")
                .selectAll("g")
                .data(nodes)
                .enter().append("g");

            node.append("rect")
                .attr("x", d => d.x0)
                .attr("y", d => d.y0)
                .attr("height", d => d.y1 - d.y0)
                .attr("width", d => d.x1 - d.x0)
                // .attr("fill", "#f9ffcd")
                // .attr("stroke", "#000");
                .attr("fill", (d,i) => nodeColorScale(i)) // ノードによって色が変わる
                .attr("stroke", "#fff")
                .attr("stroke-width", 1)
                // ホバー時のアニメ
                .on("mouseover", function(event, d) {
                    d3.select(this)
                      .transition().duration(150)
                      .attr("stroke-width", 2)
                      .attr("stroke", "#ffcc66");
                    // ツールチップ
                    tooltip.html(`大学/業界: ${d.name}<br/>流入数: ${d.value || 0}`)
                      .style("left", (event.pageX + 10) + "px")
                      .style("top", (event.pageY + 10) + "px")
                      .transition().duration(200)
                      .style("opacity", 0.9);
                })
                .on("mouseout", function() {
                    d3.select(this)
                      .transition().duration(150)
                      .attr("stroke-width", 1)
                      .attr("stroke", "#fff");
                    tooltip.transition().duration(200).style("opacity", 0);
                });

            node.append("text")
            .attr("y", d => (d.y0 + d.y1) / 2)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .attr("text-anchor", function(d) {
                if(d.x0 < 40) return "start";
                if (d.x1 > (sankeyWidth - 40)) return "end";
                return "middle";
            })
            .attr("x", function(d) {
                if(d.x0 < 40) return d.x0 + 5;
                if (d.x1 > (sankeyWidth - 40)) return d.x1 - 5;
                return (d.x0 + d.x1) / 2;
            })
            .each(function(d) {
                const textSel = d3.select(this);
                // 長いテキストを2行まで表示し、それ以降は省略する処理
                let fullText = d.name || '';
                const maxCharsPerLine = 6;  // 1行あたりの最大文字数
                let lines = [];
                // 最大3行まで分割（3行目が存在する場合は省略対象）
                while(fullText.length > 0 && lines.length < 3) {
                    lines.push(fullText.slice(0, maxCharsPerLine));
                    fullText = fullText.slice(maxCharsPerLine);
                }
                // 3行目が存在したら2行目に「...」を追加して2行に制限
                if(lines.length === 3) {
                    lines = lines.slice(0, 2);
                    let secondLine = lines[1];
                    // 既に最大長に近ければ「...」を追加、そうでなければ末尾に「...」を追加
                    if(secondLine.length > maxCharsPerLine - 3) {
                        secondLine = secondLine.slice(0, maxCharsPerLine - 3) + '...';
                    } else {
                        secondLine += '...';
                    }
                    lines[1] = secondLine;
                }
                textSel.selectAll("tspan")
                    .data(lines)
                    .enter()
                    .append("tspan")
                    .attr("x", textSel.attr("x"))
                    .attr("dy", (d, i) => i === 0 ? "0em" : "1.2em")
                    .text(d => d);
            });
        })
        .catch(err => console.error("Error fetching career-path-data:", err));
});