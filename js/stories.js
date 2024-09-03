document.addEventListener('DOMContentLoaded', function () {
    fetchCareerStories();

    // 画面サイズ変更時に再度fetchCareerStoriesを呼び出す
    window.addEventListener('resize', fetchCareerStories);
});

function fetchCareerStories() {
    const recentStoriesContainer = document.getElementById('recent-stories-list');
    const popularStoriesContainer = document.getElementById('popular-stories-list');

    // コンテナをクリアして再描画
    if (recentStoriesContainer) recentStoriesContainer.innerHTML = '';
    if (popularStoriesContainer) popularStoriesContainer.innerHTML = '';

    fetch('data/careers.json')
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

            // 768px以下の場合にインジケータを生成
            if (window.innerWidth <= 768) {
                setupIndicators('recent-stories', 'recent-stories-list');
                setupIndicators('popular-stories', 'popular-stories-list');
                setIndicatorEvents('recent-stories');
                setIndicatorEvents('popular-stories');
            }
        })
        .catch((error) => console.error('Error fetching career stories:', error));
}

function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => {
        window.location.href = `Career_detail.html?id=${story.id}`;
    };

    const latestIncome = story.income[story.income.length - 1]; // 最新の年齢と年収を取得

    const cardHeader = `
        <div class="card-header">
            <h3>${story.name} (${latestIncome.age}歳)</h3>
            <p>職業:${story.profession}</p>
            <p>年収: ${latestIncome.income}万円</p>
            <span class="arrow-symbol">→</span>
        </div>
    `;

    // 画面サイズに応じて適切なSVG作成関数を呼び出す
    const careerPathSVG = window.innerWidth <= 450
        ? createCareerPathSVGSmallScreen(story.careerStages)
        : createCareerPathSVGDefault(story.careerStages);

    card.innerHTML = cardHeader + careerPathSVG;

    return card;
}

// 450px以上の時のロジック
function createCareerPathSVGDefault(stages) {
    const width = 400;
    const height = 60;
    const padding = 20;
    const lineLength = (width - 2 * padding) / (stages.length + 1);

    let svg = `<svg width="${width}" height="${height}" class="career-path-svg">`;

    svg += `<line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="#000" stroke-width="2" />`;

    stages.forEach((stage, index) => {
        const xPosition = padding + (index + 1) * lineLength;
        const lines = stage.stage.split(/(.{6})/).filter((O) => O);

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
    const totalStages = stages.length;
    const lineLength = (width - 2 * padding) / (totalStages - 1);

    let svg = `<svg width="${width}" height="${height}" class="career-path-svg" viewBox="0 0 ${width} ${height}">`;

    svg += `<line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="#000" stroke-width="2" />`;

    stages.forEach((stage, index) => {
        let xPosition = padding + index * lineLength;

        if (index === totalStages - 1) {
            xPosition -= 20;
        }

        const lines = stage.stage.split(/(.{5})/).filter((O) => O);

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

    const lastStageXPosition = padding + (totalStages - 1) * lineLength;
    svg += `
        <image xlink:href="images/person-icon.png" x="${lastStageXPosition}" y="0" width="20" height="20" />
    `;

    svg += `</svg>`;

    return svg;
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

    // エラー防止：null チェック
    if (!indicatorsContainer || !cards.length)return;

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