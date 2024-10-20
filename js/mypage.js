document.addEventListener('DOMContentLoaded', function () {
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
                field.disabled = true;
            } else {
                field.removeAttribute('readonly');
                field.disabled = false;
            }
        });

        document.querySelectorAll('select').forEach(select => {
            select.disabled = isReadOnly;
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

        jobGroup.innerHTML = `
            <input type="hidden" name="job_experiences[${jobExperienceIndex}][id]" value="${jobExperience.id || ''}">
            <input type="text" name="job_experiences[${jobExperienceIndex}][company_name]" value="${jobExperience.company_name || ''}" placeholder="企業名">
            <select name="job_experiences[${jobExperienceIndex}][industry]" class="industry-select">
                <option value="" disabled ${!jobExperience.industry ? 'selected' : ''}>業界を選択してください</option>
                <option value="finance" ${jobExperience.industry === 'finance' ? 'selected' : ''}>金融</option>
                <option value="consulting" ${jobExperience.industry === 'consulting' ? 'selected' : ''}>コンサルティング・専門事務所</option>
                <option value="it" ${jobExperience.industry === 'it' ? 'selected' : ''}>IT・通信・インターネット</option>
                <option value="media" ${jobExperience.industry === 'media' ? 'selected' : ''}>マスコミ・広告関連</option>
                <option value="medical" ${jobExperience.industry === 'medical' ? 'selected' : ''}>メディカル</option>
                <option value="infrastructure" ${jobExperience.industry === 'infrastructure' ? 'selected' : ''}>生活インフラ、運輸、不動産、建設</option>
                <option value="government" ${jobExperience.industry === 'government' ? 'selected' : ''}>行政機関、社団法人、非営利団体</option>
                <option value="manufacturing" ${jobExperience.industry === 'manufacturing' ? 'selected' : ''}>メーカー・商社</option>
                <option value="service" ${jobExperience.industry === 'service' ? 'selected' : ''}>サービス、小売、外食</option>
                <option value="other" ${jobExperience.industry === 'other' ? 'selected' : ''}>その他</option>
            </select>
            <input type="text" name="job_experiences[${jobExperienceIndex}][position]" value="${jobExperience.position || ''}" placeholder="役職">
            <input type="date" name="job_experiences[${jobExperienceIndex}][work_start_period]" class="date-input" value="${jobExperience.work_start_period || ''}" placeholder="入社日">
            <input type="date" name="job_experiences[${jobExperienceIndex}][work_end_period]" class="date-input" value="${jobExperience.work_end_period || ''}" placeholder="退社日">
            <select name="job_experiences[${jobExperienceIndex}][salary]">
                <option value="" disabled ${!jobExperience.salary ? 'selected' : ''}>年収を選択</option>
                ${createSalaryOptions(jobExperience.salary)}
            </select>
            <select name="job_experiences[${jobExperienceIndex}][job_category]" class="job-category-select">
                <option value="" disabled ${!jobExperience.job_category ? 'selected' : ''}>職種を選択してください</option>
                ${createJobCategoryOptions(jobExperience.job_category)}
            </select>
            <input type="text" name="job_experiences[${jobExperienceIndex}][job_sub_category]" value="${jobExperience.job_sub_category || ''}" placeholder="職種分類">
            <select name="job_experiences[${jobExperienceIndex}][satisfaction_level]">
                <option value="" disabled ${!jobExperience.satisfaction_level ? 'selected' : ''}>満足度を選択</option>
                ${createSatisfactionOptions(jobExperience.satisfaction_level)}
            </select>
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
            fetch(`${baseUrl}/user-info/`, {
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

                    // job_experiencesフィールドを配列として集める
                    const jobExperiences = [];
                    document.querySelectorAll('.job-info-group').forEach(group => {
                        const index = group.getAttribute('data-index');
                        const industryValue = group.querySelector(`select[name="job_experiences[${index}][industry]"]`)?.value || '';
                        const experience = {
                            id: group.querySelector(`input[name="job_experiences[${index}][id]"]`)?.value || '',
                            company_name: group.querySelector(`input[name="job_experiences[${index}][company_name]"]`)?.value || '',
                            industry: industryValue,
                            position: group.querySelector(`input[name="job_experiences[${index}][position]"]`)?.value || '',
                            work_start_period: group.querySelector(`input[name="job_experiences[${index}][work_start_period]"]`)?.value || '',
                            work_end_period: group.querySelector(`input[name="job_experiences[${index}][work_end_period]"]`)?.value || '',
                            salary: group.querySelector(`select[name="job_experiences[${index}][salary]"]`)?.value || '',
                            job_category: group.querySelector(`select[name="job_experiences[${index}][job_category]"]`)?.value || '',
                            job_sub_category: group.querySelector(`input[name="job_experiences[${index}][job_sub_category]"]`)?.value || '',
                            satisfaction_level: group.querySelector(`select[name="job_experiences[${index}][satisfaction_level]"]`)?.value || ''
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
                        newsletter_subscription: formData.get('newsletter_subscription') || false,

                        institution: formData.get('institution') || '',
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
                        setReadOnly(true);
                        toggleButtons(true);
                    })
                    .catch(error => {
                        console.error('エラーが発生しました:', error);
                        alert('エラーが発生しました。再試行してください。');
                    });
                });
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});