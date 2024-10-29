document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const careerId = urlParams.get('id');

    fetch(`/career-detail/${careerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('ネットワークエラーが発生しました。');
            }
            return response.json();
        })
        .then(data => {
            // プロフィール情報の表示
            const profileSection = document.getElementById('profile-section');
            profileSection.innerHTML = `
                <div class="detail">
                    <p><strong>名前:</strong> ${data.name}</p>
                    <p><strong>職業:</strong> ${data.profession}</p>
                </div>
            `;

            // キャリア体験情報の表示
            const careerExperiencesSection = document.getElementById('career-experiences-section');
            const careerExperiences = data.career_experiences;

            // テキスト項目の配列を作成
            const experiences = [
                { title: '職業を選んだ理由', content: careerExperiences.start_reason },
                { title: '初めての仕事のフィードバック', content: careerExperiences.first_job_feedback },
                { title: '転職タイプ', content: careerExperiences.transition_type },
                { title: '転職の詳細', content: careerExperiences.transition_story },
                { title: '転職理由', content: careerExperiences.reason_for_job_change },
                { title: '仕事のフィードバック', content: careerExperiences.job_experience_feedback },
                { title: '最も誇りに思う達成', content: careerExperiences.proudest_achievement },
                { title: '失敗経験', content: careerExperiences.failure_experience },
                { title: '学んだこと', content: careerExperiences.lesson_learned }
            ];

            // 各項目をループして表示
            careerExperiencesSection.innerHTML = experiences.map(exp => {
                if (exp.content) {
                    // テキストを短くする関数を使用
                    const truncatedText = truncateText(exp.content, 100);

                    return `
                        <div class="detail">
                            <p><strong>${exp.title}:</strong></p>
                            <p class="short-text">${truncatedText}
                                ${exp.content.length > 100 ? `<span class="read-more-link">続きを読む</span>` : ''}
                            </p>
                            <p class="read-more-content">${exp.content} <span class="read-less-link">閉じる</span></p>
                        </div>
                    `;
                }
                return '';
            }).join('');

            // 会社ごとの経験の表示
            const companyExperiencesSection = document.getElementById('company-experiences-section');
            companyExperiencesSection.innerHTML = data.companies.map((company, index) => {
                return `
                    <div class="company-experience">
                        <h3>${index + 1}社目: ${company.name} (${company.startYear}〜${company.endYear || '現時点'})</h3>
                        ${company.salary ? `<p><strong>年収:</strong> ${company.salary}</p>` : ''}
                        ${company.satisfaction_level ? `<p><strong>満足度:</strong> ${company.satisfaction_level}</p>` : ''}
                        ${company.experience_detail ? `
                            <p class="short-text">${truncateText(company.experience_detail, 100)}
                                ${company.experience_detail.length > 100 ? `<span class="read-more-link">続きを読む</span>` : ''}
                            </p>
                            <p class="read-more-content">${company.experience_detail} <span class="read-less-link">閉じる</span></p>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // 年収と満足度のグラフ描画
            if (data.companies && data.companies.length > 0) {
                drawChart(data.companies);
            } else {
                console.error('会社データが見つかりませんでした。');
            }

            handleComments(careerId); // コメント処理の関数呼び出し
            initializeAccordion();    // アコーディオンの初期化
            initializeReadMore();     // 「続きを読む」機能の初期化
        })
        .catch(error => {
            console.error('キャリア詳細の取得中にエラーが発生しました:', error);
            const careerDetail = document.getElementById('career-detail');
            careerDetail.innerHTML = '<p>キャリアが見つかりませんでした。</p>';
        });
});

// アコーディオンの動作を実装する関数
function initializeAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const item = this.parentElement;
            item.classList.toggle('active');
        });
    });
}

// 「続きを読む」機能のイベントリスナーを追加する関数
function initializeReadMore() {
    const sections = [document.getElementById('career-experiences-section'), document.getElementById('company-experiences-section')];
    sections.forEach(section => {
        if (section) {
            const readMoreLinks = section.querySelectorAll('.read-more-link');
            readMoreLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const detail = this.closest('.detail') || this.closest('.company-experience');
                    detail.querySelector('.short-text').style.display = 'none';
                    detail.querySelector('.read-more-content').style.display = 'block';
                });
            });

            const readLessLinks = section.querySelectorAll('.read-less-link');
            readLessLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const detail = this.closest('.detail') || this.closest('.company-experience');
                    detail.querySelector('.short-text').style.display = 'block';
                    detail.querySelector('.read-more-content').style.display = 'none';
                });
            });
        }
    });
}

// テキストをトランケートする関数
function truncateText(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

// グラフ描画関数
function drawChart(companies) {
    const ctx = document.getElementById('income-satisfaction-chart').getContext('2d');

    // ラベルを取得
    const labels = companies.map(company => company.name);

    // 年収データを取得
    const income = companies.map(company => calculateMedianIncome(company.salary));

    // 年収データの最大値を取得し、余白を追加
    const maxIncome = Math.max(...income.filter(value => !isNaN(value) && value !== null));
    const yAxisMaxIncome = Math.ceil(maxIncome / 100) * 100;
    const incomePadding = yAxisMaxIncome * 0.1; // 10% の余白
    const yAxisMaxIncomeWithPadding = yAxisMaxIncome + incomePadding;
    const incomeStepSize = yAxisMaxIncome / 5;

    // 満足度データを取得
    const satisfaction = companies.map(company => company.satisfaction_level !== null ? company.satisfaction_level : NaN);

    const showXAxisLabels = companies.length <= 2;  // 会社数が3つ以下の場合のみ表示

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '年収',
                data: income,
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: '満足度',
                type: 'line',
                data: satisfaction,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                yAxisID: 'y1',
                spanGaps: true
            }]
        },
        options: {
            scales: {
                x: {
                    display: showXAxisLabels,  // 会社数が3を超える場合は非表示
                    ticks: {
                        callback: function(value, index) {
                            const label = this.getLabelForValue(index);
                            return label.length > 9 ? label.substring(0, 9) + '...' : label;
                        },
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                            size: 12
                        },
                        autoSkip: false
                    }
                },
                y: {
                    beginAtZero: true,
                    max: yAxisMaxIncomeWithPadding,
                    ticks: {
                        stepSize: incomeStepSize,
                        callback: function(value) {
                            if (value <= yAxisMaxIncome) {
                                return value + '万円';
                            }
                            return '';
                        }
                    },
                    position: 'left',
                    grid: {
                        drawTicks: true,
                        drawBorder: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y1: {
                    min: 0,
                    max: 5.5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            if (value <= 5) {
                                return value + '点';
                            }
                            return '';
                        }
                    },
                    position: 'right',
                    grid: {
                        drawTicks: true,
                        drawBorder: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return label + ': ' + (isNaN(value) ? 'データなし' : value);
                        }
                    }
                }
            }
        }
    });
}

// 年収範囲の中央値を取得する関数
function calculateMedianIncome(income) {
    if (!income) return null;  // incomeがundefinedまたはnullの場合はnullを返す

    if (typeof income === 'string') {
        const range = income.split('〜').map(value => parseInt(value.replace('万', '')));
        if (range.length === 2) {
            return (range[0] + range[1]) / 2;  // 範囲がある場合は中央値を取る
        }
    }
    
    const parsedIncome = parseInt(income.replace('万', ''));
    if (isNaN(parsedIncome)) return null;  // 数値に変換できない場合はnullを返す
    
    if (parsedIncome < 100) {
        return 50;  // 100万円未満の場合は50万円とする
    } else if (parsedIncome > 1500) {
        return 1500;  // 1500万円以上の場合は1500万円とする
    }
    return parsedIncome;  // 単一値の場合はそのまま返す
}

// コメントを管理する関数
function handleComments(careerId) {
    const commentList = document.getElementById('comment-list');
    const comments = JSON.parse(localStorage.getItem(`comments-${careerId}`)) || [];
    
    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.classList.add('card');
        commentItem.textContent = comment;
        commentList.appendChild(commentItem);
    });

    const commentText = document.getElementById('comment-text');
    const submitComment = document.getElementById('submit-comment');
    
    submitComment.addEventListener('click', function () {
        const newComment = commentText.value;
        if (newComment) {
            comments.push(newComment);
            localStorage.setItem(`comments-${careerId}`, JSON.stringify(comments));
            const commentItem = document.createElement('div');
            commentItem.classList.add('card');
            commentItem.textContent = newComment;
            commentList.appendChild(commentItem);
            commentText.value = '';
        }
    });
}