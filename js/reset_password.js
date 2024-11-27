document.getElementById('password-reset-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const token = document.getElementById('token').value.trim();
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    // パスワードの一致チェック
    if (newPassword !== confirmPassword) {
        document.getElementById('message').textContent = 'パスワードが一致しません。';
        document.getElementById('message').style.color = 'red';
        document.getElementById('message').style.display = 'block';
        return;
    }

    // パスワードの強度チェック（例: 8文字以上）
    if (newPassword.length < 8) {
        document.getElementById('message').textContent = 'パスワードは8文字以上で設定してください。';
        document.getElementById('message').style.color = 'red';
        document.getElementById('message').style.display = 'block';
        return;
    }

    // ロード中の表示
    document.getElementById('loading-indicator').style.display = 'block';
    document.getElementById('message').style.display = 'none';

    fetch('/password-reset/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: token, new_password: newPassword })
    })
    .then(response => response.json())
    .then(data => {
        // ロード中の非表示
        document.getElementById('loading-indicator').style.display = 'none';

        if (data.message) {
            document.getElementById('message').textContent = data.message;
            document.getElementById('message').style.color = 'green';
            document.getElementById('message').style.display = 'block';
        } else if (data.detail) { // 修正点: data.error から data.detail に変更
            document.getElementById('message').textContent = data.detail;
            document.getElementById('message').style.color = 'red';
            document.getElementById('message').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('message').textContent = 'エラーが発生しました。後でもう一度お試しください。';
        document.getElementById('message').style.color = 'red';
        document.getElementById('message').style.display = 'block';
    });
});