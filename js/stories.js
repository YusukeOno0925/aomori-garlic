document.addEventListener('DOMContentLoaded', function () {
    fetchCareerStories();

    if (window.innerWidth > 768) {
        // デスクトップのみリサイズイベントを設定
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                fetchCareerStories();
            }, 200);
        });
    }
});

function fetchCareerStories() {
    const recentStoriesContainer = document.getElementById('recent-stories-list');
    const popularStoriesContainer = document.getElementById('popular-stories-list');

    // コンテナをクリアして再描画
    if (recentStoriesContainer) recentStoriesContainer.innerHTML = '';
    if (popularStoriesContainer) popularStoriesContainer.innerHTML = '';

    fetch('/career-overview/')
        .then((response) => response.json())
        .then((data) => {
            // 最近のキャリアストーリーを表示
            if (recentStoriesContainer) {
                data.careers.slice(0, 3).forEach((story) => {
                    const storyCard = createStoryCard(story);
                    recentStoriesContainer.appendChild(storyCard);
                });
            }

            // 人気のキャリアストーリーを表示
            if (popularStoriesContainer) {
                data.careers.slice(3, 6).forEach((story) => {
                    const storyCard = createStoryCard(story);
                    popularStoriesContainer.appendChild(storyCard);
                });
            }

            // SVGの幅を調整
            adjustSVGWidth();

            // インジケータを設定（768px以下の場合）
            if (window.innerWidth <= 768) {
                setupIndicators('recent-stories', 'recent-stories-list');
                setupIndicators('popular-stories', 'popular-stories-list');
                setIndicatorEvents('recent-stories');
                setIndicatorEvents('popular-stories');
            }
        })
        .catch((error) => console.error('Error fetching career stories:', error));
}

// ストーリーカードを作成する
function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => {
        window.location.href = `Career_detail.html?id=${story.id}`;
    };

    const latestIncome = story.income[story.income.length - 1]; // 最新の年収を取得
    const age = story.birthYear ? calculateAge(story.birthYear) : 'null'; // 年齢を計算

    // 年収の「万円」を正しく表示
    const incomeText = latestIncome.income.includes('万円') ? latestIncome.income : `${latestIncome.income}万円`;

    const cardHeader = `
        <div class="card-header">
            <h3>${story.name} (${age}歳)</h3>
            <p>職業:${story.profession}</p>
            <p>年収: ${incomeText}</p>
            <span class="arrow-symbol">→</span>
        </div>
    `;

    // グラフの描画（D3.jsで描画）
    const careerPathSVG = drawCareerPathD3(story.careerStages, window.innerWidth);

    card.innerHTML = cardHeader + careerPathSVG;

    return card;
}

// D3.jsを使用してキャリアパスのグラフを描画する
function drawCareerPathD3(stages, screenWidth) {
    const width = screenWidth <= 450 ? 300 : 400; // 画面幅に応じてサイズを変更
    const height = 100;
    
    // D3.jsを使ったSVG描画
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
        .data([stages[stages.length - 1]])
        .enter()
        .append("text")
        .attr("x", xScale(stages.length - 1) + 10)
        .attr("y", height / 2 + 5)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text('👤');

    return svg.node().outerHTML; // SVGをHTMLに変換して返す
}

// 450px以上の時のロジック
function createCareerPathSVGDefault(stages) {
    const width = 400;
    const height = 60;
    const padding = 20;

    if (!stages || stages.length === 0) {
        console.error("ステージデータが不正です");
        return "";
    }

    const lineLength = (width - 2 * padding) / (stages.length + 1);

    let svg = `<svg width="${width}" height="${height}" class="career-path-svg">`;

    svg += `<line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="#000" stroke-width="2" />`;

    stages.forEach((stage, index) => {
        const xPosition = padding + (index + 1) * lineLength;

        // 学歴や会社名を3行以内に制限し、4行目を省略
        let lines = stage.stage.split(/(.{6})/).filter((O) => O);
        if (lines.length > 3) {
            lines = lines.slice(0, 3); // 最初の3行を取得
            lines[2] = `${lines[2]}...`; // 3行目に「...」を追加
        }

        let tspanElements = '';
        lines.forEach((line, i) => {
            tspanElements += `<tspan x="${xPosition}" dy="${i === 0 ? 0 : 14}">${line}</tspan>`;
        });

        svg += `
            <line x1="${xPosition}" y1="${height / 2 - 10}" x2="${xPosition}" y2="${height / 2 + 10}" stroke="#000" stroke-width="2" />
            <text x="${xPosition}" y="${height - 10}" text-anchor="middle" font-size="10">${tspanElements}</text>
            <text x="${xPosition}" y="${height / 2 - 20}" text-anchor="middle" font-size="12">${stage.year}</text>
        `;
    });

    svg += `
        <image xlink:href="images/person-icon.png" x="${width - padding - lineLength + 15}" y="0" width="20" height="20" />
    `;

    svg += `</svg>`;

    return svg;
}

// 450px以下の時のロジック
function createCareerPathSVGSmallScreen(stages) {
    const width = 400;
    const height = 60;
    const padding = 5;

    if (!stages || stages.length === 0) {
        console.error("ステージデータが不正です");
        return '';
    }

    const totalStages = stages.length;
    const lineLength = totalStages > 1 ? (width - 2 * padding) / (totalStages - 1) : 0;

    let svg = `<svg width="${width}" height="${height}" class="career-path-svg" viewBox="0 0 ${width} ${height}">`;

    svg += `<line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="#000" stroke-width="2" />`;

    stages.forEach((stage, index) => {
        let xPosition = totalStages > 1 ? padding + index * lineLength : width / 2;

        if (index === totalStages - 1 && totalStages > 1) {
            xPosition -= 20;
        }

        let lines = stage.stage.split(/(.{5})/).filter((O) => O);
        if (lines.length > 3) {
            lines = lines.slice(0, 3); // 最初の3行を取得
            lines[2] = `${lines[2]}...`; // 3行目に「...」を追加
        }

        let tspanElements = '';
        lines.forEach((line, i) => {
            tspanElements += `<tspan x="${xPosition}" dy="${i === 0 ? 0 : 14}">${line}</tspan>`;
        });

        svg += `
            <line x1="${xPosition}" y1="${height / 2 - 10}" x2="${xPosition}" y2="${height / 2 + 10}" stroke="#000" stroke-width="2" />
            <text x="${xPosition}" y="${height - 10}" text-anchor="middle" font-size="10">${tspanElements}</text>
            <text x="${xPosition}" y="${height / 2 - 20}" text-anchor="middle" font-size="12">${stage.year}</text>
        `;
    });

    svg += `
        <image xlink:href="images/person-icon.png" x="${totalStages > 1 ? width - padding : width / 2}" y="0" width="20" height="20" />
    `;

    svg += `</svg>`;

    return svg;
}

function calculateAge(birthYear) {
    if (!birthYear) {
        return "null";  // 誕生日が入力されていない場合
    }
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
}

function adjustSVGWidth() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        const svg = card.querySelector('svg');
        const cardWidth = card.getBoundingClientRect().width;

        if (window.innerWidth <= 450) {
            svg.setAttribute('width', cardWidth - 20);
        } else {
            svg.setAttribute('width', cardWidth - 40);
        }
    });
}

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

function setIndicatorEvents(sectionId) {
    const container = document.getElementById(`${sectionId}-stories`);
    if (!container) return;

    const indicators = document.querySelectorAll(`#${sectionId}-indicators .indicator`);
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            container.scrollTo({
                left: container.offsetWidth * index,
                behavior: 'smooth',
            });
            updateIndicators(sectionId, index);
        });
    });

    container.addEventListener('scroll', () => {
        const index = Math.round(container.scrollLeft / container.offsetWidth);
        updateIndicators(sectionId, index);
    });
}

function updateIndicators(sectionId, activeIndex) {
    const indicators = document.querySelectorAll(`#${sectionId}-indicators .indicator`);
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === activeIndex);
    });
}