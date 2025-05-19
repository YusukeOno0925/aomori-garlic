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
    // ① 数値メトリクス (会員数・掲載数・Q&A数) のカウントアップ取得
    fetch('/metrics/')
        .then(res => res.json())
        .then(({ users, stories, qa }) => {
            animateCount('user-count', users);
            animateCount('story-count', stories);
            animateCount('qa-count', qa);
        })
        .catch(err => console.error('メトリクス取得エラー:', err));

    // ② カスタムツールチップ用の要素を body に追加
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    document.body.appendChild(tooltipEl);

    // ③ 業界別メトリクスの取得 → Chart.js でドーナツグラフ描画
    fetch('/metrics/industry/')
        .then(res => res.json())
        .then(industryData => {
            // （念のため）降順ソート
            industryData.sort((a, b) => b.count - a.count);

            // 上位3件を抜き出し、残りを「その他」へ集約
            const TOP_N = 3;
            const topList = industryData.slice(0, TOP_N);
            const otherCount = industryData
                .slice(TOP_N)
                .reduce((sum, item) => sum + item.count, 0);

            if (otherCount > 0) {
                topList.push({ industry: 'その他', count: otherCount });
            }

            // ラベルとデータに分割
            const labels = topList.map(item => item.industry);
            const values = topList.map(item => item.count);

            // カラーパレット
            const colors = [
                '#6AA84F', // グリーン
                '#BF8F3A', // アンバー
                '#D46A6A', // ダルコーラル
                '#CCCCCC'  // ライトグレー
            ];

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
                        tooltip: { enabled: false }
                    }
                }
            });

            // HTML 凡例を自前で生成
            const legendEl = document.getElementById('industry-legend');
            const MAX_LEN = 10;  // 10文字を超えたら…
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

                // ラベルと人数をセット
                const idx = points[0].index;
                const label = chart.data.labels[idx];
                const value = chart.data.datasets[0].data[idx];
                tooltipEl.textContent = `${label}: ${value}人`;

                // 一度位置リセットして幅・高さを測る
                tooltipEl.style.left = '0px';
                tooltipEl.style.top  = '0px';
                tooltipEl.style.opacity = 1;
                const ttRect = tooltipEl.getBoundingClientRect();

                const margin = 8;  // カーソルとの隙間
                let left = e.pageX + margin;
                let top  = e.pageY + margin;

                // 右にはみ出す場合は左側に
                if (left + ttRect.width > window.pageXOffset + window.innerWidth) {
                    left = e.pageX - ttRect.width - margin;
                }
                // 下にはみ出す場合は上側に
                if (top + ttRect.height > window.pageYOffset + window.innerHeight) {
                    top = e.pageY - ttRect.height - margin;
                }

                tooltipEl.style.left = `${left}px`;
                tooltipEl.style.top  = `${top}px`;
            });

            // グラフからマウスが離れたらツールチップを隠す
            document.getElementById('industry-pie').addEventListener('mouseleave', () => {
                tooltipEl.style.opacity = 0;
            });
        })
        .catch(err => console.error('業界メトリクス取得エラー:', err));
});