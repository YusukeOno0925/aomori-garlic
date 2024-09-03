document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // ページがロードされたら環境に応じたベースURLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const baseUrl = data.base_url;

            form.addEventListener('submit', async function(event) {
                event.preventDefault(); // フォームのデフォルト送信を防ぐ

                const formData = new FormData(form);
                const data = {
                    username: formData.get('username'),
                    password: formData.get('password')
                };

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
                        window.location.href = 'Home.html'; // ログイン成功時、ホームページにリダイレクト
                    } else {
                        errorMessage.style.display = 'block'; // エラーメッセージを表示
                    }
                } catch (error) {
                    console.error('ログイン中にエラーが発生しました:', error);
                    errorMessage.style.display = 'block'; // エラーメッセージを表示
                }
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});