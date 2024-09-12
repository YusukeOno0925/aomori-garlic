document.addEventListener('DOMContentLoaded', function() {
    const editButton = document.getElementById('edit-button');
    const saveButton = document.getElementById('save-button');
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
                    console.log('User Info:', data);  // 取得したユーザー情報をコンソールに表示
                    usernameField.value = data.username || '';
                    emailField.value = data.email || '';
                    if (profileField) {
                        profileField.value = data.profile || '';
                    }
                    birthdateField.value = data.birthdate || '';
                    education.value = data.education || '';
                    careerStepField.value = data.career_step || '';
                    careerChallengesField.value = data.career_challenges || '';
                    careerApproachField.value = data.career_approach || '';

                    // 職歴情報の処理
                    if (data.job_experiences && data.job_experiences.length > 0) {
                        data.job_experiences.forEach((experience) => {
                            const jobGroup = document.createElement('div');
                            jobGroup.classList.add('job-info-group');
                            
                            jobGroup.innerHTML = `
                                <input type="text" value="${experience.company_name || ''}" placeholder="企業名(必須)" required>
                                <input type="text" value="${experience.industry || ''}" placeholder="業界(必須)" required>
                                <input type="text" value="${experience.position || ''}" placeholder="職位(必須)" required>
                                <input type="text" value="${experience.job_type || ''}" placeholder="職種(必須)" required>
                                <input type="text" value="${experience.work_period || ''}" placeholder="勤務期間(必須)" required>
                                <input type="number" value="${experience.entry_salary || ''}" placeholder="入社時の年収(任意)">
                                <input type="number" value="${experience.entry_satisfaction || ''}" placeholder="入社時の満足度(任意)">
                                <input type="number" value="${experience.current_salary || ''}" placeholder="現時点の年収(任意)">
                                <input type="number" value="${experience.current_satisfaction || ''}" placeholder="現時点の満足度(任意)">
                                <textarea placeholder="成功経験(任意)">${experience.success_experience || ''}</textarea>
                                <textarea placeholder="失敗経験(任意)">${experience.failure_experience || ''}</textarea>
                                <textarea placeholder="こうしておけばよかったこと(任意)">${experience.reflection || ''}</textarea>
                            `;
                            jobExperiencesContainer.appendChild(jobGroup);
                        });
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

            editButton.addEventListener('click', function() {
                usernameField.removeAttribute('readonly');
                emailField.removeAttribute('readonly');
                if (profileField) {
                    profileField.removeAttribute('readonly');
                }
                birthdateField.removeAttribute('readonly');
                educationField.removeAttribute('readonly');
                careerStepField.removeAttribute('readonly');
                careerChallengesField.removeAttribute('readonly');
                careerApproachField.removeAttribute('readonly');
                jobExperiencesContainer.querySelectorAll('input, textarea').forEach(function(input) {
                    input.removeAttribute('readonly');
                });
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
                
                    const jobData = {
                        company_name: group.querySelector('input[placeholder="企業名(必須)"]').value || '',
                        industry: group.querySelector('input[placeholder="業界(必須)"]') ? group.querySelector('input[placeholder="業界(必須)"]').value : '',
                        position: group.querySelector('input[placeholder="職位(必須)"]') ? group.querySelector('input[placeholder="職位(必須)"]').value : '',
                        job_type: group.querySelector('input[placeholder="職種(必須)"]') ? group.querySelector('input[placeholder="職種(必須)"]').value : '',
                        work_period: group.querySelector('input[placeholder="勤務期間(必須)"]') ? group.querySelector('input[placeholder="勤務期間(必須)"]').value : '',
                        entry_salary: group.querySelector('input[placeholder="入社時の年収(任意)"]') ? group.querySelector('input[placeholder="入社時の年収(任意)"]').value : '',
                        entry_satisfaction: group.querySelector('input[placeholder="入社時の満足度(任意)"]') ? group.querySelector('input[placeholder="入社時の満足度(任意)"]').value : '',
                        current_salary: group.querySelector('input[placeholder="現時点の年収(任意)"]') ? group.querySelector('input[placeholder="現時点の年収(任意)"]').value : '',
                        current_satisfaction: group.querySelector('input[placeholder="現時点の満足度(任意)"]') ? group.querySelector('input[placeholder="現時点の満足度(任意)"]').value : '',
                        success_experience: group.querySelector('textarea[placeholder="成功経験(任意)"]') ? group.querySelector('textarea[placeholder="成功経験(任意)"]').value : '',
                        failure_experience: group.querySelector('textarea[placeholder="失敗経験(任意)"]') ? group.querySelector('textarea[placeholder="失敗経験(任意)"]').value : '',
                        reflection: group.querySelector('textarea[placeholder="こうしておけばよかったこと(任意)"]') ? group.querySelector('textarea[placeholder="こうしておけばよかったこと(任意)"]').value : ''
                    };
                    updatedData.job_experiences.push(jobData);
                });
                console.log('送信データ:', updatedData);

                fetch(`${baseUrl}/update-user-info/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(updatedData),
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