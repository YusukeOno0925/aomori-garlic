document.addEventListener('DOMContentLoaded', function() {
    const editButton = document.getElementById('edit-button');
    const saveButton = document.getElementById('save-button');
    const addJobExperienceButton = document.getElementById('add-job-experience'); 
    const usernameField = document.getElementById('username');
    const emailField = document.getElementById('email');
    const profileField = document.getElementById('profile') || null;  // プロフィールフィールドが存在しない場合はnull
    const birthdateField = document.getElementById('birthdate');
    const educationField = document.getElementById('education');
    const careerStepField = document.getElementById('career_step');
    const careerChallengesField = document.getElementById('career_challenges');
    const careerApproachField = document.getElementById('career_approach');
    const jobExperiencesContainer = document.getElementById('job-experiences-container');  // 職歴を表示するコンテナ

    // 初期化時に全てのフィールドを読み取り専用に設定
    function setReadOnly(isReadOnly) {
        const action = isReadOnly ? 'setAttribute' : 'removeAttribute';
        usernameField[action]('readonly', 'readonly');
        emailField[action]('readonly', 'readonly');
        if (profileField) {
            profileField[action]('readonly', 'readonly');
        }
        birthdateField[action]('readonly', 'readonly');
        educationField[action]('readonly', 'readonly');
        careerStepField[action]('readonly', 'readonly');
        careerChallengesField[action]('readonly', 'readonly');
        careerApproachField[action]('readonly', 'readonly');
        jobExperiencesContainer.querySelectorAll('input, textarea').forEach(function(input) {
            input[action]('readonly', 'readonly');
        });
    }

    // 新しい職歴の入力フィールドを作成
    function createJobExperienceFields(jobExperience = {}) {
        const jobGroup = document.createElement('div');
        jobGroup.classList.add('job-info-group');

        jobGroup.innerHTML = `
            <input type="hidden" class="job-id" value="${jobExperience.id || ''}">

            <input type="text" value="${jobExperience.company_name || ''}" placeholder="企業名(必須)" required>

            <input type="text" value="${jobExperience.industry || ''}" placeholder="業界(必須)" required>

            <input type="text" value="${jobExperience.position || ''}" placeholder="職位(必須)" required>
            
            <input type="text" value="${jobExperience.job_type || ''}" placeholder="職種(必須)" required>

            <label for="work_start_period">◾️ 勤務開始日</label>
            <input type="date" value="${jobExperience.work_start_period || ''}" placeholder="勤務開始日(必須)" required>

            <label for="work_end_period">◾️ 勤務終了日(任意)</label>
            <input type="date" value="${jobExperience.work_end_period || ''}" placeholder="勤務終了日(任意)">

            <select name="entry_salary" required>
                <option value="" disabled ${!jobExperience.entry_salary ? 'selected' : ''}>入社時の年収(任意)</option>
                <option value="100万未満" ${jobExperience.entry_salary === '100万未満' ? 'selected' : ''}>100万未満</option>
                <option value="100〜200万円" ${jobExperience.entry_salary === '100〜200万円' ? 'selected' : ''}>100〜200万円</option>
                <option value="201〜300万円" ${jobExperience.entry_salary === '201〜300万円' ? 'selected' : ''}>201〜300万円</option>
                <option value="301〜400万円" ${jobExperience.entry_salary === '301〜400万円' ? 'selected' : ''}>301〜400万円</option>
                <option value="401〜500万円" ${jobExperience.entry_salary === '401〜500万円' ? 'selected' : ''}>401〜500万円</option>
                <option value="501〜600万円" ${jobExperience.entry_salary === '501〜600万円' ? 'selected' : ''}>501〜600万円</option>
                <option value="601〜700万円" ${jobExperience.entry_salary === '601〜700万円' ? 'selected' : ''}>601〜700万円</option>
                <option value="701〜800万円" ${jobExperience.entry_salary === '701〜800万円' ? 'selected' : ''}>701〜800万円</option>
                <option value="801〜900万円" ${jobExperience.entry_salary === '801〜900万円' ? 'selected' : ''}>801〜900万円</option>
                <option value="901〜1000万円" ${jobExperience.entry_salary === '901〜1000万円' ? 'selected' : ''}>901〜300万円</option>
                <option value="1001〜1500万円" ${jobExperience.entry_salary === '1001〜1500万円' ? 'selected' : ''}>1001〜1500万円</option>
                <option value="1500万円以上" ${jobExperience.entry_salary === '1500万円以上' ? 'selected' : ''}>1500万円以上</option>
            </select>

            <select name="entry_satisfaction" required>
                <option value="" disabled ${!jobExperience.entry_satisfaction ? 'selected' : ''}>入社時の満足度(任意)</option>
                <option value="1" ${jobExperience.entry_satisfaction == '1' ? 'selected' : ''}>1</option>
                <option value="2" ${jobExperience.entry_satisfaction == '2' ? 'selected' : ''}>2</option>
                <option value="3" ${jobExperience.entry_satisfaction == '3' ? 'selected' : ''}>3</option>
                <option value="4" ${jobExperience.entry_satisfaction == '4' ? 'selected' : ''}>4</option>
                <option value="5" ${jobExperience.entry_satisfaction == '5' ? 'selected' : ''}>5</option>
            </select>

            <select name="current_salary" required>
                <option value="" disabled ${!jobExperience.current_salary ? 'selected' : ''}>現時点(退職時)の年収(任意)</option>
                <option value="100万未満" ${jobExperience.current_salary === '100万未満' ? 'selected' : ''}>100万未満</option>
                <option value="100〜200万円" ${jobExperience.current_salary === '100〜200万円' ? 'selected' : ''}>100〜200万円</option>
                <option value="201〜300万円" ${jobExperience.current_salary === '201〜300万円' ? 'selected' : ''}>201〜300万円</option>
                <option value="301〜400万円" ${jobExperience.current_salary === '301〜400万円' ? 'selected' : ''}>301〜400万円</option>
                <option value="401〜500万円" ${jobExperience.current_salary === '401〜500万円' ? 'selected' : ''}>401〜500万円</option>
                <option value="501〜600万円" ${jobExperience.current_salary === '501〜600万円' ? 'selected' : ''}>501〜600万円</option>
                <option value="601〜700万円" ${jobExperience.current_salary === '601〜700万円' ? 'selected' : ''}>601〜700万円</option>
                <option value="701〜800万円" ${jobExperience.current_salary === '701〜800万円' ? 'selected' : ''}>701〜800万円</option>
                <option value="801〜900万円" ${jobExperience.current_salary === '801〜900万円' ? 'selected' : ''}>801〜900万円</option>
                <option value="901〜1000万円" ${jobExperience.current_salary === '901〜1000万円' ? 'selected' : ''}>901〜300万円</option>
                <option value="1001〜1500万円" ${jobExperience.current_salary === '1001〜1500万円' ? 'selected' : ''}>1001〜1500万円</option>
                <option value="1500万円以上" ${jobExperience.current_salary === '1500万円以上' ? 'selected' : ''}>1500万円以上</option>
            </select>

            <select name="current_satisfaction" required>
                <option value="" disabled ${!jobExperience.current_satisfaction ? 'selected' : ''}>現時点(退職時)の満足度(任意)</option>
                <option value="1" ${jobExperience.current_satisfaction == '1' ? 'selected' : ''}>1</option>
                <option value="2" ${jobExperience.current_satisfaction == '2' ? 'selected' : ''}>2</option>
                <option value="3" ${jobExperience.current_satisfaction == '3' ? 'selected' : ''}>3</option>
                <option value="4" ${jobExperience.current_satisfaction == '4' ? 'selected' : ''}>4</option>
                <option value="5" ${jobExperience.current_satisfaction == '5' ? 'selected' : ''}>5</option>
            </select>

            <textarea placeholder="成功経験(任意)">${jobExperience.success_experience || ''}</textarea>

            <textarea placeholder="失敗経験(任意)">${jobExperience.failure_experience || ''}</textarea>

            <textarea placeholder="こうしておけばよかったこと(任意)">${jobExperience.reflection || ''}</textarea>
        `;
        jobExperiencesContainer.appendChild(jobGroup);
    }

    // 「企業追加」ボタンをクリックしたときの処理
    addJobExperienceButton.addEventListener('click', function() {
        createJobExperienceFields();  // 新しい職歴フィールドを追加
    });

    // 初期化時に読み取り専用にする
    setReadOnly(true);

    // 環境に応じたベースURLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const baseUrl = data.base_url;

            // ユーザー情報を事前にフォームに表示
            fetch(`${baseUrl}/user-info/`, {
                credentials: 'include',  // クッキーを含めてリクエストを送信
            })
            .then(response => {
                if (response.status === 401) {
                    // 401エラーが返ってきた場合、ログインページにリダイレクト
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
                    usernameField.value = data.username || '';
                    emailField.value = data.email || '';
                    if (profileField) {
                        profileField.value = data.profile || '';
                    }
                    birthdateField.value = data.birthdate || '';
                    educationField.value = data.education || '';
                    careerStepField.value = data.career_step || '';
                    careerChallengesField.value = data.career_challenges || '';
                    careerApproachField.value = data.career_approach || '';

                    
                    // 職歴情報の処理
                    jobExperiencesContainer.innerHTML = ''; // 既存の要素をクリア
                    if (data.job_experiences && data.job_experiences.length > 0) {
                        data.job_experiences.forEach(experience => createJobExperienceFields(experience));
                    }
                }
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });

            // 編集ボタンが押されたとき、readonlyを解除
            editButton.addEventListener('click', function() {
                setReadOnly(false);
                saveButton.style.display = 'block';
                editButton.style.display = 'none';
            });

            saveButton.addEventListener('click', function(event) {
                event.preventDefault(); // デフォルトの送信を防ぐ

                const updatedData = {
                    username: usernameField.value,
                    email: emailField.value,
                    profile: profileField ? profileField.value : '',
                    birthdate: birthdateField.value || '',
                    education: educationField.value || '',
                    career_step: careerStepField.value || '',
                    career_challenges: careerChallengesField.value || '',
                    career_approach: careerApproachField.value || '',
                    job_experiences: []  // 職歴情報を保存するための配列
                };

                jobExperiencesContainer.querySelectorAll('.job-info-group').forEach(function(group) {
                    const entrySalarySelect = group.querySelector('select[name="entry_salary"]');
                    const currentSalarySelect = group.querySelector('select[name="current_salary"]');
                    const entrySatisfactionSelect = group.querySelector('select[name="entry_satisfaction"]');
                    const currentSatisfactionSelect = group.querySelector('select[name="current_satisfaction"]');
                
                    const jobData = {
                        id: group.querySelector('.job-id').value || null, // IDを保持
                        company_name: group.querySelector('input[placeholder="企業名(必須)"]').value || null,
                        industry: group.querySelector('input[placeholder="業界(必須)"]') ? group.querySelector('input[placeholder="業界(必須)"]').value : null,
                        position: group.querySelector('input[placeholder="職位(必須)"]') ? group.querySelector('input[placeholder="職位(必須)"]').value : null,
                        job_type: group.querySelector('input[placeholder="職種(必須)"]') ? group.querySelector('input[placeholder="職種(必須)"]').value : null,
                        work_start_period: group.querySelector('input[placeholder="勤務開始日(必須)"]').value || null,
                        work_end_period: group.querySelector('input[placeholder="勤務終了日(任意)"]').value || null,
                        entry_salary: entrySalarySelect ? entrySalarySelect.value : null, 
                        entry_satisfaction: entrySatisfactionSelect ? entrySatisfactionSelect.value : null,
                        current_salary: currentSalarySelect ? currentSalarySelect.value : null, 
                        current_satisfaction: currentSatisfactionSelect ? currentSatisfactionSelect.value : null,
                        success_experience: group.querySelector('textarea[placeholder="成功経験(任意)"]').value || null,
                        failure_experience: group.querySelector('textarea[placeholder="失敗経験(任意)"]').value || null,
                        reflection: group.querySelector('textarea[placeholder="こうしておけばよかったこと(任意)"]').value || null
                    };
                    updatedData.job_experiences.push(jobData);
                });
                console.log('送信データ:', updatedData);

                fetch(`${baseUrl}/update-user-info/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedData),
                    credentials: 'include'
                })
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 400) {
                            throw new Error('入力に誤りがあります。');
                        } else if (response.status === 500) {
                            throw new Error('サーバーエラーが発生しました。');
                        } else {
                            throw new Error('予期しないエラーが発生しました。');
                        }
                    }
                    return response.json(); // レスポンスをJSONとして処理
                })
                .then(() => {
                    alert('プロフィールが更新されました。'); // 成功メッセージを表示
                    usernameField.setAttribute('readonly', 'readonly');
                    emailField.setAttribute('readonly', 'readonly');
                    if (profileField) {
                        profileField.setAttribute('readonly', 'readonly');
                    }
                    birthdateField.setAttribute('readonly', 'readonly');
                    careerStepField.setAttribute('readonly', 'readonly');
                    careerChallengesField.setAttribute('readonly', 'readonly');
                    careerApproachField.setAttribute('readonly', 'readonly');
                    jobExperiencesContainer.querySelectorAll('input, textarea').forEach(function(input) {
                        input.setAttribute('readonly', 'readonly');
                    });
                    saveButton.style.display = 'none';
                    editButton.style.display = 'block';
                })
                .catch(error => {
                    alert(error.message);  // エラーメッセージをアラートで表示
                });
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});