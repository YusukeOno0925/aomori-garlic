document.addEventListener('DOMContentLoaded', function () {
    fetchPopularCareerStories();

    if (window.innerWidth > 768) {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                fetchPopularCareerStories();
            }, 200);
        });
    }
});

const POPULAR_STATUS_LABELS = {
    online: '活動中',
    recently_active: '最近活動',
    inactive: 'お休み中'
};

function calculateAge(birthYear) {
    if (!birthYear) return '不明';
    return new Date().getFullYear() - birthYear;
}

function fetchPopularCareerStories() {
    const popularStoriesContainer = document.getElementById('popular-stories-list');
    if (!popularStoriesContainer) return;

    popularStoriesContainer.innerHTML = '';

    fetch('/popular-career-stories/')
        .then(response => response.json())
        .then(data => {
            if (!data || !data.careers || data.careers.length === 0) return;

            const userIds = data.careers.map(story => story.id);

            fetch('/users-status/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userIds)
            })
            .then(response => response.json())
            .then(statusData => {
                data.careers.forEach(story => {
                    story.activity_status = statusData?.statuses?.[story.id] || 'inactive';

                    const filteredStory = filterPrivateInfo(story);
                    const storyCard = createStoryCard(filteredStory);
                    popularStoriesContainer.appendChild(storyCard);
                });

                setupIndicators('popular-stories', 'popular-stories-list');
            })
            .catch(error => {
                console.error('オンラインステータス取得中にエラー:', error);

                data.careers.forEach(story => {
                    story.activity_status = 'inactive';

                    const filteredStory = filterPrivateInfo(story);
                    const storyCard = createStoryCard(filteredStory);
                    popularStoriesContainer.appendChild(storyCard);
                });

                setupIndicators('popular-stories', 'popular-stories-list');
            });
        })
        .catch(error => console.error('Error fetching popular career stories:', error));
}

function filterPrivateInfo(story) {
    if (Array.isArray(story.careerStages)) {
        story.careerStages = story.careerStages.map(stage => {
            if (stage.is_private) {
                return { ...stage, stage: '非公開' };
            }
            return stage;
        });
    }

    if (Array.isArray(story.companies)) {
        story.companies = story.companies.map(company => {
            if (company.is_private) {
                return { ...company, name: '非公開' };
            }
            return company;
        });
    }

    return story;
}

function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-story-id', story.id);

    const latestIncome =
        story.income?.length > 0
            ? story.income[story.income.length - 1].income
            : '不明';

    const age = story.birthYear ? calculateAge(story.birthYear) : '不明';
    const activityStatus = story.activity_status || 'inactive';
    const statusLabel = POPULAR_STATUS_LABELS[activityStatus] || POPULAR_STATUS_LABELS.inactive;

    const tags = typeof generateCareerTags === 'function'
        ? generateCareerTags(story)
        : [];

    const cardHeader = `
        <div class="card-header">
            ${tags.length > 0 ? `
                <div class="similar-tags">
                    ${tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join('')}
                </div>
            ` : ''}

            <h3 class="card-title">
                <span class="card-title-text">
                    ${escapeHTML(story.name || '匿名')} / ${escapeHTML(String(age))}歳
                </span>
                <span class="status-badge ${escapeHTML(activityStatus)}">
                    ${escapeHTML(statusLabel)}
                </span>
            </h3>

            <p>職業: ${escapeHTML(story.profession || '不明')}</p>
            <p>年収: ${escapeHTML(String(latestIncome))}</p>
        </div>
    `;

    const careerPathSVG = drawCareerPathD3(story.careerStages, window.innerWidth);

    const viewCountSection = `
        <div class="card-footer">
            <img src="images/eye-icon.png" alt="View Icon" class="view-icon">
            <span class="view-count">${escapeHTML(String(story.view_count || 0))} 回</span>
        </div>
    `;

    card.innerHTML = cardHeader + careerPathSVG + viewCountSection;

    card.addEventListener('click', function () {
        fetch(`/increment-profile-view/${story.id}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const viewCountElement = card.querySelector('.view-count');
                if (viewCountElement) {
                    viewCountElement.textContent = `${data.newViewCount} 回`;
                }
            }
        })
        .catch(error => {
            console.error('閲覧回数の更新中にエラーが発生しました:', error);
        });

        window.location.href = `Career_detail.html?id=${story.id}`;
    });

    return card;
}

function simplifyCareerType(type) {
    if (!type) return '';

    if (type.includes('給与') || type.includes('収入UP')) return '年収UP志向';
    if (type.includes('安定収入')) return '安定志向';
    if (type.includes('ワークライフバランス')) return '働き方重視';
    if (type.includes('フレックス')) return '柔軟な働き方';
    if (type.includes('人間関係')) return '人間関係重視';
    if (type.includes('海外')) return '海外志向';
    if (type.includes('専門技術')) return '専門性UP';
    if (type.includes('マネジメント')) return 'マネジメント志向';
    if (type.includes('起業')) return '起業志向';
    if (type.includes('社会的意義')) return '社会貢献志向';

    return type;
}

function setupIndicators(sectionId, containerId) {
    const indicatorsContainer = document.getElementById(`${sectionId}-indicators`);
    const cardsContainer = document.getElementById(containerId);
    if (!indicatorsContainer || !cardsContainer) return;

    const cards = cardsContainer.querySelectorAll('.card');
    if (!cards.length) return;

    indicatorsContainer.innerHTML = '';

    cards.forEach((card, index) => {
        const indicator = document.createElement('span');
        indicator.className = 'indicator';
        if (index === 0) indicator.classList.add('active');

        indicator.addEventListener('click', () => {
            const cardWidthWithMargin =
                cards[0].offsetWidth + parseInt(getComputedStyle(cards[0]).marginRight || 0);

            cardsContainer.scrollTo({
                left: index * cardWidthWithMargin,
                behavior: 'smooth'
            });

            updateIndicators(sectionId, index);
        });

        indicatorsContainer.appendChild(indicator);
    });

    cardsContainer.addEventListener('scroll', () => {
        const cardWidthWithMargin =
            cards[0].offsetWidth + parseInt(getComputedStyle(cards[0]).marginRight || 0);

        const index = Math.round(cardsContainer.scrollLeft / cardWidthWithMargin);
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

    const svg = d3.create('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMinYMid meet');

    const xScale = d3.scaleLinear()
        .domain([0, stages.length - 1])
        .range([50, width - 50]);

    svg.append('g')
        .selectAll('line')
        .data(stages)
        .enter()
        .append('line')
        .attr('x1', (d, i) => i === 0 ? xScale(0) : xScale(i - 1))
        .attr('y1', height / 2)
        .attr('x2', (d, i) => xScale(i))
        .attr('y2', height / 2)
        .attr('stroke', '#574637')
        .attr('stroke-width', 2);

    svg.append('g')
        .selectAll('circle')
        .data(stages)
        .enter()
        .append('circle')
        .attr('cx', (d, i) => xScale(i))
        .attr('cy', height / 2)
        .attr('r', 5)
        .attr('fill', '#8ba141');

    svg.append('g')
        .selectAll('text.year')
        .data(stages)
        .enter()
        .append('text')
        .attr('x', (d, i) => xScale(i))
        .attr('y', height / 2 - 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(d => d.year);

    svg.append('g')
        .selectAll('text.stage')
        .data(stages)
        .enter()
        .append('text')
        .attr('x', (d, i) => xScale(i))
        .attr('y', height / 2 + 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .each(function (d) {
            const stageText = d3.select(this);
            const originalStage = d.stage || '';
            const stage = originalStage.length > 12
                ? originalStage.substring(0, 12) + '...'
                : originalStage;

            const splitLength = stages.length >= 4 ? 5 : 6;
            const lines = stage.match(new RegExp(`.{1,${splitLength}}`, 'g')) || [];

            if (lines.length > 2) {
                lines[1] = lines[1].substring(0, 3) + '...';
            }

            stageText.selectAll('tspan')
                .data(lines.slice(0, 2))
                .enter()
                .append('tspan')
                .attr('x', stageText.attr('x'))
                .attr('dy', (d, i) => i === 0 ? 0 : 14)
                .text(d => d);
        });

    svg.append('g')
        .selectAll('text.icon')
        .data([stages[stages.length - 1]])
        .enter()
        .append('text')
        .attr('x', xScale(stages.length - 1) + 10)
        .attr('y', height / 2 + 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .text('👤');

    return svg.node().outerHTML;
}

function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&'`"<>]/g, function (match) {
        return {
            '&': '&amp;',
            "'": '&#x27;',
            '`': '&#x60;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;'
        }[match];
    });
}