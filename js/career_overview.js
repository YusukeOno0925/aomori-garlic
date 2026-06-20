document.addEventListener('DOMContentLoaded', function () {
    fetch('/career-overview')
        .then(response => response.json())
        .then(data => {
            // ユーザーIDのリストを取得
            const userIds = data.careers.map(career => career.id);

            // オンラインステータスを取得
            fetch('/users-status/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userIds)
            })
            .then(response => response.json())
            .then(statusData => {
                if (!statusData || !statusData.statuses) {
                    console.error('オンラインステータスの取得に失敗しました');
                    return;
                }

                // オンラインステータスを各キャリアに追加
                data.careers.forEach(career => {
                    career.activity_status = statusData.statuses[career.id] || 'inactive';
                });

                // ここから既存のコードを開始
                const industrySelect = document.getElementById('filter-industry');

                // すべての会社の業界名を取得してセットに追加
                const uniqueIndustries = [...new Set(data.careers.flatMap(career => 
                    (career.companies || []).map(company => company.industry || '不明')
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
                        return "不明";  // 誕生日が入力されていない場合
                    }
                    const currentYear = new Date().getFullYear();
                    return `${currentYear - birthYear}`;
                }

                // ページネーション設定
                let currentPage = 1;
                const itemsPerPage = 10;

                function displayCareers(careers) {
                    const careerList = document.getElementById('career-list');
                    careerList.innerHTML = ''; // 前回の表示をクリア
        
                    // ページネーションに基づいて表示するアイテムを抽出
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const careersToDisplay = careers.slice(startIndex, endIndex);
        
                    careersToDisplay.forEach(career => {
                        const age = calculateAge(career.birthYear);
        
                        const listItem = document.createElement('li');
                        listItem.className = 'career-card';

                        // 将来のキャリアが登録されていれば表示
                        let futureCareerHTML = "";
                        if (career.career_type) {
                            futureCareerHTML = `<p>今後: ${career.career_type}</p>`;
                        }
        
                        // カードをクリックすると閲覧回数をインクリメント
                        listItem.addEventListener('click', function () {
                            // サーバーに閲覧回数のインクリメントを通知
                            fetch(`/increment-profile-view/${career.id}`, {
                                method: 'POST'
                            })
                            .then(response => {
                                if (!response.ok) {
                                    console.error('Failed to increment view count');
                                }
                            })
                            .catch(error => console.error('Error:', error));
        
                            // 詳細ページに遷移
                            window.location.href = `Career_detail.html?id=${career.id}`;
                        });
        
                        // 各ステージ（大学、企業）の情報を取得
                        let stages = career.careerStages.map(stage => ({
                            year: stage.year || '不明', // 年が不明な場合
                            stage: stage.stage || '不明' // ステージが不明な場合
                        }));
        
                        // 閲覧回数の表示を追加
                        const viewCountSection = `
                        <div class="card-footer">
                            <img src="images/eye-icon.png" alt="閲覧数" class="view-icon">
                            <span class="view-count" aria-label="閲覧回数">${career.view_count || 0} 回</span>
                        </div>
                        `;

                        // オンラインステータスの取得（活動中／最近活動／お休み中 の文字付きバッジに変更）
                        const activityStatus = career.activity_status || 'inactive';
                        const statusText = activityStatus === 'online'
                            ? '活動中'
                            : activityStatus === 'recently_active'
                                ? '最近活動'
                                : 'お休み中';
                        const statusBadge = `<span class="status-badge ${activityStatus}">${statusText}</span>`;
        
                        listItem.innerHTML = `
                            <div class="career-info">
                            <h2>${career.name || '不明'} (${age}歳) ${statusBadge}</h2>
                                <p>職業: ${career.profession || '不明'}</p>  <!-- 職業が不明な場合 -->
                                <p>年収: ${career.income[career.income.length - 1]?.income || '不明'}</p>  <!-- 年収が不明な場合 -->
                                <p>${futureCareerHTML}</p>
                            </div>
                            <div class="career-path" id="career-path-${career.id}">
                                <!-- ここにD3.jsで描画されるキャリアパスの図が入る -->
                            </div>
                            ${viewCountSection}  <!-- 閲覧回数を表示 -->
                        `;
        
                        careerList.appendChild(listItem);
        
                        drawCareerPath(`#career-path-${career.id}`, stages);
                    });
        
                    updatePaginationButtons(careers.length);
                }

                // キャリアパスを描画する関数はそのまま
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
                        .style("font-size", "10px")
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

                function updatePaginationButtons(totalItems) {
                    const paginationContainer = document.getElementById('pagination-container');
                    paginationContainer.innerHTML = '';
        
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
        
                    if (totalPages > 1) {
                        if (currentPage > 1) {
                            const prevButton = document.createElement('button');
                            prevButton.textContent = '前へ';
                            prevButton.addEventListener('click', () => {
                                currentPage--;
                                displayCareers(data.careers);
                            });
                            paginationContainer.appendChild(prevButton);
                        }
        
                        const pageInfo = document.createElement('span');
                        pageInfo.textContent = `ページ ${currentPage} / ${totalPages}`;
                        paginationContainer.appendChild(pageInfo);
        
                        if (currentPage < totalPages) {
                            const nextButton = document.createElement('button');
                            nextButton.textContent = '次へ';
                            nextButton.addEventListener('click', () => {
                                currentPage++;
                                displayCareers(data.careers);
                            });
                            paginationContainer.appendChild(nextButton);
                        }
                    }
                }

                displayCareers(data.careers);

                const searchInput = document.getElementById('search');
                searchInput.addEventListener('input', function () {
                    const keyword = searchInput.value.toLowerCase();
                    const filteredCareers = data.careers.filter(career => {
                        const name = career.name?.toLowerCase() || '';  // 名前がnullの場合に備えて
                        const education = career.education?.toLowerCase() || '';  // 大学名がnullの場合に備えて
                        const stages = (career.careerStages || []).some(stage => stage.stage?.toLowerCase().includes(keyword));  // ステージがnullの場合に備えて
                        const companies = (career.companies || []).some(company => company.name?.toLowerCase().includes(keyword));  // 会社名がnullの場合に備えて
                
                        return name.includes(keyword) || education.includes(keyword) || stages || companies;
                    });
                    currentPage = 1;
                    displayCareers(filteredCareers);
                });

                industrySelect.addEventListener('change', function () {
                    const selectedIndustry = industrySelect.value;
                    const filteredCareers = selectedIndustry
                        ? data.careers.filter(career =>
                            (career.companies || []).some(company => company.industry === selectedIndustry))
                        : data.careers;
                    currentPage = 1;
                    displayCareers(filteredCareers);
                });

            })
            .catch(error => console.error('Error fetching user statuses:', error));
        })
        .catch(error => console.error('Error fetching career overview:', error));
});