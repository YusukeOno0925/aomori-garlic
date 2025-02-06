function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

document.addEventListener('DOMContentLoaded', function () {
    // ツールチップの作成
    const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

    var universitySelect = document.getElementById('filter-university');
    var industrySelect = document.getElementById('filter-industry');
    var careerGraph = document.getElementById('career-path-graph');

    // APIから実データを取得
    fetch('/career-path-data/', {
        credentials: 'include' // 認証情報を含める（必要な場合）
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        // APIから取得したデータ
        var universities = data.universities;
        var industries = data.industries;
        var careers = data.careers;

        // 大学フィルターのオプションを動的に設定
        universities.forEach(function(university) {
            var option = document.createElement('option');
            option.value = university;
            option.textContent = university;
            universitySelect.appendChild(option);
        });

        // 業界フィルターのオプションを動的に設定
        industries.forEach(function(industry) {
            var option = document.createElement('option');
            option.value = industry;
            option.textContent = industry;
            industrySelect.appendChild(option);
        });

        // 年齢を計算する関数
        function calculateAge(birthYear) {
            var currentYear = new Date().getFullYear();
            return currentYear - birthYear;
        }

        // ユーザー一覧（カード）を表示
        function displayUsers(filteredCareers) {
            var userCardContainer = document.getElementById('user-card-container');
            userCardContainer.innerHTML = '';

            filteredCareers.forEach(function(career) {
                var age = calculateAge(career.birthYear);

                // companies 配列が存在し、少なくとも1つの会社があるか確認
                if (!career.companies || career.companies.length === 0) {
                    // 会社情報なしの場合、スキップ
                    return;
                }
                var latestJob = career.companies[career.companies.length - 1];

                // position プロパティが存在しない場合は '不明'
                var position = latestJob.position || '不明';
                var salary = (latestJob.salary !== undefined && latestJob.salary !== null)
                             ? (latestJob.salary)
                             : '非公開';

                var card = document.createElement('div');
                card.className = 'career-card';
                card.innerHTML =
                    '<div class="career-info">' +
                      '<h2>' + career.name + ' (' + age + '歳)</h2>' +
                      '<p>職業: ' + position + '</p>' +
                      '<p>年収: ' + salary + '</p>' +
                    '</div>' +
                    '<div class="career-path" id="career-path-' + career.id + '"></div>';

                card.addEventListener('click', function () {
                    // テンプレートリテラルを使わず文字列結合
                    window.location.href = "Career_detail.html?id=" + career.id;
                });

                userCardContainer.appendChild(card);
                drawCareerPath("#career-path-" + career.id, career.companies);
            });
        }

        // 小さな会社経歴用のパス描画（上部カードで使用）
        function drawCareerPath(selector, stages) {
            var container = document.querySelector(selector);
            var width = container.clientWidth || 300; // デフォルト幅
            var height = 100;

            // 既存のSVGをクリア
            container.innerHTML = '';

            var svg = d3.select(selector)
                .append("svg")
                .attr("width", "100%")
                .attr("height", height)
                .attr("viewBox", "0 0 " + width + " " + height)
                .attr("preserveAspectRatio", "xMinYMid meet");

            // 画面幅で左右余白を決定
            var screenWidth = window.innerWidth;
            var leftMargin, rightMargin;
            if (screenWidth < 450) {
                // 450px 以下ならかなり詰める
                leftMargin = 10;
                rightMargin = 10;
            } else if (screenWidth < 768) {
                // 768px 以下（ただし450px以上）
                leftMargin = 20;
                rightMargin = 20;
            } else {
                // それ以上の画面サイズは従来どおり
                leftMargin = 50;
                rightMargin = 50;
            }

            var r = 25;
            var xScale = d3.scaleLinear()
                .domain([0, stages.length - 1])
                .range([leftMargin + r, width - rightMargin - r]);

            // リンク（線）
            svg.append("g")
                .selectAll("line")
                .data(stages)
                .enter()
                .append("line")
                .attr("x1", function(d, i) { return i === 0 ? xScale(0) : xScale(i - 1); })
                .attr("y1", height / 2)
                .attr("x2", function(d, i) { return xScale(i); })
                .attr("y2", height / 2)
                .attr("stroke", "#574637") // ホームと同様のリンク色
                .attr("stroke-width", 2);

            // ノード（円）
            svg.append("g")
                .selectAll("circle")
                .data(stages)
                .enter()
                .append("circle")
                .attr("cx", function(d, i) { return xScale(i); })
                .attr("cy", height / 2)
                .attr("r", 5)
                .attr("fill", "#8ba141"); // ホーム同様のノード色

            // 年を表示
            svg.append("g")
                .selectAll("text.year")
                .data(stages)
                .enter()
                .append("text")
                .attr("x", function(d, i) { return xScale(i); })
                .attr("y", height / 2 - 15)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text(function(d) {
                    return d.start_year || '';
                });

            // ステージ（会社名）を表示
            svg.append("g")
                .selectAll("text.stage")
                .data(stages)
                .enter()
                .append("text")
                .attr("x", function(d, i) { return xScale(i); })
                .attr("y", height / 2 + 25)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .each(function(d) {
                    var stageText = d3.select(this);
                    // 改行コードをスペースに
                    var companyName = (d.company_name || '不明').replace(/\n/g, ' ');

                    var maxCharsPerLine = 6;
                    var firstLine = companyName.slice(0, maxCharsPerLine);
                    var secondLine = '';

                    if (companyName.length > maxCharsPerLine) {
                        secondLine = companyName.slice(maxCharsPerLine, maxCharsPerLine * 2);
                        if (companyName.length > maxCharsPerLine * 2) {
                            secondLine = secondLine.slice(0, maxCharsPerLine - 3) + '...';
                        }
                    }

                    var lines = [firstLine];
                    if (secondLine) {
                        lines.push(secondLine);
                    }

                    stageText.selectAll("tspan")
                        .data(lines)
                        .enter()
                        .append("tspan")
                        .attr("x", stageText.attr("x"))
                        .attr("dy", function(d, i) { return i === 0 ? 0 : 14; })
                        .text(function(txt) { return txt; });
                });

            // アイコン
            if (stages.length > 0) {
                svg.append("g")
                    .selectAll("text.icon")
                    .data([stages[stages.length - 1]])
                    .enter()
                    .append("text")
                    .attr("x", xScale(stages.length - 1) + 10)
                    .attr("y", height / 2 + 5)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text('👤');
            }
        }

        // ===== サンキーダイアグラム（メイン可視化）の描画 =====
        function drawCareerGraph(filteredCareers) {
            // Sankey用リンクを一時的に保持する配列
            var links = [];

            // ツールチップ参照（既存の tooltip 変数を使うことを想定）
            // 例: const tooltip = d3.select("body").append("div")... など

            // =========================================
            // 1) 大学を集計し、「上位12校 + その他大学」に集約する
            // =========================================
            // 大学ごとのユーザ数をカウント
            var universityCount = {};
            filteredCareers.forEach(function(career) {
                // 会社があるユーザーだけカウント（会社0件はSankeyに出てこない想定）
                if (!career.companies || career.companies.length === 0) {
                    return;
                }

                var edu = career.education;
                if (!edu) {
                    edu = "不明大学"; // educationがnullの場合は"不明大学"扱い
                }

                if (!universityCount[edu]) {
                    universityCount[edu] = 0;
                }
                universityCount[edu]++;
            });

            // 出現数が多い順に並べ替え、上位12校のみ残す
            var sortedUniversities = Object.keys(universityCount).sort(function(a, b) {
                return universityCount[b] - universityCount[a];
            });
            var topN = 12;
            var topUniversities = sortedUniversities.slice(0, topN);
            // それ以外は「その他大学」に集約
            var otherUniversities = sortedUniversities.slice(topN);

            // =========================================
            // 2) links（大学→業界）を生成する
            //    大学がtopUniversities以外なら「その他大学」に置き換え
            // =========================================
            function addSankeyLink(src, tgt) {
                var existing = links.find(function(x) {
                    return x.source === src && x.target === tgt;
                });
                if (existing) {
                    existing.value += 1;
                } else {
                    links.push({ source: src, target: tgt, value: 1 });
                }
            }

            filteredCareers.forEach(function(career) {
                // 会社がない場合はリンク不要
                if (!career.companies || career.companies.length === 0) {
                    return;
                }

                // 大学名が undefined / null の場合は "不明大学" とする
                var edu = career.education || "不明大学";

                // 上位12校に含まれなければ「その他大学」
                if (!topUniversities.includes(edu)) {
                    edu = "その他大学";
                }

                // 1社目：大学→業界
                var firstCompany = career.companies[0];
                var firstInd = (firstCompany && firstCompany.industry) ? firstCompany.industry : "不明";

                // 大学→最初の業界 へのリンク
                addSankeyLink(edu, firstInd);

                // 2社目以降： 前の業界 → 次の業界
                for (var i = 1; i < career.companies.length; i++) {
                    var prevInd = career.companies[i - 1].industry || "不明";
                    var currInd = career.companies[i].industry || "不明";
                    if (prevInd !== currInd) {
                        addSankeyLink(prevInd, currInd);
                    }
                }
            });

            // =========================================
            // 3) 業界を既存の「上位数件 + その他」に集約
            // =========================================
            // 業界出現頻度を計測（リンクのターゲット側のみ）
            var industryCount = {};
            links.forEach(function(ln) {
                if (!industryCount[ln.target]) {
                    industryCount[ln.target] = 0;
                }
                industryCount[ln.target] += ln.value;
            });

            // 画面幅で業界表示数を 4 or 5 に
            var screenWidth = window.innerWidth;
            var maxIndustries = (screenWidth < 600) ? 4 : 5;

            // 業界を出現頻度が多い順で上位を抽出
            var sortedIndustries = Object.keys(industryCount).sort(function(a, b) {
                return industryCount[b] - industryCount[a];
            });
            var topIndustries = sortedIndustries.slice(0, maxIndustries);
            var otherIndustries = sortedIndustries.slice(maxIndustries);

            // 「その他」業界を追加
            if (otherIndustries.length > 0) {
                topIndustries.push("その他");
            }

            // 新しいリンク配列を作成し、上位業界以外は "その他" に集約
            var newLinks = [];
            function addOrInc(s, t) {
                var ex = newLinks.find(function(x) {
                    return x.source === s && x.target === t;
                });
                if (ex) {
                    ex.value += 1;
                } else {
                    newLinks.push({ source: s, target: t, value: 1 });
                }
            }

            links.forEach(function(ln) {
                if (topIndustries.includes(ln.target)) {
                    newLinks.push(ln);
                } else {
                    addOrInc(ln.source, "その他");
                }
            });

            // =========================================
            // 4) 最終ノード配列を構築 (大学/その他大学 + 業界/その他)
            // =========================================
            var finalNodesSet = new Set();
            newLinks.forEach(function(l) {
                finalNodesSet.add(l.source);
                finalNodesSet.add(l.target);
            });

            var nodesArray = Array.from(finalNodesSet).map(function(name) {
                return { name: name };
            });

            // ノード名→インデックス 変換テーブル
            var nodeMap = {};
            nodesArray.forEach(function(n, i) {
                nodeMap[n.name] = i;
            });

            // Sankey用リンク配列（source / target をインデックスに置き換え）
            var linksArray = newLinks.map(function(l) {
                return {
                    source: nodeMap[l.source],
                    target: nodeMap[l.target],
                    value: l.value
                };
            }).filter(function(x) {
                // NaN除外
                if (isNaN(x.source) || isNaN(x.target)) {
                    return false;
                }
                return true;
            });

            // 循環リンクを排除
            var cleanedLinksArray = removeCircularLinks(linksArray, nodesArray.length);

            var sankeyData = {
                nodes: nodesArray,
                links: cleanedLinksArray
            };

            // =========================================
            // 5) SVG要素をクリアして再描画
            // =========================================
            // 既存の内容をクリア
            careerGraph.innerHTML = '';

            // 横スクロール用に幅を決定
            var containerWidth = careerGraph.clientWidth || 800;
            var svgWidth = (containerWidth < 1200) ? 1200 : containerWidth; // 最低1200px
            var svgHeight;
            if (screenWidth < 600) {
                svgHeight = 400;
            } else if (screenWidth < 900) {
                svgHeight = 500;
            } else {
                svgHeight = 600;
            }

            // SVGを生成
            var svg = d3.select("#career-path-graph")
                .append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight)
                .style("min-width", "1200px"); // 小さい画面でもスクロールが出るように

            // Sankeyレイアウト設定
            var sankey = d3.sankey()
                .nodeWidth(15)
                .nodePadding(10)
                .nodeAlign(d3.sankeyLeft)  // 大学を左端に合わせる
                .extent([[40, 20], [svgWidth - 40, svgHeight - 20]]);

            var sankeyResult;
            try {
                sankeyResult = sankey(sankeyData);
            } catch (error) {
                console.error("Error creating sankey layout:", error);
                return;
            }

            var nodes = sankeyResult.nodes;
            var sankeyLinks = sankeyResult.links;

            // =========================================
            // 6) Sankey のリンク & ノードを描画
            // =========================================

            // リンク描画
            const linkColor = "#b0a299";
            svg.append("g")
                .attr("class", "links")
                .selectAll("path")
                .data(sankeyLinks)
                .enter()
                .append("path")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("stroke", linkColor)
                .attr("stroke-width", function(d) { return Math.max(1, d.width); })
                .attr("fill", "none")
                .attr("opacity", 0.6)
                .on("mouseover", function(event, d) {
                    d3.select(this).transition().duration(150)
                        .attr("opacity", 1.0)
                        .attr("stroke-width", Math.max(2, d.width + 1));
                    tooltip.html(`${d.source.name} → ${d.target.name}<br/>人数: ${d.value}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px")
                        .transition().duration(200)
                        .style("opacity", 0.9);
                })
                .on("mouseout", function(event, d) {
                    d3.select(this).transition().duration(150)
                        .attr("opacity", 0.6)
                        .attr("stroke-width", Math.max(1, d.width));
                    tooltip.transition().duration(200).style("opacity", 0);
                });

            // ノード描画
            const nodeColorScale = d3.scaleOrdinal()
                .range(["#8ba141","#88c1d0","#fcb25f","#e67676","#af84db"]);

            var node = svg.append("g")
                .attr("class", "nodes")
                .selectAll("g")
                .data(nodes)
                .enter().append("g");

            node.append("rect")
                .attr("x", function(d) { return d.x0; })
                .attr("y", function(d) { return d.y0; })
                .attr("height", function(d) { return d.y1 - d.y0; })
                .attr("width", function(d) { return d.x1 - d.x0; })
                .attr("fill", function(d, i) { return nodeColorScale(i); })
                .attr("stroke", "#fff")
                .attr("stroke-width", 1)
                .on("mouseover", function(event, d) {
                    d3.select(this).transition().duration(150)
                        .attr("stroke-width", 2)
                        .attr("stroke", "#ffcc66");
                    tooltip.html(`大学/業界: ${d.name}<br/>流入数: ${d.value || 0}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px")
                        .transition().duration(200)
                        .style("opacity", 0.9);
                })
                .on("mouseout", function() {
                    d3.select(this).transition().duration(150)
                        .attr("stroke-width", 1)
                        .attr("stroke", "#fff");
                    tooltip.transition().duration(200).style("opacity", 0);
                });

            // ノードラベル
            node.append("text")
                .style("font-size", "12px")
                .attr("x", function(d) {
                    // 左側(幅の半分より左)なら右側に配置、右側なら左側に配置
                    return (d.x0 < svgWidth / 2) ? (d.x1 + 6) : (d.x0 - 6);
                })
                .attr("y", function(d) {
                    return (d.y1 + d.y0) / 2;
                })
                .attr("dy", "0.35em")
                .attr("text-anchor", function(d) {
                    return (d.x0 < svgWidth / 2) ? "start" : "end";
                })
                .text(function(d) {
                    return truncateText(d.name, 10); // 長すぎる場合は省略
                });
        }

        // フィルタ適用
        function applyFilters() {
            var selectedUniversity = universitySelect.value;
            var selectedIndustry = industrySelect.value;

            var filteredCareers = careers.filter(function(career) {
                var matchUni = (selectedUniversity === "any")
                    ? true
                    : (career.education === selectedUniversity);
                var matchInd = (selectedIndustry === "")
                    ? true
                    : (career.companies.some(function(company) {
                        return (company.industry === selectedIndustry);
                    }));
                return matchUni && matchInd;
            });

            drawCareerGraph(filteredCareers);
            displayUsers(filteredCareers);
        }

        // 初期表示
        drawCareerGraph(careers);
        displayUsers(careers);

        // イベントリスナー
        universitySelect.addEventListener('change', applyFilters);
        industrySelect.addEventListener('change', applyFilters);
    })
    .catch(function(err) {
        console.error("Error fetching career-path-data:", err);
    });
});

// 循環リンクを除外する関数
function removeCircularLinks(linksArray, nodeCount) {
    var adjList = [];
    for (var i = 0; i < nodeCount; i++) {
        adjList.push([]);
    }

    linksArray.forEach(function(link) {
        if (link.source >= 0 && link.source < nodeCount &&
            link.target >= 0 && link.target < nodeCount) {
            adjList[link.source].push(link.target);
        } else {
            console.warn("無効なリンクがスキップされました: source=" + link.source +
                         ", target=" + link.target);
        }
    });

    var visited = new Array(nodeCount).fill(false);
    var recStack = new Array(nodeCount).fill(false);
    var circularLinks = [];

    function dfs(node) {
        if (!visited[node]) {
            visited[node] = true;
            recStack[node] = true;

            for (var i = 0; i < adjList[node].length; i++) {
                var neighbor = adjList[node][i];
                if (!visited[neighbor] && dfs(neighbor)) {
                    circularLinks.push({ source: node, target: neighbor });
                    return true;
                } else if (recStack[neighbor]) {
                    circularLinks.push({ source: node, target: neighbor });
                    return true;
                }
            }
        }
        recStack[node] = false;
        return false;
    }

    for (var n = 0; n < nodeCount; n++) {
        dfs(n);
    }

    // 循環リンクを除外
    return linksArray.filter(function(link) {
        return !circularLinks.some(function(cLink) {
            return (cLink.source === link.source && cLink.target === link.target);
        });
    });
}