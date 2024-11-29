document.addEventListener('DOMContentLoaded', function () {
    fetchPopularCareerStories();

    if (window.innerWidth > 768) {
        // デスクトップ画面ではリサイズイベントを設定
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                fetchPopularCareerStories();
            }, 200);
        });
    }
});

function calculateAge(birthYear) {
    if (!birthYear) return "不明";
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
}

function adjustSVGWidth() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        const svg = card.querySelector('svg');
        const cardWidth = card.getBoundingClientRect().width;

        // if (window.innerWidth <= 450) {
        //     svg.setAttribute('width', cardWidth - 20);
        // } else {
        //     svg.setAttribute('width', cardWidth - 40);
        // }
    });
}

// 人気のキャリアストーリーを取得して表示
function fetchPopularCareerStories() {
    const popularStoriesContainer = document.getElementById('popular-stories-list');

    if (popularStoriesContainer) popularStoriesContainer.innerHTML = '';

    fetch('/popular-career-stories/')
        .then((response) => response.json())
        .then((data) => {
            const userIds = data.careers.map(story => story.id);
            // ユーザーのオンラインステータスを取得
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
                // オンラインステータスを各ストーリーに追加
                data.careers.forEach((story) => {
                    story.activity_status = statusData.statuses[story.id] || 'inactive';
                    const filteredStory = filterPrivateInfo(story);
                    const storyCard = createStoryCard(filteredStory);
                    popularStoriesContainer.appendChild(storyCard);
                });

                adjustSVGWidth();

                if (window.innerWidth <= 768) {
                    setupIndicators('popular-stories', 'popular-stories-list');
                    // 初期表示時にインジケータを更新
                    const cardsContainer = document.getElementById('popular-stories-list');
                    const cardWidth = cardsContainer.querySelector('.card').offsetWidth + parseInt(getComputedStyle(cardsContainer.querySelector('.card')).marginRight);
                    const scrollLeft = cardsContainer.scrollLeft;
                    const index = Math.round(scrollLeft / cardWidth);
                    updateIndicators('popular-stories', index);
                } else {
                    setupIndicators('popular-stories', 'popular-stories-list');
                }
            });
        })
        .catch((error) => console.error('Error fetching popular career stories:', error));
}

// 非公開情報をフィルタリングする関数
function filterPrivateInfo(story) {
    story.careerStages = story.careerStages.map(stage => {
        if (stage.is_private) {
            stage.stage = '非公開';
        }
        return stage;
    });

    story.companies = story.companies.map(company => {
        if (company.is_private) {
            company.name = '非公開';
        }
        return company;
    });

    return story;
}

// キャリアカードを生成
function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-story-id', story.id); // データ属性を追加

    // カードクリック時のイベントリスナーを追加
    card.addEventListener('click', function () {
        // 閲覧回数を増やすAPIリクエスト
        fetch(`/increment-profile-view/${story.id}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 表示されている閲覧回数を更新
                const viewCountElement = card.querySelector('.view-count');
                viewCountElement.textContent = `${data.newViewCount} 回`;
            } else {
                console.error('閲覧回数の更新に失敗しました:', data.message);
            }
        })
        .catch(error => {
            console.error('閲覧回数の更新中にエラーが発生しました:', error);
        });

        // 詳細ページへリダイレクト
        window.location.href = `Career_detail.html?id=${story.id}`;
    });

    const latestIncome = story.income?.length > 0 ? story.income[story.income.length - 1].income : "不明";
    const age = story.birthYear ? calculateAge(story.birthYear) : '不明';

    // オンラインステータスの取得
    const activityStatus = story.activity_status || 'inactive';

    const cardHeader = `
        <div class="card-header">
            <h3>${story.name} (${age}歳)
                <span class="status-dot ${activityStatus}"></span>
            </h3>
            <p>職業: ${story.profession}</p>
            <p>年収: ${latestIncome}</p>
        </div>
    `;

    // キャリアパスのグラフ描画
    const careerPathSVG = drawCareerPathD3(story.careerStages, window.innerWidth);

    // 閲覧回数の表示を追加
    const viewCountSection = `
        <div class="card-footer">
            <img src="images/eye-icon.png" alt="View Icon" class="view-icon">
            <span class="view-count">${story.view_count || 0} 回</span>
        </div>
    `;

    card.innerHTML = cardHeader + careerPathSVG + viewCountSection;

    return card;
}

// インジケータを設定する関数
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
            const cardsToScroll = window.innerWidth > 768 ? index : index;
            const scrollAmount = cardsToScroll * (cards[0].offsetWidth + parseInt(getComputedStyle(cards[0]).marginRight));
            cardsContainer.scrollTo({ left: scrollAmount, behavior: 'smooth' });
            updateIndicators(sectionId, index);
        });
        indicatorsContainer.appendChild(indicator);
    });

    // スクロールイベントリスナーを追加
    cardsContainer.addEventListener('scroll', () => {
        const cardWidthWithMargin = cards[0].offsetWidth + parseInt(getComputedStyle(cards[0]).marginRight);
        const scrollLeft = cardsContainer.scrollLeft;
        const index = Math.round(scrollLeft / cardWidthWithMargin);
        updateIndicators(sectionId, index);
    });
}

// インジケータのアクティブ状態を更新する
function updateIndicators(sectionId, activeIndex) {
    const indicators = document.querySelectorAll(`#${sectionId}-indicators .indicator`);
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === activeIndex);
    });
}

// D3.jsを使用してキャリアパスを描画する関数
function drawCareerPathD3(stages, screenWidth) {
    if (!stages || stages.length === 0) {
        return '<p>キャリアステージのデータがありません。</p>';
    }

    const width = screenWidth <= 450 ? 300 : 400; // 画面幅に応じてサイズを変更
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

    // 年を表示
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

    // ステージ名を表示
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
            
            // ステージ数が4つ以上の場合、切り返しの文字数を5文字に変更
            const splitLength = stages.length >= 4 ? 5 : 6;
            const lines = stage.match(new RegExp(`.{1,${splitLength}}`, 'g')); // 切り返しの文字数を動的に設定

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
    
    // 人アイコンを表示
    svg.append("g")
        .selectAll("text.icon")
        .data([stages[stages.length - 1]])  // 最後のステージに対して表示
        .enter()
        .append("text")
        .attr("x", xScale(stages.length - 1) + 10)  // アイコンを少し右に移動
        .attr("y", height / 2 + 5)  // Y座標を調整
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text('👤');  // 人アイコンのテキスト

    return svg.node().outerHTML; // SVGをHTMLに変換して返す
}