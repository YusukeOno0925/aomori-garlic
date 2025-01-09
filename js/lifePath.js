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

            console.log("Top Universities:", topUniversities);

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

            // SVG 初期化
            const width = container.clientWidth || 800;
            const height = container.clientHeight || 400;
            container.innerHTML = '';
            const svg = d3.select(container)
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMinYMin meet");

            // サンキーダイアグラムの設定
            const sankey = d3.sankey()
                .nodeWidth(15)
                .nodePadding(10)
                .extent([[40, 20], [width - 40, height - 20]]);  // 左右余白を40に設定

            const {nodes, links: sankeyLinks} = sankey(sankeyData);

            // リンク描画
            svg.append("g")
                .attr("class", "links")
                .selectAll("path")
                .data(sankeyLinks)
                .enter().append("path")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("stroke", "#574637")
                .attr("stroke-width", d => Math.max(1, d.width))
                .attr("fill", "none")
                .attr("opacity", 0.5);

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
                .attr("fill", "#8ba141")
                .attr("stroke", "#000");

            node.append("text")
            .attr("y", d => (d.y0 + d.y1) / 2)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .attr("text-anchor", function(d) {
                if(d.x0 < 40) return "start";
                if(d.x1 > (width - 40)) return "end";
                return "middle";
            })
            .attr("x", function(d) {
                if(d.x0 < 40) return d.x0 + 5;
                if(d.x1 > (width - 40)) return d.x1 - 5;
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