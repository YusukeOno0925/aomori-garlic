// ホーム画面のヒーローセクションで使う数字(業界や登録者、QA数など)の取得

// ホーム画面のヒーローセクションで使う数字(業界や登録者、QA数など)の取得
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

    // ② 業界別メトリクスの取得 → Chart.js でドーナツグラフ描画
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

            // カラーパレット（必要に応じて追加・変更してください）
            const colors = [
                '#6AA84F', // グリーン（据え置きOK）
                '#BF8F3A', // アンバー
                '#D46A6A', // ダルコーラル
                '#CCCCCC'  // ライトグレー
            ];

            // Chart.js でドーナツグラフを描画
            const ctx = document.getElementById('industry-pie').getContext('2d');
            new Chart(ctx, {
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
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.parsed}人`
                        }
                    }
                }   
            }
        });
        // HTML 凡例を自前で生成
        const legendEl = document.getElementById('industry-legend');
        const MAX_LEN = 10;  // 10文字を超えたら…
        legendEl.innerHTML = labels.map((fullLabel, i) => {
            // テキストを必要に応じて切り詰め
            const shortLabel = fullLabel.length > MAX_LEN
            ? fullLabel.slice(0, MAX_LEN) + '…'
            : fullLabel;
            return `
            <li>
                <span class="legend-box" style="background:${colors[i]};"></span>
                <span class="legend-text" title="${fullLabel}">
                ${shortLabel}
                </span>
            </li>
            `;
        }).join('');
    })
    .catch(err => console.error('業界メトリクス取得エラー:', err));
});


/**
 * targetId の要素に向かって 0→targetValue までカウントアップする
 */
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