function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

// 相互リンク(A→B と B→A)を除去する関数
function removeMutualLinks(links) {
    const seen = new Set();
    const toRemove = new Set();

    links.forEach(l => {
        const forward = l.source + '→' + l.target;
        const backward = l.target + '→' + l.source;

        if (seen.has(backward)) {
            toRemove.add(forward);
        } else {
            seen.add(forward);
        }
    });

    return links.filter(l => !toRemove.has(l.source + '→' + l.target));
}

// 循環リンクを除去する関数
function removeCircularLinks(linksArray, nodeCount) {
    const adj = Array.from({ length: nodeCount }, () => []);

    linksArray.forEach(l => {
        if (
            l.source >= 0 &&
            l.source < nodeCount &&
            l.target >= 0 &&
            l.target < nodeCount
        ) {
            adj[l.source].push(l.target);
        }
    });

    const visited = new Array(nodeCount).fill(false);
    const stack = new Array(nodeCount).fill(false);
    const circular = [];

    function dfs(u) {
        visited[u] = true;
        stack[u] = true;

        for (const v of adj[u]) {
            if (!visited[v] && dfs(v)) return true;

            if (stack[v]) {
                circular.push({ source: u, target: v });
                return true;
            }
        }

        stack[u] = false;
        return false;
    }

    for (let i = 0; i < nodeCount; i++) {
        if (!visited[i]) dfs(i);
    }

    return linksArray.filter(l =>
        !circular.some(c => c.source === l.source && c.target === l.target)
    );
}

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('career-path-visualization');
    if (!container) return;

    fetch('/career-path-data/', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            const careers = data.careers || [];

            if (!careers.length) {
                container.innerHTML = '<p class="path-empty">キャリアパスのデータがまだありません。</p>';
                return;
            }

            // 大学ごとの出現回数をカウント（非公開・不明を除外）
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

            if (!topUniversities.length) {
                container.innerHTML = '<p class="path-empty">表示できる出身校データがまだありません。</p>';
                return;
            }

            // 上位3校に関連するキャリアを抽出
            const filteredCareers = careers.filter(career =>
                topUniversities.includes(career.education)
            );

            const nodesSet = new Set();
            const links = [];

            filteredCareers.forEach(career => {
                const uni = career.education;
                nodesSet.add(uni);

                const companies = career.companies || [];

                companies.forEach((company, index) => {
                    const industry = company.industry || '不明';
                    nodesSet.add(industry);

                    if (index === 0) {
                        links.push({
                            source: uni,
                            target: industry,
                            value: 1
                        });
                    } else {
                        const prevIndustry = companies[index - 1].industry || '不明';

                        if (prevIndustry !== industry) {
                            links.push({
                                source: prevIndustry,
                                target: industry,
                                value: 1
                            });
                        }
                    }
                });
            });

            const nodesArray = Array.from(nodesSet).map(name => ({ name }));
            const nodeMap = {};

            nodesArray.forEach((node, i) => {
                nodeMap[node.name] = i;
            });

            let linksArray = links.map(link => ({
                source: nodeMap[link.source],
                target: nodeMap[link.target],
                value: link.value
            }));

            linksArray = removeMutualLinks(linksArray);
            linksArray = removeCircularLinks(linksArray, nodesArray.length);

            const sankeyData = {
                nodes: nodesArray,
                links: linksArray
            };

            container.innerHTML = '';

            // ホーム画面用のプレビューサイズ
            const viewportWidth = window.innerWidth;

            const isMobile = viewportWidth <= 600;

            let sankeyWidth = isMobile ? 720 : 760;
            let sankeyHeight = isMobile ? 260 : 220;

            const svgWidth = sankeyWidth;
            const svgHeight = sankeyHeight;

            // ツールチップ
            d3.selectAll('.tooltip').remove();

            const tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);

            const svg = d3.select(container)
                .append('svg')
                .attr('width', isMobile ? svgWidth : '100%')
                .attr('height', svgHeight)
                .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
                .attr('preserveAspectRatio', 'xMinYMid meet');

            const sankey = d3.sankey()
                .nodeWidth(10)
                .nodePadding(18)
                .extent([[30, 16], [sankeyWidth - 30, sankeyHeight - 24]]);

            let sankeyResult;

            try {
                sankeyResult = sankey(sankeyData);
            } catch (e) {
                console.warn('Sankey レイアウト生成エラー:', e);
                container.innerHTML = '<p class="path-empty">キャリアパスを表示できませんでした。</p>';
                return;
            }

            const { nodes, links: sankeyLinks } = sankeyResult;

            const nodeColorScale = d3.scaleOrdinal()
                .range([
                    '#8ba141',
                    '#88c1d0',
                    '#fcb25f',
                    '#e67676',
                    '#af84db',
                    '#b89b72'
                ]);

            const linkColor = 'rgba(176,162,153,0.55)';

            // リンク描画
            svg.append('g')
                .attr('class', 'links')
                .selectAll('path')
                .data(sankeyLinks)
                .enter()
                .append('path')
                .attr('d', d3.sankeyLinkHorizontal())
                .attr('stroke', linkColor)
                .attr('fill', 'none')
                .attr('stroke-width', d => Math.min(6, Math.max(1, d.width * 0.7)))
                .attr('opacity', 0.75)
                .on('mouseover', function (event, d) {
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('opacity', 1)
                        .attr('stroke-width', Math.max(2, d.width + 1));

                    tooltip.html(`${d.source.name} → ${d.target.name}<br>人数: ${d.value}`)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY + 10) + 'px')
                        .transition()
                        .duration(150)
                        .style('opacity', 0.9);
                })
                .on('mouseout', function (event, d) {
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('opacity', 0.75)
                        .attr('stroke-width', Math.max(1, d.width));

                    tooltip.transition()
                        .duration(150)
                        .style('opacity', 0);
                });

            // ノード描画
            const node = svg.append('g')
                .attr('class', 'nodes')
                .selectAll('g')
                .data(nodes)
                .enter()
                .append('g');

            node.append('rect')
                .attr('x', d => d.x0)
                .attr('y', d => d.y0)
                .attr('height', d => Math.max(1, d.y1 - d.y0))
                .attr('width', d => d.x1 - d.x0)
                .attr('rx', 2)
                .attr('fill', (d, i) => nodeColorScale(i))
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .on('mouseover', function (event, d) {
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('stroke-width', 2)
                        .attr('stroke', '#ffcc66');

                    tooltip.html(`${d.name}<br>関連人数: ${d.value || 0}`)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY + 10) + 'px')
                        .transition()
                        .duration(150)
                        .style('opacity', 0.9);
                })
                .on('mouseout', function () {
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('stroke-width', 1)
                        .attr('stroke', '#fff');

                    tooltip.transition()
                        .duration(150)
                        .style('opacity', 0);
                });

            // ノードラベル
            node.append('text')
                .attr('y', d => (d.y0 + d.y1) / 2)
                .attr('dy', '0.35em')
                .style('font-size', viewportWidth <= 450 ? '10px' : '11px')
                .style('font-weight', '600')
                .style('fill', '#333')
                .attr('text-anchor', function (d) {
                    if (d.x0 < sankeyWidth / 3) return 'start';
                    if (d.x1 > sankeyWidth * 2 / 3) return 'end';
                    return 'middle';
                })
                .attr('x', function (d) {
                    if (d.x0 < sankeyWidth / 3) return d.x1 + 6;
                    if (d.x1 > sankeyWidth * 2 / 3) return d.x0 - 6;
                    return (d.x0 + d.x1) / 2;
                })
                .each(function (d) {
                    const textSel = d3.select(this);
                    const fullText = d.name || '';

                    const maxCharsPerLine = viewportWidth <= 450 ? 5 : 7;
                    let remainingText = fullText;
                    let lines = [];

                    while (remainingText.length > 0 && lines.length < 3) {
                        lines.push(remainingText.slice(0, maxCharsPerLine));
                        remainingText = remainingText.slice(maxCharsPerLine);
                    }

                    if (lines.length === 3 || remainingText.length > 0) {
                        lines = lines.slice(0, 2);
                        let secondLine = lines[1] || '';

                        if (secondLine.length > maxCharsPerLine - 1) {
                            secondLine = secondLine.slice(0, maxCharsPerLine - 1) + '…';
                        } else {
                            secondLine += '…';
                        }

                        lines[1] = secondLine;
                    }

                    textSel.selectAll('tspan')
                        .data(lines)
                        .enter()
                        .append('tspan')
                        .attr('x', textSel.attr('x'))
                        .attr('dy', (line, i) => i === 0 ? '0em' : '1.15em')
                        .text(line => line);
                });
        })
        .catch(err => {
            console.error('Error fetching career-path-data:', err);
            container.innerHTML = '<p class="path-empty">キャリアパスの取得中にエラーが発生しました。</p>';
        });
});