document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');

    // 環境に応じた送信先URLを取得
    fetch('/get-environment')
        .then(response => response.json())
        .then(data => {
            const submitUrl = `${data.base_url}/send-contact/`; // 動的にURLを設定

            contactForm.addEventListener('submit', function(event) {
                event.preventDefault();  // デフォルトのフォーム送信を防ぐ

                const formData = new FormData(contactForm);

                // フォームデータを送信
                fetch(submitUrl, {  // ここで動的に取得したURLを使用
                    method: 'POST',
                    body: formData,  // URLSearchParamsからFormDataに変更
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);  // メール送信の結果をアラートで表示
                    if (data.message === "お問い合わせが送信されました") {
                        contactForm.reset();  // フォームをリセット
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('お問い合わせの送信中にエラーが発生しました。');
                });
            });
        })
        .catch(error => {
            console.error('Error fetching environment:', error);
        });
});