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
                    if (!response.ok) {
                        // エラー処理はそのまま
                        return response.json().then(data => { throw new Error(data.message || '登録に失敗しました'); });
                    }
                
                    // ─── ここで sign_up イベントを GA4 に送信 ───
                    if (typeof gtag === 'function') {
                        // event_callback を使って “確実に送信してから” リダイレクト
                        gtag('event', 'sign_up', {
                            method: 'form',      // 任意。後で UA／GA4 で属性として使えます
                            event_callback: function() {
                                window.location.href = '/Home.html';
                            }
                        });
                        // タイムアウト対策（万一 callback 呼ばれなければ 1秒後に遷移）
                        setTimeout(function() {
                            window.location.href = '/Home.html';
                        }, 1000);
                    } else {
                        // gtag が定義されていない場合は即リダイレクト
                        window.location.href = '/Home.html';
                    }
                })
                .catch(error => {
                    console.error('登録中にエラーが発生しました:', error);
                    alert(error.message);
                    loadingPopup.style.display = 'none'; // エラー時にポップアップを非表示
                    registerButton.disabled = false; // ボタンを再度有効化
                });
            });
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});