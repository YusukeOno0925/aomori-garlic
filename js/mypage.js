document.addEventListener('DOMContentLoaded', function() {
    const editButton = document.getElementById('edit-button');
    const saveButton = document.getElementById('save-button');
    const usernameField = document.getElementById('username');
    const emailField = document.getElementById('email');
    const profileField = document.getElementById('profile');

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
                    usernameField.value = data.username;
                    emailField.value = data.email;
                    profileField.value = data.profile || '';
                }
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });

            editButton.addEventListener('click', function() {
                usernameField.removeAttribute('readonly');
                emailField.removeAttribute('readonly');
                profileField.removeAttribute('readonly');
                saveButton.style.display = 'block';
                editButton.style.display = 'none';
            });

            saveButton.addEventListener('click', function(event) {
                event.preventDefault(); // デフォルトの送信を防ぐ

                const updatedData = {
                    username: usernameField.value,
                    email: emailField.value,
                    profile: profileField.value
                };

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
                        throw new Error('Network response was not ok');
                    }
                    return response.json(); // レスポンスをJSONとして処理
                })
                .then(() => {
                    alert('プロフィールが更新されました。'); // 成功メッセージを表示
                    usernameField.setAttribute('readonly', 'readonly');
                    emailField.setAttribute('readonly', 'readonly');
                    profileField.setAttribute('readonly', 'readonly');
                    saveButton.style.display = 'none';
                    editButton.style.display = 'block';
                })
                .catch(error => {
                    console.error('Error during update:', error);
                });
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});