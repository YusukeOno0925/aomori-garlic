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

            // 大学ごとの出現回数をカウント
            const universityCount = {};
            careers.forEach(career => {
                const uni = career.education;
                // 非公開、不明を除外
                if (uni && uni !== '非公開' && uni !== '不明') {
                    universityCount[uni] = (universityCount[uni] || 0) + 1;
                }
            });

            // 上位3校を抽出
            const topUniversities = Object.entries(universityCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(entry => entry[0]);

            console.log("Top Universities:", topUniversities); // デバッグ用ログ

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
                .extent([[20, 20], [width - 20, height - 20]]);

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
                .attr("x", d => (d.x0 + d.x1) / 2)
                .attr("y", d => (d.y0 + d.y1) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text(d => truncateText(d.name, 12));
        })
        .catch(err => console.error("Error fetching career-path-data:", err));
});