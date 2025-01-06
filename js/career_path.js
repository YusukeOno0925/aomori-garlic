document.addEventListener('DOMContentLoaded', function () {
    const universitySelect = document.getElementById('filter-university');
    const industrySelect = document.getElementById('filter-industry');
    const careerGraph = document.getElementById('career-path-graph');

    // APIから実データを取得
    fetch('/career-path-data/')
        .then(response => response.json())
        .then(data => {
            // APIから取得したデータ
            const universities = data.universities;
            const industries = data.industries;
            const careers = data.careers;

            // 大学フィルターのオプションを動的に設定
            universities.forEach(university => {
                const option = document.createElement('option');
                option.value = university;
                option.textContent = university;
                universitySelect.appendChild(option);
            });

            // 業界フィルターのオプションを動的に設定
            industries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry;
                option.textContent = industry;
                industrySelect.appendChild(option);
            });

            function calculateAge(birthYear) {
                const currentYear = new Date().getFullYear();
                return currentYear - birthYear;
            }

            function displayUsers(filteredCareers) {
                const userCardContainer = document.getElementById('user-card-container');
                userCardContainer.innerHTML = '';
                filteredCareers.forEach(career => {
                    const age = calculateAge(career.birthYear);
                    
                    // companies 配列が存在し、少なくとも1つの会社があるか確認
                    if (!career.companies || career.companies.length === 0) {
                        console.warn(`ユーザーID ${career.id} (${career.name}) に会社情報がありません。`);
                        return; // このキャリアをスキップ
                    }
                    
                    const latestJob = career.companies[career.companies.length - 1];
                    
                    // position プロパティが存在するか確認し、存在しない場合は '不明' を設定
                    const position = latestJob.position || '不明';
                    const salary = latestJob.salary !== undefined && latestJob.salary !== null ? `${latestJob.salary}万円` : '非公開';
                    
                    const card = document.createElement('div');
                    card.className = 'career-card';
                    card.innerHTML = `
                        <div class="career-info">
                            <h2>${career.name} (${age}歳)</h2>
                            <p>職業: ${position}</p>
                            <p>年収: ${salary}</p>
                        </div>
                        <div class="career-path" id="career-path-${career.id}"></div>
                    `;
                    card.addEventListener('click', function () {
                        window.location.href = `career_detail.html?id=${career.id}`;
                    });
                    userCardContainer.appendChild(card);
                    drawCareerPath(`#career-path-${career.id}`, career.companies);
                });
            }

            function drawCareerPath(selector, stages) {
                const container = document.querySelector(selector);
                const width = container.clientWidth || 300; // デフォルト幅
                const height = 100;
                
                // 既存のSVGをクリア
                container.innerHTML = '';

                const svg = d3.select(selector)
                    .append("svg")
                    .attr("width", "100%")
                    .attr("height", height)
                    .attr("viewBox", `0 0 ${width} ${height}`)
                    .attr("preserveAspectRatio", "xMinYMid meet");
                
                const xScale = d3.scaleLinear()
                    .domain([0, stages.length - 1])
                    .range([50, width - 50]); 
                
                // リンク（線）を描画
                svg.append("g")
                    .selectAll("line")
                    .data(stages)
                    .enter()
                    .append("line")
                    .attr("x1", (d, i) => i === 0 ? xScale(0) : xScale(i - 1))
                    .attr("y1", height / 2)
                    .attr("x2", (d, i) => xScale(i))
                    .attr("y2", height / 2)
                    .attr("stroke", "#574637")
                    .attr("stroke-width", 2);
                
                // ノード（円）を描画
                svg.append("g")
                    .selectAll("circle")
                    .data(stages)
                    .enter()
                    .append("circle")
                    .attr("cx", (d, i) => xScale(i))
                    .attr("cy", height / 2)
                    .attr("r", 5)
                    .attr("fill", "#8ba141");
                
                // 年を表示
                svg.append("g")
                    .selectAll("text.year")
                    .data(stages)
                    .enter()
                    .append("text")
                    .attr("x", (d, i) => xScale(i))
                    .attr("y", height / 2 - 15)
                    .attr("text-anchor", "middle")
                    .style("font-size", "12px")
                    .text(d => d.start_year || '');
                
                // ステージを表示
                svg.append("g")
                    .selectAll("text.stage")
                    .data(stages)
                    .enter()
                    .append("text")
                    .attr("x", (d, i) => xScale(i))
                    .attr("y", height / 2 + 25)
                    .attr("text-anchor", "middle")
                    .style("font-size", "12px")
                    .each(function(d) {
                        const stageText = d3.select(this);
                        const lines = d.position.match(/.{1,6}/g) || [];
                        stageText.selectAll("tspan")
                            .data(lines)
                            .enter()
                            .append("tspan")
                            .attr("x", stageText.attr("x"))
                            .attr("dy", (d, i) => i === 0 ? 0 : 14)
                            .text(d => d);
                    });
                
                // アイコンを表示
                svg.append("g")
                    .selectAll("text.icon")
                    .data([stages[stages.length - 1]])
                    .enter()
                    .append("text")
                    .attr("x", (d, i) => xScale(stages.length - 1) + 10)
                    .attr("y", height / 2 + 5)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text('👤');
            }

            function drawCareerGraph(filteredCareers) {
                // ノードとリンクのデータ構造を作成
                const nodesSet = new Set(); // ユニークなノードを収集
                const links = [];
            
                filteredCareers.forEach(career => {
                    nodesSet.add(career.education); // 大学をノードに追加
                    career.companies.forEach((company, index) => {
                        nodesSet.add(company.industry); // 業界をノードに追加
            
                        if (index === 0) {
                            // 大学から最初の業界へのリンク
                            links.push({ source: career.education, target: company.industry, value: 1 });
                        } else {
                            const prevIndustry = career.companies[index - 1].industry;
                            // 同じ業界間の循環を防ぐため、以前の業界から現在の業界へのリンクのみ追加
                            if (prevIndustry !== company.industry) { // 同じ業界への自己ループを防ぐ
                                links.push({ source: prevIndustry, target: company.industry, value: 1 });
                            }
                        }
                    });
                });
            
                // ノードの配列を作成（大学と業界を含む）
                const nodesArray = Array.from(nodesSet).map(name => ({ name }));
            
                // ノード名からインデックスへのマッピングを作成
                const nodeMap = {};
                nodesArray.forEach((node, index) => {
                    nodeMap[node.name] = index;
                });
            
                // リンクのsourceとtargetをインデックスに変換
                const linksArray = links.map(d => ({
                    source: nodeMap[d.source],
                    target: nodeMap[d.target],
                    value: d.value
                }));
            
                // 循環リンクがないか確認（オプション）
                const visited = new Set();
                function hasCycle(node, ancestors = new Set()) {
                    if (ancestors.has(node)) return true;
                    if (visited.has(node)) return false;
                    visited.add(node);
                    const children = linksArray.filter(link => link.source === node).map(link => link.target);
                    for (const child of children) {
                        ancestors.add(node);
                        if (hasCycle(child, ancestors)) return true;
                        ancestors.delete(node);
                    }
                    return false;
                }
            
                for (const node of nodesArray) {
                    if (hasCycle(nodeMap[node.name])) {
                        console.error(`循環が検出されました：${node.name}`);
                        // 必要に応じて、循環リンクを除外するロジックを追加
                    }
                }
            
                // サンキーダイアグラム用にデータを整形
                const sankeyData = {
                    nodes: nodesArray,
                    links: linksArray
                };
            
                // SVGのクリア
                careerGraph.innerHTML = '';
            
                // サンキーダイアグラムの設定
                const width = careerGraph.clientWidth || 800;
                const height = 600;
            
                const svg = d3.select("#career-path-graph").append("svg")
                    .attr("width", width)
                    .attr("height", height);
            
                const sankey = d3.sankey()
                    .nodeWidth(15)
                    .nodePadding(10)
                    .extent([[1, 1], [width - 1, height - 6]]);
            
                let sankeyResult;
                try {
                    sankeyResult = sankey(sankeyData);
                } catch (error) {
                    console.error("Error creating sankey layout:", error);
                    return;
                }
            
                const { nodes, links: sankeyLinks } = sankeyResult;
            
                // ツールチップの作成
                const tooltip = d3.select("body").append("div")   
                    .attr("class", "tooltip")               
                    .style("position", "absolute")
                    .style("text-align", "center")           
                    .style("padding", "6px")              
                    .style("font-size", "12px")             
                    .style("background", "lightsteelblue")   
                    .style("border", "0px")      
                    .style("border-radius", "8px")           
                    .style("pointer-events", "none")         
                    .style("opacity", 0);
            
                // リンクを描画
                svg.append("g")
                    .attr("class", "links")
                    .selectAll("path")
                    .data(sankeyLinks)
                    .enter().append("path")
                    .attr("d", d3.sankeyLinkHorizontal())
                    .attr("stroke", "#574637")
                    .attr("stroke-width", d => Math.max(1, d.width))
                    .attr("fill", "none")
                    .attr("opacity", 0.5)
                    .on("mouseover", function(event, d) {
                        d3.select(this).attr("opacity", 0.8);
                        tooltip.transition()        
                            .duration(200)      
                            .style("opacity", .9);      
                        tooltip.html(`${d.source.name} → ${d.target.name}<br>人数: ${d.value}`)
                            .style("left", (event.pageX) + "px")     
                            .style("top", (event.pageY - 28) + "px");    
                    })
                    .on("mouseout", function(event, d) {
                        d3.select(this).attr("opacity", 0.5);
                        tooltip.transition()        
                            .duration(500)      
                            .style("opacity", 0);   
                    });
            
                // ノードを描画
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
                    .attr("stroke", "#000")
                    .on("click", function(event, d) {
                        // ノードをクリックした際の処理（例: 業界に関連するユーザーをフィルタリング）
                        industrySelect.value = d.name;
                        applyFilters();
                    })
                    .on("mouseover", function(event, d) {
                        d3.select(this).attr("fill", "#a0c741");
                        tooltip.transition()        
                            .duration(200)      
                            .style("opacity", .9);      
                        tooltip.html(`業界: ${d.name}`)
                            .style("left", (event.pageX) + "px")     
                            .style("top", (event.pageY - 28) + "px");    
                    })
                    .on("mouseout", function(event, d) {
                        d3.select(this).attr("fill", "#8ba141");
                        tooltip.transition()        
                            .duration(500)      
                            .style("opacity", 0);   
                    });
            
                node.append("text")
                    .attr("x", d => d.x0 - 6)
                    .attr("y", d => (d.y1 + d.y0) / 2)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "end")
                    .text(d => d.name)
                    .filter(d => d.x0 < width / 2)
                    .attr("x", d => d.x1 + 6)
                    .attr("text-anchor", "start")
                    .style("font-size", "12px");
            }

            function applyFilters() {
                const selectedUniversity = universitySelect.value;
                const selectedIndustry = industrySelect.value;
            
                // フィルタリング
                const filteredCareers = careers.filter(career => {
                    const matchUni = (selectedUniversity === "any")
                        ? true
                        : (career.education === selectedUniversity);
                    const matchInd = (selectedIndustry === "")
                        ? true
                        : (career.companies.some(company => company.industry === selectedIndustry));
                    return matchUni && matchInd;
                });
            
                // グラフとユーザーカードの更新
                drawCareerGraph(filteredCareers);
                displayUsers(filteredCareers);
            }
            
            // イベントリスナーの設定
            universitySelect.addEventListener('change', applyFilters);
            industrySelect.addEventListener('change', applyFilters);
        })
        .catch(err => {
            console.error("Error fetching career-path-data:", err);
        });
});