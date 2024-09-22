document.addEventListener('DOMContentLoaded', function () {
    fetch('/career-overview')
        .then(response => response.json())
        .then(data => {
            const industrySelect = document.getElementById('filter-industry');

            // すべての会社の業界名を取得してセットに追加
            const uniqueIndustries = [...new Set(data.careers.flatMap(career => 
                career.companies.map(company => company.industry)
            ))];

            uniqueIndustries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry;
                option.textContent = industry;
                industrySelect.appendChild(option);
            });

            // 年齢を計算する関数
            function calculateAge(birthYear) {
                if (!birthYear) {
                    return "null";  // 誕生日が入力されていない場合
                }
                const currentYear = new Date().getFullYear();
                return `${currentYear - birthYear}`;
            }

            function displayCareers(careers) {
                const careerList = document.getElementById('career-list');
                careerList.innerHTML = ''; // 前回の表示をクリア

                careers.forEach(career => {
                    const age = calculateAge(career.birthYear);

                    const listItem = document.createElement('li');
                    listItem.className = 'career-card';

                    // カードをクリックすると詳細ページに遷移するように設定
                    listItem.addEventListener('click', function () {
                        window.location.href = `Career_detail.html?id=${career.id}`;
                    });

                    // 一つのキャリアについて、大学と会社の情報を取得
                    let stages = career.careerStages.map(stage => ({
                        year: stage.year,
                        stage: stage.stage
                    }));

                    listItem.innerHTML = `
                        <div class="career-info">
                            <h2>${career.name} (${age}歳)</h2>
                            <p>職業: ${career.profession}</p>
                            <p>年収: ${career.income[career.income.length - 1].income}万円</p>
                        </div>
                        <div class="career-path" id="career-path-${career.id}">
                            <!-- ここにD3.jsで描画されるキャリアパスの図が入る -->
                        </div>
                    `;

                    careerList.appendChild(listItem);

                    drawCareerPath(`#career-path-${career.id}`, stages);
                });
            }

            function drawCareerPath(selector, stages) {
                const container = document.querySelector(selector);
                const width = container.clientWidth;
                const height = 100;

                const svg = d3.select(selector)
                    .append("svg")
                    .attr("width", "100%")
                    .attr("height", height)
                    .attr("viewBox", `0 0 ${width} ${height}`)
                    .attr("preserveAspectRatio", "xMinYMid meet");

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
                    .style("font-size", "14px")
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
                    .each(function (d) {
                        const stageText = d3.select(this);
                        let stage = d.stage.length > 12 ? d.stage.substring(0, 12) + '...' : d.stage; // 最大文字数を12に制限
                        const lines = stage.match(/.{1,6}/g); // 6文字ごとに区切る
                        
                        if (lines.length > 2) {
                            lines[1] = lines[1].substring(0, 3) + '...'; // 2行目を3文字＋「...」に
                        }
                        
                        stageText.selectAll("tspan")
                            .data(lines.slice(0, 2)) // 最初の2行だけ表示
                            .enter()
                            .append("tspan")
                            .attr("x", stageText.attr("x"))
                            .attr("dy", (d, i) => i === 0 ? 0 : 14) // 2行目は14px下に
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
                    .style("font-size", "18px")
                    .text('👤');
            }

            displayCareers(data.careers);

            const searchInput = document.getElementById('search');
            searchInput.addEventListener('input', function () {
                const keyword = searchInput.value.toLowerCase();
                const filteredCareers = data.careers.filter(career =>
                    career.name.toLowerCase().includes(keyword) ||  // 名前で検索
                    (career.education && career.education.toLowerCase().includes(keyword)) ||  // 大学名で検索
                    career.careerStages.some(stage => stage.stage.toLowerCase().includes(keyword)) ||  // 企業名で検索
                    career.companies.some(company => company.name.toLowerCase().includes(keyword))  // 会社名で検索
                );
                displayCareers(filteredCareers);
            });

            industrySelect.addEventListener('change', function () {
                const selectedIndustry = industrySelect.value;
                const filteredCareers = selectedIndustry
                    ? data.careers.filter(career =>
                        career.companies.some(company => company.industry === selectedIndustry))
                    : data.careers;
                displayCareers(filteredCareers);
            });
        });
});