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
            // ② カスタムツールチップ用の要素を body に追加
            const tooltipEl = document.createElement('div');
            tooltipEl.className = 'tooltip';
            document.body.appendChild(tooltipEl);

            // （念のため）降順ソート
            industryData.sort((a, b) => b.count - a.count);

            // 上位3件を抜き出し
            const TOP_N = 3;
            const topList = industryData.slice(0, TOP_N);

            // 🐾 “その他” は storyCount − 上位3件の合計で算出
            const sumTop = topList.reduce((sum, item) => sum + item.count, 0);
            const otherCount = storyCount - sumTop;

            if (otherCount > 0) {
                topList.push({ industry: 'その他', count: otherCount });
            }

            // ラベルとデータに分割
            const labels = topList.map(item => item.industry);
            const values = topList.map(item => item.count);

            // 🐾 中央表示用 total も storyCount を使う
            const total = storyCount;

            // カラーパレット
            const colors = [
                '#6AA84F', // グリーン
                '#BF8F3A', // アンバー
                '#D46A6A', // ダルコーラル
                '#CCCCCC'  // ライトグレー
            ];

            const centerTextPlugin = {
                id: 'centerText',
                beforeDraw(chart) {
                    const { ctx, chartArea: { left, top, width, height } } = chart;
                    ctx.save();
                    ctx.font = 'bold 20px Roboto';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        `${total.toLocaleString()}人`,   // 🐾 storyCount を表示
                        left + width / 2,
                        top  + height / 2
                    );
                    ctx.restore();
                }
            };

            // Chart.js でドーナツグラフを描画（ネイティブツールチップは無効化）
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
                    cutout: '60%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false },
                        centerText: {}  // プラグイン有効化
                    }
                },
                plugins: [ centerTextPlugin ]
            });

            // HTML 凡例を自前で生成
            const legendEl = document.getElementById('industry-legend');
            const MAX_LEN = 10;
            legendEl.innerHTML = labels.map((fullLabel, i) => {
                const shortLabel = fullLabel.length > MAX_LEN
                    ? fullLabel.slice(0, MAX_LEN) + '…'
                    : fullLabel;
                return `
                    <li>
                        <span class="legend-box" style="background:${colors[i]};"></span>
                        <span class="legend-text" title="${fullLabel}">${shortLabel}</span>
                    </li>
                `;
            }).join('');

            // ④ マウス移動でカスタムツールチップを表示／回り込み制御
            document.getElementById('industry-pie').addEventListener('mousemove', e => {
                const points = chart.getElementsAtEventForMode(
                    e, 'nearest', { intersect: true }, true
                );
                if (!points.length) {
                    tooltipEl.style.opacity = 0;
                    return;
                }
                const idx = points[0].index;
                const label = chart.data.labels[idx];
                const value = chart.data.datasets[0].data[idx];
                tooltipEl.textContent = `${label}: ${value}人`;

                tooltipEl.style.left = '0px';
                tooltipEl.style.top  = '0px';
                tooltipEl.style.opacity = 1;
                const ttRect = tooltipEl.getBoundingClientRect();

                const margin = 8;
                let leftPos = e.pageX + margin;
                let topPos  = e.pageY + margin;
                if (leftPos + ttRect.width > window.pageXOffset + window.innerWidth) {
                    leftPos = e.pageX - ttRect.width - margin;
                }
                if (topPos + ttRect.height > window.pageYOffset + window.innerHeight) {
                    topPos = e.pageY - ttRect.height - margin;
                }
                tooltipEl.style.left = `${leftPos}px`;
                tooltipEl.style.top  = `${topPos}px`;
            });

            document.getElementById('industry-pie').addEventListener('mouseleave', () => {
                document.querySelector('.tooltip').style.opacity = 0;
            });
        })
        .catch(err => console.error('業界メトリクス取得エラー:', err));
});