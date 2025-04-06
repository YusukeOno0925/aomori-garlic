document.addEventListener('DOMContentLoaded', function () {
    // ログイン状態をチェックして、似たキャリアストーリーを取得する
    checkLoginStatus().then(isLoggedIn => {
        fetchSimilarCareerStories(isLoggedIn);
    });

    // リサイズ時にも再取得（デスクトップの場合）
    if (window.innerWidth > 768) {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                checkLoginStatus().then(isLoggedIn => {
                    fetchSimilarCareerStories(isLoggedIn);
                });
            }, 200);
        });
    }
});

function checkLoginStatus() {
    return fetch('/check-login-status/', { credentials: 'include' })
        .then(response => {
            // 401の場合は未ログインと判断
            if (response.status === 401) {
                return false;
            }
            return response.ok;
        })
        .catch(() => false);
}

function fetchSimilarCareerStories(isLoggedIn) {
    const listContainer = document.getElementById('similar-stories-list');
    const indicatorsContainer = document.getElementById('similar-stories-indicators');
    const desc = document.getElementById('similar-stories-description');

    // クリア
    listContainer.innerHTML = '';
    indicatorsContainer.innerHTML = '';

    if (!isLoggedIn) {
        // 未ログインの場合は dummy データ（5件分）を使用
        const dummyStories = [
            {
                id: 'dummy1',
                name: '山田 太郎',
                age: 30,
                profession: 'エンジニア',
                latestIncome: '500万円',
                career_type: '技術職',
                view_count: 120,
                careerStages: [
                    { year: 2010, stage: '大学入学' },
                    { year: 2014, stage: '大卒就職' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'dummy2',
                name: '佐藤 花子',
                age: 28,
                profession: 'マーケター',
                latestIncome: '450万円',
                career_type: 'クリエイティブ',
                view_count: 90,
                careerStages: [
                    { year: 2012, stage: '大学入学' },
                    { year: 2016, stage: '就職' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'dummy3',
                name: '鈴木 次郎',
                age: 35,
                profession: 'プロジェクトマネージャー',
                latestIncome: '600万円',
                career_type: '管理職',
                view_count: 200,
                careerStages: [
                    { year: 2008, stage: '大学入学' },
                    { year: 2012, stage: '就職' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'dummy4',
                name: '高橋 三郎',
                age: 32,
                profession: 'デザイナー',
                latestIncome: '480万円',
                career_type: 'クリエイティブ',
                view_count: 150,
                careerStages: [
                    { year: 2011, stage: '大学入学' },
                    { year: 2015, stage: '就職' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'dummy5',
                name: '伊藤 四郎',
                age: 29,
                profession: '営業',
                latestIncome: '400万円',
                career_type: '営業',
                view_count: 80,
                careerStages: [
                    { year: 2013, stage: '大学入学' },
                    { year: 2017, stage: '就職' }
                ],
                activity_status: 'inactive'
            }
        ];
        listContainer.style.display = 'flex';
        desc.textContent = "ログインすると詳細が見れます。";
        dummyStories.forEach(story => {
            const card = createSimilarStoryCard(story, false);
            listContainer.appendChild(card);
        });
        setupIndicators('similar-stories', 'similar-stories-list');
    } else {
        // ログイン済みの場合、APIからデータを取得
        fetch('/similar-career-stories/', { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                if (!data || !data.careers || data.careers.length === 0) {
                    desc.textContent = "該当するユーザー事例が見つかりませんでした。";
                    return;
                }
                desc.textContent = "あなたの業界/職種/年齢帯等が近いユーザのストーリーを表示しています。";
                listContainer.style.display = 'flex';
                indicatorsContainer.removeAttribute('style');
                data.careers.forEach(story => {
                    const card = createSimilarStoryCard(story, true);
                    listContainer.appendChild(card);
                });
                setupIndicators('similar-stories', 'similar-stories-list');
            })
            .catch(error => {
                console.error('Error fetching similar career stories:', error);
                desc.textContent = "エラーが発生しました。";
            });
    }
}

function createSimilarStoryCard(story, isLoggedIn) {
    const card = document.createElement('div');
    // 未ログインなら preview-blur クラスを付与
    card.className = isLoggedIn ? 'card' : 'card preview-blur';
    card.setAttribute('data-story-id', story.id);

    // カードの内部HTMLを構築（XSS対策として escapeHTML() を利用）
    card.innerHTML = `
      <div class="card-header">
        <h3>${escapeHTML(story.name)} (${escapeHTML(String(story.age))}歳)
          <span class="status-dot ${escapeHTML(story.activity_status || 'inactive')}"></span>
        </h3>
        <p>職業: ${escapeHTML(story.profession || '不明')}</p>
        <p>年収: ${escapeHTML(story.latestIncome || '不明')}</p>
        ${story.career_type ? `<p>今後: ${escapeHTML(story.career_type)}</p>` : ''}
      </div>
      ${drawCareerPathD3(story.careerStages, window.innerWidth)}
      <div class="card-footer">
        <img src="images/eye-icon.png" alt="View Icon" class="view-icon">
        <span class="view-count">${escapeHTML(String(story.view_count || 0))} 回</span>
      </div>
      ${!isLoggedIn ? '<div class="overlay">ログインすると詳細が見れます</div>' : ''}
    `;

    // カードクリック時の処理
    card.addEventListener('click', function () {
        handleCardClick(card);
    });

    return card;
}

function handleCardClick(cardElement) {
    checkLoginStatus().then(isLoggedIn => {
        if (!isLoggedIn) {
            window.location.href = 'Login.html';
        } else {
            const careerId = cardElement.getAttribute('data-story-id');
            // 閲覧回数更新のAPI呼び出し
            fetch(`/increment-profile-view/${careerId}`, { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = `Career_detail.html?id=${careerId}`;
                    } else {
                        console.error('閲覧回数の更新に失敗しました:', data.message);
                        window.location.href = `Career_detail.html?id=${careerId}`;
                    }
                })
                .catch(error => {
                    console.error('閲覧回数更新中にエラーが発生しました:', error);
                    window.location.href = `Career_detail.html?id=${careerId}`;
                });
        }
    });
}

function isUserLoggedIn() {
    return Boolean(document.cookie.match(/access_token/));
}

function setupIndicators(sectionId, containerId) {
    const indicatorsContainer = document.getElementById(`${sectionId}-indicators`);
    const cardsContainer = document.getElementById(containerId);
    const cards = cardsContainer.querySelectorAll('.card');

    if (!indicatorsContainer || !cards.length) return;
    indicatorsContainer.style.display = 'flex';
    indicatorsContainer.innerHTML = '';

    cards.forEach((card, index) => {
        const indicator = document.createElement('span');
        indicator.className = 'indicator';
        if (index === 0) indicator.classList.add('active');
        indicator.addEventListener('click', () => {
            const cardWidthWithMargin = cards[0].offsetWidth + parseInt(getComputedStyle(cards[0]).marginRight);
            const scrollAmount = index * cardWidthWithMargin;
            cardsContainer.scrollTo({ left: scrollAmount, behavior: 'smooth' });
            updateIndicators(sectionId, index);
        });
        indicatorsContainer.appendChild(indicator);
    });
    cardsContainer.addEventListener('scroll', () => {
        const cardWidthWithMargin = cards[0].offsetWidth + parseInt(getComputedStyle(cards[0]).marginRight);
        const scrollLeft = cardsContainer.scrollLeft;
        const index = Math.round(scrollLeft / cardWidthWithMargin);
        updateIndicators(sectionId, index);
    });
}

function updateIndicators(sectionId, activeIndex) {
    const indicators = document.querySelectorAll(`#${sectionId}-indicators .indicator`);
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === activeIndex);
    });
}

function drawCareerPathD3(stages, screenWidth) {
    if (!stages || stages.length === 0) {
        return '<p>キャリアステージのデータがありません。</p>';
    }
    const width = screenWidth <= 450 ? 300 : 400;
    const height = 100;
    const svg = d3.create("svg")
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
            let stage = d.stage.length > 12 ? d.stage.substring(0, 12) + '...' : d.stage;
            const splitLength = stages.length >= 4 ? 5 : 6;
            const lines = stage.match(new RegExp(`.{1,${splitLength}}`, 'g'));
            if (lines.length > 2) {
                lines[1] = lines[1].substring(0, 3) + '...';
            }
            stageText.selectAll("tspan")
                .data(lines.slice(0, 2))
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
        .attr("x", xScale(stages.length - 1) + 10)
        .attr("y", height / 2 + 5)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text('👤');
    return svg.node().outerHTML;
}

function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&'`"<>]/g, function(match) {
         return { '&': '&amp;', "'": '&#x27;', '`': '&#x60;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[match];
    });
}