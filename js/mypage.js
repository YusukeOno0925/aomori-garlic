document.addEventListener('DOMContentLoaded', function () {
    // タブ切り替えのスクリプト
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', function () {
            // タブリンクのactiveクラスをリセット
            tabLinks.forEach(link => link.classList.remove('active'));
            // クリックされたタブにactiveクラスを追加
            this.classList.add('active');

            // タブコンテンツの表示をリセット
            tabContents.forEach(content => content.classList.remove('active'));
            // 対応するタブコンテンツを表示
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    const editButtons = document.querySelectorAll('#edit-button-top, #edit-button-bottom');
    const saveButtons = document.querySelectorAll('#save-button-top, #save-button-bottom');
    const addJobExperienceButton = document.getElementById('add-job-experience');
    const formFields = document.querySelectorAll('#mypage-form input, #mypage-form textarea, #mypage-form select');
    const jobExperiencesContainer = document.getElementById('job-experiences-container');
    let jobExperienceIndex = 0;  // インデックスの初期化

    //職種の選択肢を定義
    const jobCategoryOptions = [
        { value: '営業', text: '営業' },
        { value: '管理・事務', text: '管理・事務' },
        { value: '経営・企画', text: '経営・企画' },
        { value: 'マーケティング', text: 'マーケティング' },
        { value: 'ITエンジニア', text: 'ITエンジニア' },
        { value: '機械・電気・電子・半導体（技術職）', text: '機械・電気・電子・半導体（技術職）' },
        { value: '化学・薬品・食品（技術職）', text: '化学・薬品・食品（技術職）' },
        { value: '建築・土木・設備（技術職）', text: '建築・土木・設備（技術職）' },
        { value: 'メディカル（専門職）', text: 'メディカル（専門職）' },
        { value: '金融（専門職）', text: '金融（専門職）' },
        { value: '不動産（専門職）', text: '不動産（専門職）' },
        { value: 'コンサルタント・専門職', text: 'コンサルタント・専門職' },
        { value: 'クリエイティブ', text: 'クリエイティブ' },
        { value: 'サービス・小売・運輸・その他', text: 'サービス・小売・運輸・その他' }
    ];

    //職種の選択肢を生成する関数
    function createJobCategoryOptions(selectedValue) {
        return jobCategoryOptions.map(option => {
            const selected = option.value === selectedValue ? 'selected' : '';
            return `<option value="${option.value}" ${selected}>${option.text}</option>`;
        }).join('');
    }

    // 初期化時に全てのフィールドを読み取り専用に設定
    function setReadOnly(isReadOnly) {
        formFields.forEach(field => {
            if (isReadOnly) {
                field.setAttribute('readonly', 'readonly');
                if (field.tagName === 'SELECT' || field.type === 'checkbox') {
                    field.disabled = true;
                }
            } else {
                field.removeAttribute('readonly');
                if (field.tagName === 'SELECT' || field.type === 'checkbox') {
                    field.disabled = false;
                }
            }
        });
    
        // 「職歴を追加」ボタンの表示制御
        addJobExperienceButton.style.display = isReadOnly ? 'none' : 'block';
    
        // 職歴フィールド内の入力要素の読み取り専用状態を設定
        document.querySelectorAll('.job-info-group').forEach(group => {
            group.querySelectorAll('input, textarea').forEach(field => {
                if (isReadOnly) {
                    field.setAttribute('readonly', 'readonly');
                } else {
                    field.removeAttribute('readonly');
                }
            });
            group.querySelectorAll('select').forEach(select => {
                select.disabled = isReadOnly;
            });
        });
    }

    // 編集・保存ボタンの表示切り替え
    function toggleButtons(showEdit) {
        editButtons.forEach(button => (button.style.display = showEdit ? 'block' : 'none'));
        saveButtons.forEach(button => (button.style.display = showEdit ? 'none' : 'block'));
    }

    // 初期化: 読み取り専用で編集ボタンを表示
    setReadOnly(true);
    toggleButtons(true);

    // 年収の選択肢を生成
    function createSalaryOptions(selectedValue) {
        const salaryOptions = [
            { value: '100万未満', text: '100万未満' },
            { value: '100〜200万円', text: '100〜200万円' },
            { value: '201〜300万円', text: '201〜300万円' },
            { value: '301〜400万円', text: '301〜400万円' },
            { value: '401〜500万円', text: '401〜500万円' },
            { value: '501〜600万円', text: '501〜600万円' },
            { value: '601〜700万円', text: '601〜700万円' },
            { value: '701〜800万円', text: '701〜800万円' },
            { value: '801〜900万円', text: '801〜900万円' },
            { value: '901〜1000万円', text: '901〜1000万円' },
            { value: '1001〜1500万円', text: '1001〜1500万円' },
            { value: '1500万円以上', text: '1500万円以上' }
        ];

        return salaryOptions.map(option => {
            const selected = option.value === selectedValue ? 'selected' : '';
            return `<option value="${option.value}" ${selected}>${option.text}</option>`;
        }).join('');
    }

    // 満足度の選択肢を生成
    function createSatisfactionOptions(selectedValue) {
        const satisfactionOptions = [1, 2, 3, 4, 5];
        return satisfactionOptions.map(option => {
            const selected = option === selectedValue ? 'selected' : '';
            return `<option value="${option}" ${selected}>${option}</option>`;
        }).join('');
    }

    // 新しい職歴の入力フィールドを作成（インデックス付き）
    function createJobExperienceFields(jobExperience = {}) {
        const jobGroup = document.createElement('div');
        jobGroup.classList.add('job-info-group');
        jobGroup.setAttribute('data-index', jobExperienceIndex);
    
        // 職歴フィールドの読み取り専用状態を取得
        const isReadOnly = document.getElementById('username').hasAttribute('readonly');
    
        // 各フィールドをフローティングラベルの構造に変更
        const idValue = jobExperience.id !== undefined && jobExperience.id !== null && jobExperience.id !== '' ? jobExperience.id : '';
        jobGroup.innerHTML = `
            <input type="hidden" name="job_experiences[${jobExperienceIndex}][id]" value="${idValue}">
            
            <!-- 企業名 -->
            <div class="floating-label">
                <input type="text" name="job_experiences[${jobExperienceIndex}][company_name]" value="${jobExperience.company_name || ''}" ${isReadOnly ? 'readonly' : ''} required>
                <label>企業名</label>
            </div>

            <!-- 非公開チェックボックス -->
            <div class="checkbox-group">
                <label>
                <input type="checkbox" name="job_experiences[${jobExperienceIndex}][is_private]" ${jobExperience.is_private ? 'checked' : ''}>
                    この職歴を非公開にする
                </label>
            </div>
            
            <!-- 業界 -->
            <div class="floating-label">
                <select name="job_experiences[${jobExperienceIndex}][industry]" ${isReadOnly ? 'disabled' : ''} required>
                    <option value="" ${!jobExperience.industry ? 'selected' : ''}></option>
                    <option value="金融" ${jobExperience.industry === '金融' ? 'selected' : ''}>金融</option>
                    <option value="コンサルティング・専門事務所" ${jobExperience.industry === 'コンサルティング・専門事務所' ? 'selected' : ''}>コンサルティング・専門事務所</option>
                    <option value="IT・通信・インターネット" ${jobExperience.industry === 'IT・通信・インターネット' ? 'selected' : ''}>IT・通信・インターネット</option>
                    <option value="マスコミ・広告関連" ${jobExperience.industry === 'マスコミ・広告関連' ? 'selected' : ''}>マスコミ・広告関連</option>
                    <option value="メディカル" ${jobExperience.industry === 'メディカル' ? 'selected' : ''}>メディカル</option>
                    <option value="生活インフラ、運輸、不動産、建設" ${jobExperience.industry === '生活インフラ、運輸、不動産、建設' ? 'selected' : ''}>生活インフラ、運輸、不動産、建設</option>
                    <option value="行政機関、社団法人、非営利団体" ${jobExperience.industry === '行政機関、社団法人、非営利団体' ? 'selected' : ''}>行政機関、社団法人、非営利団体</option>
                    <option value="メーカー・商社" ${jobExperience.industry === 'メーカー・商社' ? 'selected' : ''}>メーカー・商社</option>
                    <option value="サービス、小売、外食" ${jobExperience.industry === 'サービス、小売、外食' ? 'selected' : ''}>サービス、小売、外食</option>
                    <option value="その他" ${jobExperience.industry === 'その他' ? 'selected' : ''}>その他</option>
                </select>
                <label>業界</label>
            </div>
            
            <!-- 役職 -->
            <div class="floating-label">
                <input type="text" name="job_experiences[${jobExperienceIndex}][position]" value="${jobExperience.position || ''}" ${isReadOnly ? 'readonly' : ''}>
                <label>役職</label>
            </div>
            
            <!-- 入社日 -->
            <div class="floating-label">
                <input type="date" name="job_experiences[${jobExperienceIndex}][work_start_period]" value="${jobExperience.work_start_period || ''}" ${isReadOnly ? 'readonly' : ''}>
                <label>入社日</label>
            </div>
            
            <!-- 退社日 -->
            <div class="floating-label">
                <input type="date" name="job_experiences[${jobExperienceIndex}][work_end_period]" value="${jobExperience.work_end_period || ''}" ${isReadOnly ? 'readonly' : ''}>
                <label>退社日</label>
            </div>
            
            <!-- 年収 -->
            <div class="floating-label">
                <select name="job_experiences[${jobExperienceIndex}][salary]" ${isReadOnly ? 'disabled' : ''}>
                    <option value="" ${!jobExperience.salary ? 'selected' : ''}></option>
                    ${createSalaryOptions(jobExperience.salary)}
                </select>
                <label>年収</label>
            </div>
            
            <!-- 職種 -->
            <div class="floating-label">
                <select name="job_experiences[${jobExperienceIndex}][job_category]" ${isReadOnly ? 'disabled' : ''}>
                    <option value="" ${!jobExperience.job_category ? 'selected' : ''}></option>
                    ${createJobCategoryOptions(jobExperience.job_category)}
                </select>
                <label>職種</label>
            </div>
            
            <!-- 職種分類 -->
            <div class="floating-label">
                <input type="text" name="job_experiences[${jobExperienceIndex}][job_sub_category]" value="${jobExperience.job_sub_category || ''}" ${isReadOnly ? 'readonly' : ''}>
                <label>職種分類</label>
            </div>
            
            <!-- 満足度 -->
            <div class="floating-label">
                <select name="job_experiences[${jobExperienceIndex}][satisfaction_level]" ${isReadOnly ? 'disabled' : ''}>
                    <option value="" ${!jobExperience.satisfaction_level ? 'selected' : ''}></option>
                    ${createSatisfactionOptions(jobExperience.satisfaction_level)}
                </select>
                <label>満足度</label>
            </div>
        `;
    
        jobExperiencesContainer.appendChild(jobGroup);
        jobExperienceIndex++;
    }

    // 「職歴を追加」ボタンをクリックしたときの処理
    addJobExperienceButton.addEventListener('click', function () {
        createJobExperienceFields();
    });

    // 環境に応じたベースURLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const baseUrl = data.base_url;

            // ユーザー情報を事前にフォームに表示
            fetch(`${baseUrl}/user-info?include_private=true`, {
                credentials: 'include',
            })
            .then(response => {
                if (response.status === 401) {
                    window.location.href = 'Login.html';
                    return null;
                }
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data) {
                    // 個人情報
                    document.getElementById('username').value = data.username || '';
                    document.getElementById('email').value = data.email || '';
                    document.getElementById('family_name').value = data.family_name || '';
                    document.getElementById('given_name').value = data.given_name || '';
                    document.getElementById('birthdate').value = data.birthdate || '';
                    document.getElementById('gender').value = data.gender || '';
                    document.getElementById('newsletter_subscription').checked = data.newsletter_subscription || false;

                    // 学歴情報
                    document.getElementById('institution').value = data.institution || '';
                    document.getElementById('degree').value = data.degree || '';
                    document.getElementById('major').value = data.major || '';
                    document.getElementById('education_start').value = data.education_start || '';
                    document.getElementById('education_end').value = data.education_end || '';
                    document.getElementById('education_id').value = data.education_id || '';

                    // 学歴非公開チェックボックスの処理を追加
                    const hideInstitutionCheckbox = document.getElementById('hide_institution');
                    hideInstitutionCheckbox.checked = data.hide_institution || false;

                    // 職歴情報の処理
                    jobExperiencesContainer.innerHTML = ''; // 既存の要素をクリア
                    jobExperienceIndex = 0;  // インデックスのリセット
                    if (data.job_experiences && data.job_experiences.length > 0) {
                        data.job_experiences.forEach(experience => createJobExperienceFields(experience));
                    }

                    // キャリア志向
                    document.getElementById('career_type').value = data.career_type || '';
                    document.getElementById('career_description').value = data.career_description || '';
                    document.getElementById('career_aspirations_id').value = data.career_aspirations_id || '';
                    document.getElementById('career_satisfaction_feedback').value = data.career_satisfaction_feedback || '';

                    // キャリアのスタート地点
                    document.getElementById('start_point_id').value = data.start_point_id || '';
                    document.getElementById('start_reason').value = data.start_reason || '';
                    document.getElementById('first_job_feedback').value = data.first_job_feedback || '';

                    // キャリアの転機
                    document.getElementById('transition_id').value = data.transition_id || '';
                    document.getElementById('transition_type').value = data.transition_type || '';
                    document.getElementById('transition_story').value = data.transition_story || '';
                    document.getElementById('reason_for_job_change').value = data.reason_for_job_change || '';
                    document.getElementById('job_experience_feedback').value = data.job_experience_feedback || '';

                    // キャリアの達成と失敗経験
                    document.getElementById('achievement_id').value = data.achievement_id || '';
                    document.getElementById('proudest_achievement').value = data.proudest_achievement || '';
                    document.getElementById('failure_experience').value = data.failure_experience || '';
                    document.getElementById('lesson_learned').value = data.lesson_learned || '';
                    document.getElementById('concerns').value = data.concerns || '';

                    // 学びと成長
                    document.getElementById('skill').value = data.skill || '';
                    document.getElementById('growth_description').value = data.growth_description || '';
                    document.getElementById('growth_id').value = data.growth_id || '';
                }
            })
            .catch(error => {
                console.error('ユーザー情報の取得中にエラーが発生しました:', error);
            });

            // 「編集」ボタンのクリック処理
            editButtons.forEach(button => {
                button.addEventListener('click', function () {
                    setReadOnly(false);
                    toggleButtons(false);
                });
            });

            // 「保存」ボタンのクリック処理
            saveButtons.forEach(button => {
                button.addEventListener('click', function (event) {
                    event.preventDefault();

                    const formData = new FormData(document.getElementById('mypage-form'));

                    // 学歴の非公開チェックボックスの状態を取得
                    const hideInstitution = document.getElementById('hide_institution').checked;

                    // チェック状態をbooleanで取得する
                    const newsletterSubscription = document.getElementById('newsletter_subscription').checked;  


                    // job_experiencesフィールドを配列として集める
                    const jobExperiences = [];
                    document.querySelectorAll('.job-info-group').forEach(group => {
                        const index = group.getAttribute('data-index');
                        const industryValue = group.querySelector(`select[name="job_experiences[${index}][industry]"]`)?.value || '';
                        const isPrivate = group.querySelector(`input[name="job_experiences[${index}][is_private]"]`)?.checked || false;

                        let idValue = group.querySelector(`input[name="job_experiences[${index}][id]"]`)?.value;
                        idValue = idValue !== '' ? idValue : null;  // 空文字列の場合はnullを設定

                        const experience = {
                            id: idValue,
                            company_name: group.querySelector(`input[name="job_experiences[${index}][company_name]"]`)?.value || '',
                            industry: industryValue,
                            position: group.querySelector(`input[name="job_experiences[${index}][position]"]`)?.value || '',
                            work_start_period: group.querySelector(`input[name="job_experiences[${index}][work_start_period]"]`)?.value || '',
                            work_end_period: group.querySelector(`input[name="job_experiences[${index}][work_end_period]"]`)?.value || '',
                            salary: group.querySelector(`select[name="job_experiences[${index}][salary]"]`)?.value || '',
                            job_category: group.querySelector(`select[name="job_experiences[${index}][job_category]"]`)?.value || '',
                            job_sub_category: group.querySelector(`input[name="job_experiences[${index}][job_sub_category]"]`)?.value || '',
                            satisfaction_level: group.querySelector(`select[name="job_experiences[${index}][satisfaction_level]"]`)?.value || '',
                            is_private: isPrivate
                        };
                        // 少なくとも一つのフィールドに値がある場合のみ追加
                        if (experience.company_name || experience.industry || experience.position) {
                            jobExperiences.push(experience);
                        }
                    });

                    const data = {
                        username: formData.get('username') || '',
                        email: formData.get('email') || '',
                        family_name: formData.get('family_name') || '',
                        given_name: formData.get('given_name') || '',
                        birthdate: formData.get('birthdate') || '',
                        gender: formData.get('gender') || '',
                        newsletter_subscription: newsletterSubscription,  // booleanで送信

                        institution: formData.get('institution') || '',
                        hide_institution: hideInstitution,
                        degree: formData.get('degree') || '',
                        major: formData.get('major') || '',
                        education_start: formData.get('education_start') || '',
                        education_end: formData.get('education_end') || '',
                        education_id: formData.get('education_id') || '',

                        job_experiences: jobExperiences,

                        career_type: formData.get('career_type') || '',
                        career_description: formData.get('career_description') || '',
                        career_satisfaction_feedback: formData.get('career_satisfaction_feedback') || '',
                        career_aspirations_id: formData.get('career_aspirations_id') || '',

                        start_point_id: formData.get('start_point_id') || '',
                        start_reason: formData.get('start_reason') || '',
                        first_job_feedback: formData.get('first_job_feedback') || '',

                        transition_id: formData.get('transition_id') || '',
                        transition_type: formData.get('transition_type') || '',
                        transition_story: formData.get('transition_story') || '',
                        reason_for_job_change: formData.get('reason_for_job_change') || '',
                        job_experience_feedback: formData.get('job_experience_feedback') || '',

                        achievement_id: formData.get('achievement_id') || '',
                        proudest_achievement: formData.get('proudest_achievement') || '',
                        failure_experience: formData.get('failure_experience') || '',
                        lesson_learned: formData.get('lesson_learned') || '',
                        concerns: formData.get('concerns') || '',

                        skill: formData.get('skill') || '',
                        growth_description: formData.get('growth_description') || '',
                        growth_id: formData.get('growth_id') || ''
                    };

                    // サーバーに送信する処理
                    fetch(`${baseUrl}/update-user-info/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                        credentials: 'include'
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(() => {
                        alert('プロフィールが更新されました。');
                        window.location.reload(); 
                    })
                    .catch(error => {
                        console.error('エラーが発生しました:', error);
                        alert('エラーが発生しました。再試行してください。');
                    });
                });
            });

            // ▼ (A) 折りたたみ機能の初期化
            initializeCollapsible();
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
    
    // ======================================
    // ▼ 折りたたみ機能実装: initializeCollapsible
    // ======================================
    function initializeCollapsible() {
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 親要素 .collapsible-block を探す
                const collapsibleBlock = btn.closest('.collapsible-block');
                if (!collapsibleBlock) return;
                // .collapsible-details を取得
                const details = collapsibleBlock.querySelector('.collapsible-details');
                if (!details) return;

                // 表示/非表示を切り替え
                if (details.style.display === 'block') {
                    details.style.display = 'none';
                } else {
                    details.style.display = 'block';
                }
            });
        });
    }
});