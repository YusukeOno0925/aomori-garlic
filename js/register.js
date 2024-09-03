document.addEventListener('DOMContentLoaded', function() {
    // 環境に応じたベースURLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const baseUrl = data.base_url;
            const registerForm = document.getElementById('register-form');
            // フォームのaction属性を動的に設定
            registerForm.action = `${baseUrl}/register/`;
        })
        .catch(error => {
            console.error('環境変数の取得中にエラーが発生しました:', error);
        });
});