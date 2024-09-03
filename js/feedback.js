function sendFeedback() {
    const feedbackText = document.getElementById('feedback-text').value;
    if (feedbackText.trim() === '') {
        alert('フィードバックを入力してください');
        return;
    }

    // メール送信のための処理をここに追加します
    // 例えば、サーバー側にデータを送信するためのAPI呼び出しを行います

    // フィードバックが送信されたことをユーザーに通知します
    alert('送信されました');
}