document.addEventListener('DOMContentLoaded', function() {
    // 環境に応じたベースURLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const baseUrl = data.base_url;
            const registerForm = document.getElementById('register-form');
            const loadingPopup = document.getElementById('loading-popup');
            const registerButton = document.getElementById('register-button');

            // フォームのaction属性を動的に設定
            registerForm.action = `${baseUrl}/register/`;

            // フォームの送信イベントリスナーを追加
            registerForm.addEventListener('submit', function(event) {
                event.preventDefault(); // デフォルトの送信をブロック

                // ローディングポップアップを表示
                loadingPopup.style.display = 'block';

                // 登録ボタンを無効化して二重送信を防止
                registerButton.disabled = true;

                // データの送信処理
                const formData = new FormData(registerForm);

                fetch(registerForm.action, {
                    method: 'POST',
                    body: formData,
                })
                .then(response => {
                    if (response.ok) {
                        // ホーム画面にリダイレクト
                        window.location.href = '/Home.html';
                    } else {
                        throw new Error('登録に失敗しました');
                    }
                })
                .catch(error => {
                    console.error('登録中にエラーが発生しました:', error);
                    alert('登録に失敗しました。もう一度お試しください。');
                    loadingPopup.style.display = 'none'; // エラー時にポップアップを非表示
                    registerButton.disabled = false; // ボタンを再度有効化
                });
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});