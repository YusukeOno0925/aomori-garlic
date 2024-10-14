document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const careerId = urlParams.get('id');

    fetch(`/career-detail/${careerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const careerDetail = document.getElementById('career-detail');
            
            // 1. プロフィール情報の表示
            careerDetail.innerHTML += `
                <div class="card">
                    <h3>プロフィール</h3>
                    <p><strong>名前:</strong> ${data.name}</p>
                    <p><strong>職業:</strong> ${data.profession}</p>
                </div>
            `;

            // 2. キャリア体験情報の表示
            const careerExperiences = data.career_experiences;
            careerDetail.innerHTML += `
                <div class="card">
                    <h3>キャリア体験</h3>
                    <p><strong>職業を選んだ理由:</strong> ${careerExperiences.start_reason || 'N/A'}</p>
                    <p><strong>初めての仕事のフィードバック:</strong> ${careerExperiences.first_job_feedback || 'N/A'}</p>
                    <p><strong>転職タイプ:</strong> ${careerExperiences.transition_type || 'N/A'}</p>
                    <p><strong>転職の詳細:</strong> ${careerExperiences.transition_story || 'N/A'}</p>
                    <p><strong>転職理由:</strong> ${careerExperiences.reason_for_job_change || 'N/A'}</p>
                    <p><strong>仕事のフィードバック:</strong> ${careerExperiences.job_experience_feedback || 'N/A'}</p>
                    <p><strong>最も誇りに思う達成:</strong> ${careerExperiences.proudest_achievement || 'N/A'}</p>
                    <p><strong>失敗経験:</strong> ${careerExperiences.failure_experience || 'N/A'}</p>
                    <p><strong>学んだこと:</strong> ${careerExperiences.lesson_learned || 'N/A'}</p>
                </div>
            `;

            // 3. 会社ごとの経験を一つのカードにまとめて表示
            data.companies.forEach((company, index) => {
                careerDetail.innerHTML += `
                    <div class="card">
                        <h3>${index + 1}社目: ${company.name} (${company.startYear}〜${company.endYear || '現時点'})</h3>
                        <p><strong>年収:</strong> ${company.salary || 'N/A'}</p>
                        <p><strong>満足度:</strong> ${company.satisfaction_level || 'N/A'}</p>
                    </div>
                `;
            });

            // 年収と満足度のグラフ描画
            if (data.companies && data.companies.length > 0) {
                drawChart(data.companies);
            } else {
                console.error('Company data is missing');
            }

            handleComments(careerId); // コメント処理の関数呼び出し
        })
        .catch(error => {
            console.error('Error fetching career details:', error);
            const careerDetail = document.getElementById('career-detail');
            careerDetail.innerHTML = '<p>キャリアが見つかりませんでした。</p>';
        });
});

// グラフ描画関数
function drawChart(companies) {
    const ctx = document.getElementById('income-satisfaction-chart').getContext('2d');

    // グラフ用のラベルを企業名で作成
    const labels = companies.map(company => company.name);

    // 年収データを作成
    const income = companies.map(company => calculateMedianIncome(company.salary));

    // 満足度データを作成
    const satisfaction = companies.map(company => company.satisfaction_level !== null ? company.satisfaction_level : NaN); 

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,  // 企業名ラベル
            datasets: [{
                label: '年収',
                data: income,  // 年収データ
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: '満足度',
                type: 'line',
                data: satisfaction,  // 満足度データ
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                yAxisID: 'y1',
                spanGaps: true  // nullをスキップして線をつなげる
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 2500,
                    ticks: {
                        stepSize: 500,
                        callback: function(value) {
                            return value + '万円';
                        }
                    },
                    position: 'left'
                },
                y1: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return value + '点';
                        }
                    },
                    position: 'right'
                }
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        const label = data.datasets[tooltipItem.datasetIndex].label || '';
                        return label + ': ' + (isNaN(tooltipItem.yLabel) ? 'データなし' : tooltipItem.yLabel);
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