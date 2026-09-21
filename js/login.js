document.addEventListener('DOMContentLoaded', function () {
    'use strict';


    /* ============================================================
       1. DOM
       ============================================================ */

    const form = document.getElementById(
        'login-form'
    );

    const errorMessage = document.getElementById(
        'error-message'
    );

    const loadingIndicator = document.getElementById(
        'loading-indicator'
    );


    if (
        !form
        || !errorMessage
        || !loadingIndicator
    ) {
        console.error(
            'ログイン画面に必要なHTML要素が見つかりません。'
        );

        return;
    }


    const loginButton = form.querySelector(
        'button[type="submit"]'
    );


    if (!loginButton) {
        console.error(
            'ログインボタンが見つかりません。'
        );

        return;
    }


    /* ============================================================
       2. STATE
       ============================================================ */

    let baseUrl = '';

    let isSubmitting = false;


    /* ============================================================
       3. ERROR MESSAGE
       ============================================================ */

    function showError(message) {
        errorMessage.textContent =
            message
            || (
                'ログインに失敗しました。'
                + 'Emailアドレスまたはパスワードをご確認ください。'
            );


        errorMessage.style.display =
            'block';
    }


    function hideError() {
        errorMessage.textContent = '';

        errorMessage.style.display =
            'none';
    }


    /* ============================================================
       4. LOADING
       ============================================================ */

    function setSubmittingState(submitting) {
        isSubmitting = submitting;

        loginButton.disabled =
            submitting;


        if (submitting) {
            loginButton.textContent =
                'ログインしています…';

            loginButton.setAttribute(
                'aria-busy',
                'true'
            );

            loadingIndicator.style.display =
                'flex';

        } else {
            loginButton.textContent =
                'ログインする';

            loginButton.removeAttribute(
                'aria-busy'
            );

            loadingIndicator.style.display =
                'none';
        }
    }


    /* ============================================================
       5. API ERROR
       ============================================================ */

    async function getApiErrorMessage(response) {
        const defaultMessage =
            'ログインに失敗しました。Emailアドレスまたはパスワードをご確認ください。';


        try {
            const responseData =
                await response.json();


            if (
                responseData
                && typeof responseData.message
                    === 'string'
                && responseData.message.trim()
            ) {
                return responseData.message;
            }


            if (
                responseData
                && typeof responseData.detail
                    === 'string'
                && responseData.detail.trim()
            ) {
                return responseData.detail;
            }


            if (
                responseData
                && Array.isArray(
                    responseData.detail
                )
            ) {
                const messages =
                    responseData.detail
                        .map(
                            item => {
                                if (
                                    item
                                    && typeof item.msg
                                        === 'string'
                                ) {
                                    return item.msg;
                                }

                                return '';
                            }
                        )
                        .filter(Boolean);


                if (
                    messages.length > 0
                ) {
                    return messages.join('、');
                }
            }

        } catch (error) {
            /*
             * JSONで返ってこないエラーでも
             * ログイン画面自体は壊さない。
             */
            console.warn(
                'ログインエラーレスポンスを解析できませんでした。',
                error
            );
        }


        return defaultMessage;
    }


    /* ============================================================
       6. ENVIRONMENT
       ============================================================ */

    async function loadEnvironment() {
        const response = await fetch(
            '/get-environment',
            {
                method: 'GET'
            }
        );


        if (!response.ok) {
            throw new Error(
                'ログイン画面の準備に失敗しました。ページを再読み込みしてください。'
            );
        }


        const responseData =
            await response.json();


        if (
            !responseData
            || typeof responseData.base_url
                !== 'string'
            || !responseData.base_url.trim()
        ) {
            throw new Error(
                'ログイン画面の設定を確認できませんでした。ページを再読み込みしてください。'
            );
        }


        baseUrl =
            responseData.base_url
                .replace(
                    /\/$/,
                    ''
                );
    }


    /* ============================================================
       7. LOGIN API
       ============================================================ */

    async function login(
        email,
        password
    ) {
        const requestData =
            new URLSearchParams({
                email: email,
                password: password
            });


        const response = await fetch(
            `${baseUrl}/login/`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded'
                },

                body:
                    requestData
            }
        );


        if (!response.ok) {
            const message =
                await getApiErrorMessage(
                    response
                );


            throw new Error(
                message
            );
        }


        return response;
    }


    /* ============================================================
       8. INPUT CHANGE
       ============================================================ */

    /*
     * ログイン失敗後にユーザーが入力し直したら、
     * 古いエラー表示を消す。
     */
    form.addEventListener(
        'input',
        function () {
            if (
                errorMessage.style.display
                !== 'none'
            ) {
                hideError();
            }
        }
    );


    /* ============================================================
       9. SUBMIT
       ============================================================ */

    form.addEventListener(
        'submit',
        async function (event) {
            event.preventDefault();


            if (isSubmitting) {
                return;
            }


            hideError();


            /*
             * HTML側はnovalidateだが、
             * JSからブラウザ標準Validationを利用する。
             */
            if (
                !form.checkValidity()
            ) {
                form.reportValidity();

                return;
            }


            if (!baseUrl) {
                showError(
                    'ログイン画面の準備が完了していません。ページを再読み込みしてください。'
                );

                return;
            }


            const formData =
                new FormData(
                    form
                );


            const email =
                String(
                    formData.get('email')
                    || ''
                ).trim();


            const password =
                String(
                    formData.get('password')
                    || ''
                );


            setSubmittingState(
                true
            );


            try {
                await login(
                    email,
                    password
                );


                /*
                 * 既存仕様を維持。
                 * ログイン成功後はHomeへ遷移する。
                 */
                window.location.href =
                    'Home.html';

            } catch (error) {
                console.error(
                    'ログイン中にエラーが発生しました:',
                    error
                );


                showError(
                    error.message
                    || (
                        'ログインに失敗しました。'
                        + 'Emailアドレスまたはパスワードをご確認ください。'
                    )
                );


                setSubmittingState(
                    false
                );
            }
        }
    );


    /* ============================================================
       10. INITIALIZE
       ============================================================ */

    async function initialize() {
        /*
         * baseUrl取得前の送信を防ぐ。
         */
        loginButton.disabled =
            true;


        hideError();


        try {
            await loadEnvironment();


            loginButton.disabled =
                false;

        } catch (error) {
            console.error(
                '環境情報の取得中にエラーが発生しました:',
                error
            );


            showError(
                error.message
                || (
                    'ログイン画面の準備に失敗しました。'
                    + 'ページを再読み込みしてください。'
                )
            );


            loginButton.disabled =
                true;
        }
    }


    initialize();
});