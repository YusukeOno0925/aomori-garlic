document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator'); // ロード中の要素を取得
    const loginButton = form.querySelector('button[type="submit"]'); // ログインボタンを取得

    // ページがロードされたら環境に応じたベースURLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const baseUrl = data.base_url;

            form.addEventListener('submit', async function(event) {
                event.preventDefault(); // フォームのデフォルト送信を防ぐ

                const formData = new FormData(form);
                const data = {
                    email: formData.get('email'),
                    password: formData.get('password')
                };

                // ロード中の表示を開始
                loadingIndicator.style.display = 'flex';
                // ログインボタンを無効化
                loginButton.disabled = true;

                try {
                    // 環境に応じたベースURLを使用してfetchリクエストを送信
                    const response = await fetch(`${baseUrl}/login/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(data)
                    });

                    if (response.ok) {
                        // ログイン成功時、ホームページにリダイレクト
                        window.location.href = 'Home.html';
                    } else {
                        // エラーメッセージを表示
                        errorMessage.style.display = 'block';
                    }
                } catch (error) {
                    console.error('ログイン中にエラーが発生しました:', error);
                    // エラーメッセージを表示
                    errorMessage.style.display = 'block';
                } finally {
                    // ロード中の表示を終了
                    loadingIndicator.style.display = 'none';
                    // ログインボタンを有効化
                    loginButton.disabled = false;
                }
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});