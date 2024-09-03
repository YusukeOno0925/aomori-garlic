document.addEventListener('DOMContentLoaded', function () {
    fetch('data/careers.json')
        .then(response => response.json())
        .then(data => {
            const universitySelect = document.getElementById('filter-university');
            const industrySelect = document.getElementById('filter-industry');
            const careerGraph = document.getElementById('career-path-graph');

            // 大学フィルターのオプションを動的に設定
            const uniqueUniversities = [...new Set(data.careers.map(career => career.education))];

            uniqueUniversities.forEach(university => {
                const option = document.createElement('option');
                option.value = university;
                option.textContent = university;
                universitySelect.appendChild(option);
            });

            // 業界フィルターのオプションを動的に設定
            const uniqueIndustries = [...new Set(data.careers.flatMap(career => career.companies.map(company => company.industry)))];

            uniqueIndustries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry;
                option.textContent = industry;
                industrySelect.appendChild(option);
            });

            function calculateAge(birthYear) {
                const currentYear = new Date().getFullYear();
                return currentYear - birthYear;
            }

            function displayUsers(careers) {
                const userCardContainer = document.getElementById('user-card-container');
                userCardContainer.innerHTML = '';
                careers.forEach(career => {
                    const age = calculateAge(career.birthYear);
                    const card = document.createElement('div');
                    card.className = 'career-card';
                    card.innerHTML = `
                        <div class="career-info">
                            <h2>${career.name} (${age}歳)</h2>
                            <p>職業: ${career.profession}</p>
                            <p>年収: ${career.income[career.income.length - 1].income}万円</p>
                        </div>
                        <div class="career-path" id="career-path-${career.id}"></div>
                    `;
                    card.addEventListener('click', function () {
                        window.location.href = `career_detail.html?id=${career.id}`;
                    });
                    userCardContainer.appendChild(card);
                    drawCareerPath(`#career-path-${career.id}`, career.careerStages);
                });
            }

            function drawCareerPath(selector, stages) {
                const container = document.querySelector(selector);
                const width = container.clientWidth; 
                const height = 100;
                
                const svg = d3.select(selector)
                    .append("svg")
                    .attr("width", "100%")  // SVG自体の幅を100%に設定
                    .attr("height", height)
                    .attr("viewBox", `0 0 ${width} ${height}`)  // ビューボックスを設定してスケーリング対応
                    .attr("preserveAspectRatio", "xMinYMid meet");  // アスペクト比を保ちながらリサイズ
                
                const xScale = d3.scaleLinear()
                    .domain([0, stages.length - 1])
                    .range([50, width - 50]); 
                
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
                
                svg.append("g")
                    .selectAll("circle")
                    .data(stages)
                    .enter()
                    .append("circle")
                    .attr("cx", (d, i) => xScale(i))
                    .attr("cy", height / 2)
                    .attr("r", 5)
                    .attr("fill", "#8ba141");
                
                svg.append("g")
                    .selectAll("text.year")
                    .data(stages)
                    .enter()
                    .append("text")
                    .attr("x", (d, i) => xScale(i))
                    .attr("y", height / 2 - 15)
                    .attr("text-anchor", "middle")
                    .style("font-size", "12px")
                    .text(d => d.year);
                
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
                        const lines = d.stage.match(/.{1,6}/g) || [];
                        stageText.selectAll("tspan")
                            .data(lines)
                            .enter()
                            .append("tspan")
                            .attr("x", stageText.attr("x"))
                            .attr("dy", (d, i) => i === 0 ? 0 : 14)
                            .text(d => d);
                    });
                
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

            function drawCareerGraph(careers, startNode = "大学") {
                careerGraph.innerHTML = ''; 
                const width = careerGraph.clientWidth;
                const height = 600;
            
                const svg = d3.select(careerGraph)
                    .append("svg")
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", `0 0 ${width} ${height}`)
                    .attr("preserveAspectRatio", "xMidYMid meet"); 
            
                const xScale = d3.scaleLinear()
                    .domain([0, 1])
                    .range([100, width - 100]);
            
                const simulation = d3.forceSimulation()
                    .force("link", d3.forceLink().id(d => d.id).distance(250))
                    .force("charge", d3.forceManyBody().strength(-300))
                    .force("center", d3.forceCenter(width / 2, height / 2))
                    .force("x", d3.forceX(d => d.id === startNode ? xScale(0) : xScale(1)).strength(0.5))
                    .force("y", d3.forceY(d => d.id === startNode ? height / 2 : height / (nodes.length + 1) * d.index).strength(1));
            
                const nodeMap = {};
                const links = [];
            
                nodeMap[startNode] = { id: startNode, label: startNode, group: startNode, size: 10 };
            
                careers.forEach(career => {
                    if (universitySelect.value === "any" || career.education === universitySelect.value) {
                        career.companies.forEach((company, index) => {
                            if (!nodeMap[company.industry]) {
                                nodeMap[company.industry] = { id: company.industry, label: company.industry, group: company.industry, size: 1 };
                            } else {
                                nodeMap[company.industry].size += 1;
                            }
            
                            if (index === 0) {
                                links.push({ source: nodeMap[startNode], target: nodeMap[company.industry] });
                            } else {
                                const prevCompany = career.companies[index - 1];
                                links.push({ source: nodeMap[prevCompany.industry], target: nodeMap[company.industry] });
                            }
                        });
                    }
                });
            
                const nodes = Object.values(nodeMap);
                const filteredNodes = nodes.filter(node => node.id === startNode || links.some(link => link.source.id === node.id || link.target.id === node.id));
                const filteredLinks = links.filter(link => link.source.id === startNode || link.target.id === startNode);
            
                if (filteredNodes.length === 0 || filteredLinks.length === 0) {
                    console.log("No nodes or links found for the given filter.");
                    return;
                }
            
                simulation.nodes(filteredNodes);
                simulation.force("link").links(links);
            
                const link = svg.append("g")
                    .attr("class", "links")
                    .selectAll("line")
                    .data(links)
                    .enter().append("line")
                    .attr("stroke-width", 2)
                    .attr("stroke", "#574637");
            
                const node = svg.append("g")
                    .attr("class", "nodes")
                    .selectAll("circle")
                    .data(nodes)
                    .enter().append("circle")
                    .attr("r", d => Math.sqrt(d.size) * 10)
                    .attr("fill", d => d.id === startNode ? "#8ba141" : "#ffd700")
                    .call(d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged)
                        .on("end", dragended));
            
                const text = svg.append("g")
                    .attr("class", "node-texts")
                    .selectAll("text")
                    .data(nodes)
                    .enter().append("text")
                    .attr("text-anchor", "middle")
                    .attr("dy", ".35em")
                    .style("font-size", "10px")
                    .style("fill", "#000000")
                    .text(d => d.label);
            
                simulation.on("tick", () => {
                    link
                        .attr("x1", d => d.source.x)
                        .attr("y1", d => d.source.y)
                        .attr("x2", d => d.target.x)
                        .attr("y2", d => d.target.y);
            
                    node
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y);
            
                    text
                        .attr("x", d => d.x)
                        .attr("y", d => d.y);
                });
            
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

            // 初期表示
            drawCareerGraph(data.careers, "大学");
            displayUsers(data.careers);

            universitySelect.addEventListener('change', function () {
                const selectedIndustry = industrySelect.value;
                const filteredCareers = selectedIndustry
                    ? data.careers.filter(career =>
                        career.companies.some(company => company.industry === selectedIndustry) &&
                        (universitySelect.value === "any" || career.education === universitySelect.value))
                    : data.careers.filter(career => universitySelect.value === "any" || career.education === universitySelect.value);
                
                if (filteredCareers.length > 0) {
                    const startNode = universitySelect.value === "any" ? filteredCareers[0].education : universitySelect.value;
                    drawCareerGraph(filteredCareers, startNode);
                    displayUsers(filteredCareers);
                } else {
                    drawCareerGraph(data.careers, "大学");
                    displayUsers(data.careers);
                }
            });

            industrySelect.addEventListener('change', function () {
                const selectedIndustry = industrySelect.value;
                const filteredCareers = selectedIndustry
                    ? data.careers.filter(career =>
                        career.companies.some(company => company.industry === selectedIndustry) &&
                        (universitySelect.value === "any" || career.education === universitySelect.value))
                    : data.careers.filter(career => universitySelect.value === "any" || career.education === universitySelect.value);
                
                if (filteredCareers.length > 0) {
                    drawCareerGraph(filteredCareers, universitySelect.value);
                    displayUsers(filteredCareers);
                } else {
                    drawCareerGraph(data.careers, "大学");
                    displayUsers(data.careers);
                }
            });
        });
});