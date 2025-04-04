document.addEventListener('DOMContentLoaded', function () {
    checkLoginStatus().then(isLoggedIn => {
        if (!isLoggedIn) {
            const desc = document.getElementById('similar-stories-description');
            desc.textContent = "ログインすると、あなたと似たユーザ事例が表示されます！";
            return;
        }
        fetchSimilarCareerStories();
    });

    if (window.innerWidth > 768) {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                fetchSimilarCareerStories();
            }, 200);
        });
    }
});

function checkLoginStatus() {
    return fetch('/check-login-status/', { credentials: 'include' })
        .then(response => response.ok)
        .catch(() => false);
}

function fetchSimilarCareerStories() {
    const listContainer = document.getElementById('similar-stories-list');
    const indicatorsContainer = document.getElementById('similar-stories-indicators');
    const desc = document.getElementById('similar-stories-description');

    // クリア
    listContainer.innerHTML = '';
    indicatorsContainer.innerHTML = '';

    fetch('/similar-career-stories/', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            if (!data || !data.careers || data.careers.length === 0) {
                desc.textContent = "該当するユーザー事例が見つかりませんでした。";
                return;
            }
            desc.textContent = "あなたの業界/職種/年齢帯等が近いユーザのストーリーを表示しています。";
            // カードコンテナは flex に設定
            listContainer.style.display = 'flex';
            // インジケータはCSS側のスタイルに任せるため、inline styleは削除
            indicatorsContainer.removeAttribute('style');

            // カード生成
            data.careers.forEach(story => {
                const storyCard = createStoryCard(story);
                listContainer.appendChild(storyCard);
            });

            // カルーセルインジケータを設定（最近のキャリアストーリーと同じ仕組み）
            setupIndicators('similar-stories', 'similar-stories-list');
        })
        .catch(error => {
            console.error('Error fetching similar career stories:', error);
            desc.textContent = "エラーが発生しました。";
        });
}

function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-story-id', story.id);

    // カードクリック → 詳細ページへ
    card.addEventListener('click', function () {
        // 閲覧回数を更新するAPI呼び出し
        fetch(`/increment-profile-view/${story.id}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // カード内の閲覧回数表示を更新（必要に応じて）
                const viewCountElement = card.querySelector('.view-count');
                if (viewCountElement) {
                    viewCountElement.textContent = `${data.newViewCount} 回`;
                }
            } else {
                console.error('閲覧回数の更新に失敗しました:', data.message);
            }
        })
        .catch(error => {
            console.error('閲覧回数の更新中にエラーが発生しました:', error);
        });
        window.location.href = `Career_detail.html?id=${story.id}`;
    });

    const latestIncome = story.income && story.income.length > 0
        ? story.income[story.income.length - 1].income
        : "不明";
    const age = story.birthYear ? (new Date().getFullYear() - story.birthYear) : '不明';
    const activityStatus = story.activity_status || 'inactive';

    let careerTypeHTML = "";
    if (story.career_type) {
        careerTypeHTML = `<p>今後: ${story.career_type}</p>`;
    }

    const cardHeader = `
      <div class="card-header">
        <h3>${story.name} (${age}歳)
          <span class="status-dot ${activityStatus}"></span>
        </h3>
        <p>職業: ${story.profession || '不明'}</p>
        <p>年収: ${latestIncome}</p>
        ${careerTypeHTML}
      </div>
    `;

    const careerPathSVG = drawCareerPathD3(story.careerStages, window.innerWidth);

    const viewCountSection = `
      <div class="card-footer">
        <img src="images/eye-icon.png" alt="View Icon" class="view-icon">
        <span class="view-count">${story.view_count || 0} 回</span>
      </div>
    `;

    card.innerHTML = cardHeader + careerPathSVG + viewCountSection;
    return card;
}

function setupIndicators(sectionId, containerId) {
    const indicatorsContainer = document.getElementById(`${sectionId}-indicators`);
    const cardsContainer = document.getElementById(containerId);
    const cards = cardsContainer.querySelectorAll('.card');

    if (!indicatorsContainer || !cards.length) return;

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

    // 線を描画
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

    // ステージごとの丸を描画
    svg.append("g")
        .selectAll("circle")
        .data(stages)
        .enter()
        .append("circle")
        .attr("cx", (d, i) => xScale(i))
        .attr("cy", height / 2)
        .attr("r", 5)
        .attr("fill", "#8ba141");

    // 年の表示
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

    // ステージ名の表示
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

    // 人アイコンの表示
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