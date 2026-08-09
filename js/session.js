document.addEventListener('DOMContentLoaded', function () {

    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    const currentPage =
        window.location.pathname.split('/').pop();


    // =====================================================
    // ボタン表示制御
    // =====================================================

    function showLoginButton() {

        if (loginButton) {
            loginButton.style.display = 'inline-flex';
        }

        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
    }


    function showLogoutButton() {

        if (loginButton) {
            loginButton.style.display = 'none';
        }

        if (logoutButton) {
            logoutButton.style.display = 'inline-flex';
        }
    }


    // =====================================================
    // 環境取得
    // =====================================================

    fetch('/get-environment')

        .then(response => {

            if (!response.ok) {
                throw new Error(
                    `Environment request failed: ${response.status}`
                );
            }

            return response.json();
        })


        .then(environmentData => {

            const baseUrl =
                environmentData.base_url;


            // =================================================
            // ログイン状態確認
            // =================================================

            return fetch(
                `${baseUrl}/check-login-status/`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            )

            .then(response => {

                if (response.status === 401) {

                    showLoginButton();


                    if (
                        currentPage === 'Mypage.html'
                    ) {

                        window.location.href =
                            'Login.html';

                    }


                    return null;
                }


                if (!response.ok) {

                    throw new Error(
                        `Login status request failed: ${response.status}`
                    );

                }


                return response.json();
            })


            .then(data => {

                if (!data) {
                    return;
                }


                if (data.is_logged_in) {

                    showLogoutButton();

                } else {

                    showLoginButton();


                    if (
                        currentPage === 'Mypage.html'
                    ) {

                        window.location.href =
                            'Login.html';

                    }

                }

            })


            .catch(error => {

                console.error(
                    'Login status error:',
                    error
                );


                showLoginButton();


                if (
                    currentPage === 'Mypage.html'
                ) {

                    window.location.href =
                        'Login.html';

                }

            });


            // =================================================
            // ログアウト
            // =================================================

        })


        .catch(error => {

            console.error(
                '環境変数の取得中にエラーが発生しました:',
                error
            );


            showLoginButton();


            if (
                currentPage === 'Mypage.html'
            ) {

                window.location.href =
                    'Login.html';

            }

        });


    // =====================================================
    // ログアウトクリック
    // =====================================================

    if (logoutButton) {

        logoutButton.addEventListener(
            'click',
            function (event) {

                event.preventDefault();


                fetch('/get-environment')

                    .then(response =>
                        response.json()
                    )

                    .then(environmentData => {

                        const baseUrl =
                            environmentData.base_url;


                        return fetch(
                            `${baseUrl}/logout/`,
                            {
                                method: 'POST',
                                credentials: 'include'
                            }
                        );

                    })


                    .then(response => {

                        if (!response.ok) {

                            throw new Error(
                                `Logout failed: ${response.status}`
                            );

                        }


                        window.location.href =
                            'Login.html';

                    })


                    .catch(error => {

                        console.error(
                            'Logout error:',
                            error
                        );

                    });

            }
        );

    }

});