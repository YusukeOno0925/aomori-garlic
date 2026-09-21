document.addEventListener('DOMContentLoaded', function () {
    'use strict';


    /* ============================================================
       1. DOM
       ============================================================ */

    const registerForm = document.getElementById(
        'register-form'
    );

    const loadingPopup = document.getElementById(
        'loading-popup'
    );

    const registerButton = document.getElementById(
        'register-button'
    );


    if (
        !registerForm
        || !loadingPopup
        || !registerButton
    ) {
        console.error(
            '新規登録画面に必要なHTML要素が見つかりません。'
        );

        return;
    }


    /* ============================================================
       2. STATE
       ============================================================ */

    let baseUrl = '';

    let isSubmitting = false;

    let hasRedirected = false;


    /* ============================================================
       3. MESSAGE AREA
       ============================================================ */

    function createMessageElement() {
        let messageElement =
            document.getElementById(
                'register-form-message'
            );


        if (messageElement) {
            return messageElement;
        }


        messageElement =
            document.createElement(
                'div'
            );


        messageElement.id =
            'register-form-message';


        messageElement.className =
            'register-form-message';


        messageElement.setAttribute(
            'role',
            'alert'
        );


        messageElement.setAttribute(
            'aria-live',
            'polite'
        );


        messageElement.style.display =
            'none';


        registerForm.insertAdjacentElement(
            'beforebegin',
            messageElement
        );


        return messageElement;
    }


    const messageElement =
        createMessageElement();


    function showMessage(
        message,
        type = 'error'
    ) {
        messageElement.textContent =
            message;


        messageElement.classList.remove(
            'is-error',
            'is-success'
        );


        messageElement.classList.add(
            type === 'success'
                ? 'is-success'
                : 'is-error'
        );


        messageElement.style.display =
            'block';


        messageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }


    function hideMessage() {
        messageElement.textContent =
            '';


        messageElement.classList.remove(
            'is-error',
            'is-success'
        );


        messageElement.style.display =
            'none';
    }


    /* ============================================================
       4. SUBMIT STATE
       ============================================================ */

    function setSubmittingState(
        submitting
    ) {
        isSubmitting =
            submitting;


        registerButton.disabled =
            submitting;


        if (submitting) {
            registerButton.textContent =
                '登録しています…';


            registerButton.setAttribute(
                'aria-busy',
                'true'
            );


            loadingPopup.style.display =
                'flex';

        } else {
            registerButton.textContent =
                'Career GPSをはじめる';


            registerButton.removeAttribute(
                'aria-busy'
            );


            loadingPopup.style.display =
                'none';
        }
    }


    /* ============================================================
       5. API ERROR
       ============================================================ */

    async function getErrorMessage(
        response
    ) {
        const fallbackMessage =
            '登録に失敗しました。入力内容をご確認ください。';


        try {
            const responseData =
                await response.json();


            if (
                responseData
                && typeof responseData.message
                    === 'string'
            ) {
                return responseData.message;
            }


            if (
                responseData
                && typeof responseData.detail
                    === 'string'
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
                    return messages.join(
                        '、'
                    );
                }
            }

        } catch (error) {
            console.warn(
                '登録エラーレスポンスの解析に失敗しました。',
                error
            );
        }


        return fallbackMessage;
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
                '登録画面の準備に失敗しました。ページを再読み込みしてください。'
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
                '登録画面の設定を確認できませんでした。ページを再読み込みしてください。'
            );
        }


        baseUrl =
            responseData.base_url
                .replace(
                    /\/$/,
                    ''
                );


        registerForm.action =
            `${baseUrl}/register/`;
    }


    /* ============================================================
       7. REDIRECT
       ============================================================ */

    function redirectToHome() {
        if (hasRedirected) {
            return;
        }


        hasRedirected = true;


        window.location.href =
            '/Home.html';
    }


    /* ============================================================
       8. GA4
       ============================================================ */

    function trackSignUpAndRedirect() {
        /*
         * GA4が利用できる場合はsign_upを送信。
         *
         * event_callbackが返らないケースもあるため、
         * fallback timeoutを必ず用意する。
         *
         * redirectToHome()側でも二重遷移を防止する。
         */

        if (
            typeof window.gtag
                !== 'function'
            && typeof gtag
                !== 'function'
        ) {
            redirectToHome();

            return;
        }


        const gtagFunction =
            typeof window.gtag === 'function'
                ? window.gtag
                : gtag;


        try {
            gtagFunction(
                'event',
                'sign_up',
                {
                    method: 'form',

                    event_callback:
                        function () {
                            redirectToHome();
                        },

                    event_timeout:
                        1000
                }
            );

        } catch (error) {
            console.warn(
                'sign_upイベントの送信に失敗しました。',
                error
            );


            redirectToHome();

            return;
        }


        window.setTimeout(
            redirectToHome,
            1100
        );
    }


    /* ============================================================
       9. REGISTER
       ============================================================ */

    async function submitRegistration() {
        const formData =
            new FormData(
                registerForm
            );


        const response = await fetch(
            registerForm.action,
            {
                method: 'POST',
                body: formData
            }
        );


        if (!response.ok) {
            const errorMessage =
                await getErrorMessage(
                    response
                );


            throw new Error(
                errorMessage
            );
        }


        return response;
    }


    /* ============================================================
       10. SUBMIT EVENT
       ============================================================ */

    registerForm.addEventListener(
        'submit',
        async function (event) {
            event.preventDefault();


            if (isSubmitting) {
                return;
            }


            hideMessage();


            /*
             * required / email形式など、
             * HTML標準のValidationを利用する。
             */
            if (
                !registerForm.checkValidity()
            ) {
                registerForm.reportValidity();

                return;
            }


            if (!baseUrl) {
                showMessage(
                    '登録画面の準備が完了していません。ページを再読み込みしてください。'
                );

                return;
            }


            setSubmittingState(
                true
            );


            try {
                await submitRegistration();


                /*
                 * 登録成功後はGA4計測を送ってHomeへ。
                 */
                trackSignUpAndRedirect();

            } catch (error) {
                console.error(
                    '登録中にエラーが発生しました:',
                    error
                );


                showMessage(
                    error.message
                    || '登録に失敗しました。時間をおいてもう一度お試しください。'
                );


                setSubmittingState(
                    false
                );
            }
        }
    );


    /* ============================================================
       11. INITIALIZE
       ============================================================ */

    async function initialize() {
        /*
         * 環境情報取得中に誤送信されないよう、
         * 最初だけボタンを無効化する。
         */
        registerButton.disabled =
            true;


        try {
            await loadEnvironment();


            registerButton.disabled =
                false;

        } catch (error) {
            console.error(
                '環境情報の取得中にエラーが発生しました:',
                error
            );


            showMessage(
                error.message
                || '登録画面の準備に失敗しました。ページを再読み込みしてください。'
            );


            registerButton.disabled =
                true;
        }
    }


    initialize();
});