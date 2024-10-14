document.addEventListener('DOMContentLoaded', function () {
    fetchRecentCareerStories();

    if (window.innerWidth > 768) {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                fetchRecentCareerStories();
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

// 最近のキャリアストーリーを取得して表示
function fetchRecentCareerStories() {
    const recentStoriesContainer = document.getElementById('recent-stories-list');

    if (recentStoriesContainer) recentStoriesContainer.innerHTML = '';

    fetch('/recent-career-stories/')
        .then((response) => response.json())
        .then((data) => {
            // 最近のキャリアストーリーを表示
            data.careers.forEach((story) => {
                const storyCard = createStoryCard(story);
                recentStoriesContainer.appendChild(storyCard);
            });

            adjustSVGWidth();  // SVGのサイズを調整

            if (window.innerWidth <= 768) {
                setupIndicators('recent-stories', 'recent-stories-list');
            }
        })
        .catch((error) => console.error('Error fetching recent career stories:', error));
}

// キャリアカードを生成
function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => {
        window.location.href = `Career_detail.html?id=${story.id}`;
    };

    const latestIncome = story.income[story.income.length - 1].income || "不明"; // 最新の年収
    const age = story.birthYear ? calculateAge(story.birthYear) : '不明'; // 年齢

    const cardHeader = `
        <div class="card-header">
            <h3>${story.name} (${age}歳)</h3>
            <p>職業: ${story.profession}</p>
            <p>年収: ${latestIncome}</p>
        </div>
    `;

    // キャリアパスのグラフ描画（D3.jsを使用）
    const careerPathSVG = drawCareerPathD3(story.careerStages, window.innerWidth);

    card.innerHTML = cardHeader + careerPathSVG;

    return card;
}

// インジケータを設定する関数
function setupIndicators(sectionId, containerId) {
    const indicatorsContainer = document.getElementById(`${sectionId}-indicators`);
    const cards = document.querySelectorAll(`#${containerId} .card`);

    if (!indicatorsContainer || !cards.length) return;

    indicatorsContainer.innerHTML = '';

    cards.forEach((card, index) => {
        const indicator = document.createElement('span');
        indicator.className = 'indicator';
        if (index === 0) indicator.classList.add('active');
        indicator.addEventListener('click', () => {
            card.scrollIntoView({ behavior: 'smooth' });
            updateIndicators(sectionId, index);
        });
        indicatorsContainer.appendChild(indicator);
    });
}

// インジケータのアクティブ状態を更新する関数
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