document.getElementById('password-reset-request-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = event.target.email.value.trim();

    // メールアドレスの入力チェック
    if (!email) {
        document.getElementById('message').textContent = 'メールアドレスを入力してください。';
        document.getElementById('message').style.color = 'red';
        document.getElementById('message').style.display = 'block';
        return;
    }

    // ロード中の表示
    document.getElementById('loading-indicator').style.display = 'flex';
    document.getElementById('message').style.display = 'none';

    fetch('/password-reset-request/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
    .then(response => response.json())
    .then(data => {
        // ロード中の非表示
        document.getElementById('loading-indicator').style.display = 'none';

        if (data.message) {
            document.getElementById('message').textContent = data.message;
            document.getElementById('message').style.color = 'green';
            document.getElementById('message').style.display = 'block';
        } else if (data.error) {
            document.getElementById('message').textContent = data.error;
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