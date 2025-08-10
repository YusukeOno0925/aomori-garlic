// ホーム画面のヒーローセクションで使う数字(業界や登録者、QA数など)の取得

// 0→targetValue までカウントアップするアニメーション関数
function animateCount(targetId, targetValue) {
    const el = document.getElementById(targetId);
    const duration = 1200;              // アニメーション全体時間(ms)
    const frameRate = 60;               // FPS
    const totalFrames = Math.round(duration / (1000 / frameRate));
    let frame = 0;
    const countTo = Number(targetValue);

    const counter = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const current = Math.round(countTo * easeOutCubic(progress));
        el.textContent = current.toLocaleString();
        if (frame === totalFrames) {
            clearInterval(counter);
        }
    }, 1000 / frameRate);

    function easeOutCubic(t) {
        return (--t) * t * t + 1;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 🐾 ①：掲載事例数を一時保持する変数を用意
    let storyCount = 0;

    // ① 数値メトリクス (会員数・掲載数・Q&A数) のカウントアップ取得
    fetch('/metrics/')
        .then(res => res.json())
        .then(({ users, stories, qa }) => {
            // アニメーションはこれまでどおり
            animateCount('user-count', users);
            animateCount('story-count', stories);
            animateCount('qa-count', qa);

            // 🐾 取得した stories を保持
            storyCount = stories;

            // 🐾 続けて業界データを取得する
            return fetch('/metrics/industry/');
        })
        .then(res => res.json())
        .then(industryData => {
            const tooltipEl = document.createElement('div');
            tooltipEl.className = 'tooltip';
            document.body.appendChild(tooltipEl);

            industryData.sort((a, b) => b.count - a.count);

            const TOP_N = 3;
            const topList = industryData.slice(0, TOP_N);

            const sumTop = topList.reduce((sum, item) => sum + item.count, 0);
            const otherCount = storyCount - sumTop;
            if (otherCount > 0) topList.push({ industry: 'その他', count: otherCount });

            const labels = topList.map(item => item.industry);
            const values = topList.map(item => item.count);

            // ％計算は実際に描く値の合計で
            const totalForPct = values.reduce((a, b) => a + b, 0);

            const colors = ['#6AA84F', '#BF8F3A', '#D46A6A', '#CCCCCC'];

            // ── 中央合計テキスト（色を濃色に）──
            const centerTextPlugin = {
                id: 'centerText',
                beforeDraw(chart) {
                    const { ctx, chartArea: { left, top, width, height } } = chart;
                    ctx.save();
                    ctx.font = '600 20px Roboto, system-ui';
                    ctx.fillStyle = '#574637';  // ← 白背景に映える色
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${storyCount.toLocaleString()}人`, left + width / 2, top + height / 2);
                    ctx.restore();
                }
            };

            // DataLabels を使う（CDNでも明示登録が安全）
            if (typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
            }

            const ctx = document.getElementById('industry-pie').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, labels.length),
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: false,
                    cutout: '66%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const pct = totalForPct ? Math.round(value / totalForPct * 100) : 0;
                                // 小さすぎるスライスは表示しない
                                return pct >= 4 ? `${pct}%` : '';
                            },
                            color: '#fff',
                            font: { weight: '700', size: 12 },
                            clamp: true,
                            clip: false,
                            anchor: 'center',
                            align: 'center'
                        },
                        centerText: {}
                    }
                },
                plugins: [centerTextPlugin]
            });

            // ── HTML凡例（％付き）──
            const legendEl = document.getElementById('industry-legend');
            legendEl.innerHTML = labels.map((fullLabel, i) => {
                const pct = totalForPct ? Math.round(values[i] / totalForPct * 100) : 0;
                const short = fullLabel.length > 12 ? fullLabel.slice(0, 12) + '…' : fullLabel;
                return `
                    <li>
                        <span class="legend-box" style="background:${colors[i]};"></span>
                        <span class="legend-text" title="${fullLabel}">${short}</span>
                        <span class="legend-pct">${pct}%</span>
                    </li>
                `;
            }).join('');

            // ── カスタムツールチップ（人数表示のまま）──
            document.getElementById('industry-pie').addEventListener('mousemove', e => {
                const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (!points.length) { tooltipEl.style.opacity = 0; return; }
                const idx = points[0].index;
                tooltipEl.textContent = `${chart.data.labels[idx]}: ${chart.data.datasets[0].data[idx]}人`;

                tooltipEl.style.left = '0px';
                tooltipEl.style.top  = '0px';
                tooltipEl.style.opacity = 1;
                const ttRect = tooltipEl.getBoundingClientRect();
                const margin = 8;
                let leftPos = e.pageX + margin;
                let topPos  = e.pageY + margin;
                if (leftPos + ttRect.width > window.pageXOffset + window.innerWidth) leftPos = e.pageX - ttRect.width - margin;
                if (topPos + ttRect.height > window.pageYOffset + window.innerHeight) topPos = e.pageY - ttRect.height - margin;
                tooltipEl.style.left = `${leftPos}px`;
                tooltipEl.style.top  = `${topPos}px`;
            });
            document.getElementById('industry-pie').addEventListener('mouseleave', () => {
                tooltipEl.style.opacity = 0;
            });
        })
        .catch(err => console.error('業界メトリクス取得エラー:', err));
});