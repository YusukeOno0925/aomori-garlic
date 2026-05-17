// ─── ステータスごとの日本語ラベル ───
const STATUS_LABELS = {
    online:         '在席中',
    recently_active:'最近活動',
    inactive:       'お休み中'
  };

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

function calculateAge(birthYear) {
    if (!birthYear) return "不明";
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
}

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
                id: 'preview1',
                name: 'Kaito',
                birthYear: 1996,
                profession: '法人営業',
                income: [{ income: '401〜500万円' }],
                career_type: 'やりがい軸(マネジメント職につきたい)',
                view_count: 128,
                tags: ['20代後半', '営業→IT', '年収UP'],
                careerStages: [
                    { year: 2015, stage: '関西大学入学' },
                    { year: 2019, stage: '人材会社で営業' },
                    { year: 2023, stage: 'IT企業へ転職' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'preview2',
                name: 'Haru',
                birthYear: 1997,
                profession: 'マーケター',
                income: [{ income: '301〜400万円' }],
                career_type: '環境軸(ワークライフバランスを重視したい)',
                view_count: 94,
                tags: ['20代後半', '広告→事業会社', '働き方重視'],
                careerStages: [
                    { year: 2016, stage: '大学入学' },
                    { year: 2020, stage: '広告代理店' },
                    { year: 2022, stage: '事業会社へ転職' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'preview3',
                name: 'Rin',
                birthYear: 1992,
                profession: 'ITエンジニア',
                income: [{ income: '501〜600万円' }],
                career_type: 'やりがい軸(専門技術を極めたい)',
                view_count: 210,
                tags: ['30代前半', 'SIer→Web', '専門性UP'],
                careerStages: [
                    { year: 2011, stage: '大学入学' },
                    { year: 2015, stage: 'SIer就職' },
                    { year: 2021, stage: 'Web企業へ転職' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'preview4',
                name: '30代前半・企画職',
                birthYear: 1991,
                profession: '事業企画',
                income: [{ income: '601〜700万円' }],
                career_type: 'お金軸(給与を上げたい)',
                view_count: 176,
                tags: ['30代前半', 'メーカー→企画', '年収UP'],
                careerStages: [
                    { year: 2010, stage: '大学入学' },
                    { year: 2014, stage: 'メーカー就職' },
                    { year: 2019, stage: '企画職へ異動' }
                ],
                activity_status: 'inactive'
            },
            {
                id: 'preview5',
                name: '20代後半・営業職',
                birthYear: 1995,
                profession: '個人営業',
                income: [{ income: '301〜400万円' }],
                career_type: '環境軸(人間関係が良い環境を重視したい)',
                view_count: 83,
                tags: ['20代後半', '営業職', '転職検討中'],
                careerStages: [
                    { year: 2014, stage: '大学入学' },
                    { year: 2018, stage: '営業職就職' },
                    { year: 2022, stage: '転職検討中' }
                ],
                activity_status: 'inactive'
            }
        ];
        listContainer.style.display = 'flex';
        desc.textContent = "登録すると、学歴・職種・年齢などが近い人のキャリア事例を見つけやすくなります。";
        dummyStories.forEach((story, index) => {
            const card = createSimilarStoryCard(story, false, index === 0);
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

                // ユーザーIDの配列を作成
                const userIds = data.careers.map(story => story.id);
                // オンラインステータスの取得
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
                    // 各ストーリーにオンラインステータスを設定する
                    data.careers.forEach((story) => {
                        story.activity_status = statusData.statuses[story.id] || 'inactive';
                    });
                    // カードを生成して表示する
                    data.careers.forEach(story => {
                        const card = createSimilarStoryCard(story, true);
                        listContainer.appendChild(card);
                    });
                    setupIndicators('similar-stories', 'similar-stories-list');
                })
                .catch(error => {
                    console.error('オンラインステータス取得中にエラー:', error);
                    // エラー時はデフォルトのステータスでカードを生成
                    data.careers.forEach(story => {
                        story.activity_status = 'inactive';
                        const card = createSimilarStoryCard(story, true);
                        listContainer.appendChild(card);
                    });
                    setupIndicators('similar-stories', 'similar-stories-list');
                });
            })
            .catch(error => {
                console.error('Error fetching similar career stories:', error);
                desc.textContent = "エラーが発生しました。";
            });
        }
    }

function createSimilarStoryCard(story, isLoggedIn, showPreview = false) {
    const card = document.createElement('div');
    card.className = (!isLoggedIn && !showPreview) ? 'card preview-blur' : 'card';
    card.setAttribute('data-story-id', story.id);

    const age = story.birthYear ? calculateAge(story.birthYear) : "不明";
    const latestIncome = story.income && story.income.length > 0 
                            ? story.income[story.income.length - 1].income 
                            : "不明";

    // カードの内部HTMLを構築（XSS対策として escapeHTML() を利用）
    const status = story.activity_status || 'inactive';
    card.innerHTML = `
        <div class="card-header">
            ${generateCareerTags(story).length > 0 ? `
            <div class="similar-tags">
                ${generateCareerTags(story)
                    .map(tag => `<span>${escapeHTML(tag)}</span>`)
                    .join('')}
            </div>
        ` : ''}
            <h3 class="card-title">
                <span class="card-title-text">
                    ${escapeHTML(story.name)}  / ${age}歳 
                </span>
                <span class="status-badge ${status}">
                    ${STATUS_LABELS[status]}
                </span>
            </h3>
            <p>職業: ${escapeHTML(story.profession || '不明')}</p>
            <p>年収: ${escapeHTML(String(latestIncome))}</p>
        </div>
        ${drawCareerPathD3(story.careerStages, window.innerWidth)}
        <div class="card-footer">
            <img src="images/eye-icon.png" alt="View Icon" class="view-icon">
            <span class="view-count">${escapeHTML(String(story.view_count || 0))} 回</span>
        </div>
        ${(!isLoggedIn && !showPreview) ? '<div class="overlay">無料登録すると、あなたに近い事例を探せます</div>' : ''}
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