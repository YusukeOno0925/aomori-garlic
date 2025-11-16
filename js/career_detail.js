// 成功メッセージを表示する関数
function showSuccessMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box success';
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    // 3秒後にメッセージを自動的に消す
    setTimeout(() => {
        messageBox.remove();
    }, 3000);
}

// エラーメッセージを表示する関数
function showErrorMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box error';
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    // 5秒後にメッセージを自動的に消す
    setTimeout(() => {
        messageBox.remove();
    }, 5000);
}

// メイン処理
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const careerId = urlParams.get('id');

    // 1) キャリア詳細データを取得
    fetch(`/career-detail/${careerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('ネットワークエラーが発生しました。');
            }
            return response.json();
        })
        .then(data => {
            // ================================
            // (A-0) サマリーエリアへの反映
            // ※ マイページの項目は増やさず、
            //    既存データから一文・タグ・チップを自動生成
            // ================================
            const usernameEl = document.getElementById('career-username');
            const taglineEl  = document.getElementById('career-tagline');
            const tagsEl     = document.getElementById('career-tags');
            const chipsEl    = document.getElementById('career-chips');
            const avatarEl   = document.getElementById('career-avatar');

            // 会社リストと最新の会社（共通で使う）
            const companies = data.companies || [];
            const latestCompany = companies.length > 0 ? companies[companies.length - 1] : null;

            // イニシャルアイコン
            if (avatarEl && data.name) {
                const trimmed = String(data.name).trim();
                const firstChar = trimmed.charAt(0).toUpperCase();  // 先頭1文字
                avatarEl.textContent = firstChar || '?';
            }

            // 名前（username）
            if (usernameEl) {
                // data.name は career_detail.py で username を入れている
                const ageText = (data.age && data.age !== 'N/A') ? `（${data.age}歳）` : '';
                usernameEl.textContent = (data.name || 'ユーザー') + ageText;
            }

            // 一行サマリー：「職種・年代・所属」を既存データから合成
            if (taglineEl) {
                const parts = [];

                if (data.profession) {
                    parts.push(data.profession);  // 例：ITエンジニア
                }

                if (data.age && data.age !== 'N/A') {
                    const decade = Math.floor(data.age / 10) * 10;  // 27歳 → 20
                    parts.push(`${decade}代`);
                }

                taglineEl.textContent = parts.length > 0
                    ? parts.join('・')
                    : '';  // データが少ない場合は空にしてカードを軽く見せる
            }

            // タグ（#年代, #経験社数）
            if (tagsEl) {
                const tags = [];

                if (data.age && data.age !== 'N/A') {
                    const decade = Math.floor(data.age / 10) * 10;
                    tags.push(`#${decade}代`);
                }

                if (data.companies && data.companies.length > 0) {
                    tags.push(`#経験社数${data.companies.length}社`);
                }

                tagsEl.innerHTML = tags.map(t =>
                    `<span class="tag-pill">${escapeHTML(t)}</span>`
                ).join('');
            }

            // チップ（現在の職種・最新勤務先・年収レンジ・満足度）
            if (chipsEl) {
                const chips = [];

                if (data.profession) {
                    chips.push({ label: '現在の職種', value: data.profession });
                }

                if (latestCompany) {
                    if (latestCompany.name) {
                        chips.push({ label: '最新の勤務先', value: latestCompany.name });
                    }
                    if (latestCompany.salary && latestCompany.salary !== 'N/A') {
                        chips.push({ label: '現在の年収レンジ', value: latestCompany.salary });
                    }
                    if (latestCompany.satisfaction_level && latestCompany.satisfaction_level !== 'N/A') {
                        chips.push({ label: '現在の満足度', value: latestCompany.satisfaction_level });
                    }
                }

                chipsEl.innerHTML = chips.map(c => `
                    <div class="chip">
                        <span class="chip-label">${escapeHTML(c.label)}:</span>
                        <span class="chip-value">${escapeHTML(String(c.value))}</span>
                    </div>
                `).join('');
            }

            // ================================
            // (A) 取得したデータを画面に反映
            // ================================
            // プロフィール情報
            const profileSection = document.getElementById('profile-section');
            profileSection.innerHTML = `
                <div class="detail">
                    <p><strong>名前:</strong> ${escapeHTML(data.name)} 
                        ${data.age !== undefined ? `(${data.age}歳)` : ''}
                    </p>
                    <p><strong>職業:</strong> ${escapeHTML(data.profession)}</p>
                </div>
            `;

            // キャリア体験情報
            const careerExperiencesSection = document.getElementById('career-experiences-section');
            const careerExperiences = data.career_experiences;

            // 表示用の配列を作成
            const experiences = [
                { title: '職業を選んだ理由', content: careerExperiences.start_reason },
                { title: '初めての仕事のフィードバック', content: careerExperiences.first_job_feedback },
                { title: 'キャリアの転機となった理由', content: careerExperiences.transition_type },
                { title: '転職の詳細', content: careerExperiences.transition_story },
                { title: '転職理由', content: careerExperiences.reason_for_job_change },
                { title: '仕事のフィードバック', content: careerExperiences.job_experience_feedback },
                { title: '最も誇りに思う達成', content: careerExperiences.proudest_achievement },
                { title: '失敗経験', content: careerExperiences.failure_experience },
                { title: '学んだこと', content: careerExperiences.lesson_learned },
                { title: '現在の悩み・不安', content: careerExperiences.concerns }
            ];

            // 各項目をループして表示
            careerExperiencesSection.innerHTML = experiences.map(exp => {
                if (exp.content) {
                    const truncatedText = truncateText(exp.content, 50);
                    return `
                        <div class="detail">
                            <p><strong>${escapeHTML(exp.title)}:</strong></p>
                            <p class="short-text">
                                ${escapeHTML(truncatedText)}
                                ${exp.content.length > 50 ? `<span class="read-more-link">続きを読む</span>` : ''}
                            </p>
                            <p class="read-more-content">
                                ${escapeHTML(exp.content)} 
                                <span class="read-less-link">閉じる</span>
                            </p>
                        </div>
                    `;
                }
                return '';
            }).join('');

            // 会社ごとの経験
            const companyExperiencesSection = document.getElementById('company-experiences-section');
            companyExperiencesSection.innerHTML = data.companies.map((company, index) => {
                const cName = escapeHTML(company.name);
                const cStart = company.startYear ? company.startYear : '不明';
                const cEnd = company.endYear ? company.endYear : '現時点';
                const cSalary = company.salary ? `${escapeHTML(company.salary)}` : '不明';
                const cSatisfaction = company.satisfaction_level ? `${escapeHTML(company.satisfaction_level)}` : '不明';

                return `
                    <div class="company-experience">
                        <h3>${index + 1}社目: ${cName} (${cStart}〜${cEnd})</h3>
                        <p><strong>年収:</strong> ${cSalary}</p>
                        <p><strong>満足度:</strong> ${cSatisfaction}</p>
                    </div>
                `;
            }).join('');

            // (B) 年収と満足度のグラフ描画
            if (data.companies && data.companies.length > 0) {
                drawChart(data.companies);
            } else {
                console.error('会社データが見つかりませんでした。');
            }

            // ================================
            // (C) コメント機能の初期化
            // ================================
            checkLoginStatus().then(isLoggedIn => {
                handleComments(careerId, isLoggedIn);
            });

            // ================================
            // (D) アコーディオン初期化（後述修正）
            // ================================
            initializeAccordion();

            // 「続きを読む」機能初期化
            initializeReadMore();
        })
        .catch(error => {
            console.error('キャリア詳細の取得中にエラーが発生しました:', error);
            const careerDetail = document.getElementById('career-detail');
            if (careerDetail) {
                careerDetail.innerHTML = '<p>キャリアが見つかりませんでした。</p>';
            }
        });
});

// ---------------------------------------------
// ログイン状態を確認する関数（既存のまま）
function checkLoginStatus() {
    return fetch('/check-login-status/', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.ok)
    .catch(error => {
        console.error('ログイン状態の確認中にエラーが発生しました:', error);
        return false;
    });
}

// ---------------------------------------------
// ★ 修正ポイント：アコーディオンをクリックしたらログインチェックする ★
function initializeAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', async function() {
            // ログイン済み → アコーディオン開閉
            const item = this.parentElement;
            item.classList.toggle('active');
        });
    });
}

// ---------------------------------------------
// 「続きを読む」機能
function initializeReadMore() {
    const sections = [
        document.getElementById('career-experiences-section'),
        document.getElementById('company-experiences-section')
    ];
    sections.forEach(section => {
        if (section) {
            const readMoreLinks = section.querySelectorAll('.read-more-link');
            readMoreLinks.forEach(link => {
                // クリック時にログイン判定
                link.addEventListener('click', async function() {
                    const isLoggedIn = await checkLoginStatus();
                    if (!isLoggedIn) {
                        alert('この情報を閲覧するにはログインが必要です。');
                        window.location.href = '/Login.html'; 
                        return;
                    }

                    // ログイン済みなら全文表示
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

// ---------------------------------------------
// テキストをトランケートする関数
function truncateText(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

// ---------------------------------------------
// グラフ描画関数
function drawChart(companies) {
    const ctx = document.getElementById('income-satisfaction-chart').getContext('2d');

    const labels = companies.map(c => c.name);
    const income = companies.map(c => calculateMedianIncome(c.salary));
    const maxIncome = Math.max(...income.filter(v => !isNaN(v) && v !== null));
    const yAxisMaxIncome = Math.ceil(maxIncome / 100) * 100;
    const incomePadding = yAxisMaxIncome * 0.1;
    const yAxisMaxIncomeWithPadding = yAxisMaxIncome + incomePadding;
    const incomeStepSize = yAxisMaxIncome / 5;

    const satisfaction = companies.map(c =>
        c.satisfaction_level !== null ? c.satisfaction_level : NaN
    );

    // フォントをサイト全体に合わせる
    Chart.defaults.font.family = "'Roboto', 'Noto Sans JP', sans-serif";

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '年収（中央値）',
                    data: income,
                    backgroundColor: 'rgba(220, 146, 64, 0.8)', // 焦げ黄色寄り
                    borderColor: '#574637',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: '仕事の満足度',
                    type: 'line',
                    data: satisfaction,
                    fill: false, // 面塗りをやめてスッキリ
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    backgroundColor: '#8ba141',
                    borderColor: '#8ba141',
                    borderWidth: 2,
                    yAxisID: 'y1',
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,   // 親要素の高さを使う
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 0,
                    left: 0
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.dataset.yAxisID === 'y') {
                                // 年収側
                                return label + ': ' + (isNaN(value) ? 'データなし' : value + '万円');
                            } else {
                                // 満足度側
                                return label + ': ' + (isNaN(value) ? 'データなし' : value + '点');
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false    // x軸のグリッド線は消す
                    },
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        font: { size: 11 },
                        autoSkip: true,
                        autoSkipPadding: 10,
                        callback: function(value, index) {
                            const label = this.getLabelForValue(index);
                            return label.length > 8 ? label.substring(0, 8) + '…' : label;
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: yAxisMaxIncomeWithPadding,
                    ticks: {
                        stepSize: incomeStepSize,
                        font: { size: 10 },
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
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.04)'
                    }
                },
                y1: {
                    min: 0,
                    max: 5.5,
                    ticks: {
                        stepSize: 1,
                        font: { size: 10 },
                        callback: function(value) {
                            if (value <= 5) {
                                return value + '点';
                            }
                            return '';
                        }
                    },
                    position: 'right',
                    grid: {
                        drawBorder: false,
                        color: 'rgba(0,0,0,0.02)'
                    }
                }
            }
        }
    });
}

// ---------------------------------------------
// 年収範囲の中央値を取得
function calculateMedianIncome(income) {
    if (!income) return null;
    if (typeof income === 'string') {
        const range = income.split('〜').map(v => parseInt(v.replace('万', '')));
        if (range.length === 2) {
            return (range[0] + range[1]) / 2;
        }
    }
    const parsedIncome = parseInt(income.replace('万', ''));
    if (isNaN(parsedIncome)) return null;
    if (parsedIncome < 100) return 50;
    if (parsedIncome > 1500) return 1500;
    return parsedIncome;
}

// ---------------------------------------------
// コメント処理
function handleComments(careerId, isLoggedIn) {
    const commentList = document.getElementById('comment-list');
    const commentText = document.getElementById('comment-text');
    const submitComment = document.getElementById('submit-comment');
    const pagination = document.getElementById('pagination');
    let currentPage = 1;
    const commentsPerPage = 10;

    function fetchComments() {
        fetch(`/comments/${careerId}?page=${currentPage}&per_page=${commentsPerPage}`)
            .then(response => response.json())
            .then(data => {
                commentList.innerHTML = '';
                data.comments.forEach(comment => {
                    const commentItem = createCommentElement(comment);
                    commentList.appendChild(commentItem);
                });
                displayPagination(data.total_pages);
            })
            .catch(error => {
                console.error('コメントの取得中にエラーが発生しました:', error);
            });
    }

    function createCommentElement(comment, nestLevel = 0) {
        const maxNestLevel = 2;
        const commentItem = document.createElement('div');
        commentItem.classList.add('comment-item');
        commentItem.dataset.commentId = comment.id;

        const commentHeader = document.createElement('div');
        commentHeader.classList.add('comment-header');

        const username = document.createElement('p');
        username.innerHTML = `<strong>${escapeHTML(comment.username)}</strong> (${new Date(comment.created_at).toLocaleString()})`;
        commentHeader.appendChild(username);

        const commentContent = document.createElement('div');
        commentContent.classList.add('comment-content');

        if (comment.content.length > 100) {
            const shortText = truncateText(comment.content, 100);
            commentContent.innerHTML = `
                <span class="short-text">${escapeHTML(shortText)}<span class="read-more-link">続きを読む</span></span>
                <span class="full-text" style="display:none;">${escapeHTML(comment.content)}<span class="read-less-link">閉じる</span></span>
            `;
        } else {
            commentContent.textContent = comment.content;
        }

        const commentActions = document.createElement('div');
        commentActions.classList.add('comment-actions');

        const replyButton = document.createElement('button');
        replyButton.classList.add('reply-button');
        replyButton.innerHTML = `<i class="fas fa-reply"></i> <span class="button-text">返信</span>`;
        replyButton.addEventListener('click', function() {
            if (isLoggedIn) {
                showReplyForm(comment.id);
            } else {
                alert('返信を投稿するにはログインが必要です。');
            }
        });

        const likeButton = document.createElement('button');
        likeButton.classList.add('like-button');
        likeButton.innerHTML = `<i class="fas fa-thumbs-up"></i> <span class="button-text">いいね</span> (${comment.like_count || 0})`;
        likeButton.addEventListener('click', function() {
            if (isLoggedIn) {
                toggleLike(comment.id, likeButton);
            } else {
                alert('いいねをするにはログインが必要です。');
            }
        });

        commentActions.appendChild(replyButton);
        commentActions.appendChild(likeButton);

        commentItem.appendChild(commentHeader);
        commentItem.appendChild(commentContent);
        commentItem.appendChild(commentActions);

        if (comment.replies && comment.replies.length > 0 && nestLevel < maxNestLevel) {
            const replyList = document.createElement('div');
            replyList.classList.add('reply-list');
            comment.replies.forEach(reply => {
                const replyItem = createCommentElement(reply, nestLevel + 1);
                replyList.appendChild(replyItem);
            });
            commentItem.appendChild(replyList);
        }

        return commentItem;
    }

    function showReplyForm(parentCommentId) {
        const parentComment = commentList.querySelector(`[data-comment-id="${parentCommentId}"]`);
        const existingForm = parentComment.querySelector('.reply-form');
        if (existingForm) {
            existingForm.remove();
            return;
        }

        const replyForm = document.createElement('div');
        replyForm.classList.add('reply-form');
        replyForm.innerHTML = `
            <textarea class="reply-text" placeholder="返信を入力してください"></textarea>
            <button class="submit-reply">返信を投稿</button>
        `;
        parentComment.appendChild(replyForm);

        const replyText = replyForm.querySelector('.reply-text');
        const submitReply = replyForm.querySelector('.submit-reply');

        submitReply.addEventListener('click', function() {
            const content = replyText.value.trim();
            if (content) {
                const formData = new FormData();
                formData.append('content', content);
                formData.append('parent_comment_id', parentCommentId);

                fetch(`/comments/${careerId}`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                })
                .then(response => {
                    if (!response.ok) {
                        alert('返信の投稿に失敗しました。');
                        throw new Error('返信の投稿に失敗しました。');
                    }
                    return response.json();
                })
                .then(data => {
                    replyForm.remove();
                    fetchComments();
                })
                .catch(error => {
                    console.error('返信の投稿中にエラーが発生しました:', error);
                });
            } else {
                alert('返信を入力してください。');
            }
        });
    }

    function toggleLike(commentId, likeButton) {
        fetch(`/comments/${commentId}/like`, {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                alert('いいねの処理に失敗しました。');
                throw new Error('いいねの処理に失敗しました。');
            }
            return response.json();
        })
        .then(data => {
            likeButton.innerHTML = `<i class="fas fa-thumbs-up"></i> いいね (${data.like_count})`;
        })
        .catch(error => {
            console.error('いいねの処理中にエラーが発生しました:', error);
        });
    }

    function displayPagination(totalPages) {
        pagination.innerHTML = '';

        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = '前へ';
            prevButton.addEventListener('click', () => {
                currentPage--;
                fetchComments();
            });
            pagination.appendChild(prevButton);
        }

        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = '次へ';
            nextButton.addEventListener('click', () => {
                currentPage++;
                fetchComments();
            });
            pagination.appendChild(nextButton);
        }
    }

    if (isLoggedIn) {
        submitComment.addEventListener('click', function () {
            const newComment = commentText.value.trim();
            if (newComment) {
                const temporaryComment = {
                    id: 'temp-' + Date.now(),
                    content: newComment,
                    created_at: new Date().toISOString(),
                    username: 'あなた',
                    like_count: 0,
                    replies: []
                };
                const commentItem = createCommentElement(temporaryComment);
                commentList.insertBefore(commentItem, commentList.firstChild);
                commentText.value = '';

                const formData = new FormData();
                formData.append('content', newComment);

                fetch(`/comments/${careerId}`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            showErrorMessage(data.detail || 'コメントの投稿に失敗しました。');
                            throw new Error(data.detail || 'コメントの投稿に失敗しました。');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    temporaryComment.id = data.comment_id;
                    commentItem.dataset.commentId = data.comment_id;
                    showSuccessMessage('コメントが投稿されました。');
                    fetchComments();
                })
                .catch(error => {
                    console.error('コメントの投稿中にエラーが発生しました:', error);
                    commentItem.remove();
                    showErrorMessage('コメントの投稿に失敗しました。');
                });
            } else {
                showErrorMessage('コメントを入力してください。');
            }
        });
    } else {
        submitComment.addEventListener('click', function () {
            alert('コメントを投稿するにはログインが必要です。');
        });
    }

    fetchComments();
    initializeCommentReadMore();
}

// コメント内の「続きを読む」機能を初期化
function initializeCommentReadMore() {
    const commentList = document.getElementById('comment-list');
    commentList.addEventListener('click', function(event) {
        if (event.target.classList.contains('read-more-link')) {
            const commentContent = event.target.closest('.comment-content');
            commentContent.querySelector('.short-text').style.display = 'none';
            commentContent.querySelector('.full-text').style.display = 'block';
        } else if (event.target.classList.contains('read-less-link')) {
            const commentContent = event.target.closest('.comment-content');
            commentContent.querySelector('.short-text').style.display = 'block';
            commentContent.querySelector('.full-text').style.display = 'none';
        }
    });
}

// 特殊文字をエスケープする関数（XSS対策）
function escapeHTML(str) {
    if (str == null) return '';
    const safeStr = String(str);
    return safeStr.replace(/[&'`"<>]/g, function(match) {
        return {
            '&': '&amp;',
            "'": '&#x27;',
            '`': '&#x60;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;',
        }[match];
    });
}