document.addEventListener('DOMContentLoaded', function() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const currentPage = window.location.pathname.split("/").pop();

    // 環境に応じたベースURLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const baseUrl = data.base_url;

            // ログイン状態を確認
            fetch(`${baseUrl}/check-login-status/`, {
                method: 'GET',
                credentials: 'include'
            })
            .then(response => {
                if (response.status === 401) {
                    if (currentPage === "Mypage.html") {
                        window.location.href = 'Login.html';
                    }
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (data && data.is_logged_in) {
                    loginButton.style.display = 'none';
                    logoutButton.style.display = 'block';
                } else {
                    loginButton.style.display = 'block';
                    logoutButton.style.display = 'none';

                    if (currentPage === "Mypage.html") {
                        window.location.href = 'Login.html';
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                loginButton.style.display = 'block';
                logoutButton.style.display = 'none';
                if (currentPage === "Mypage.html") {
                    window.location.href = 'Login.html';
                }
            });

            // ログアウトボタンがクリックされたときの処理
            logoutButton.addEventListener('click', function() {
                fetch(`${baseUrl}/logout/`, {
                    method: 'POST',
                    credentials: 'include',
                })
                .then(response => {
                    if (response.ok) {
                        window.location.href = 'Login.html'; // ログアウト後にログインページへリダイレクト
                    }
                })
                .catch(error => {
                    console.error('Logout error:', error);
                });
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});