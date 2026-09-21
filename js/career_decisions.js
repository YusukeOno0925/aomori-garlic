document.addEventListener('DOMContentLoaded', async function () {
    'use strict';

    /* ============================================================
       1. DOM
       ============================================================ */

    const totalElement = document.getElementById(
        'career-decision-total'
    );

    const container = document.getElementById(
        'career-decisions-container'
    );

    if (!totalElement || !container) {
        console.error(
            'Career Decision一覧に必要なHTML要素が見つかりません。'
        );

        return;
    }


    /* ============================================================
       2. STATE
       ============================================================ */

    let baseUrl = '';


    /* ============================================================
       3. COMMON
       ============================================================ */

    function normalizeText(value) {
        if (
            value === undefined
            || value === null
        ) {
            return '';
        }

        const text = String(value).trim();

        if (
            !text
            || [
                'null',
                'undefined',
                'none'
            ].includes(text.toLowerCase())
        ) {
            return '';
        }

        return text;
    }


    function escapeHtml(value) {
        return normalizeText(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function truncateText(
        value,
        maxLength
    ) {
        const text = normalizeText(value);

        if (!text) {
            return '';
        }

        if (text.length <= maxLength) {
            return text;
        }

        return (
            text
                .slice(0, maxLength)
                .trim()
            + '…'
        );
    }


    function formatDate(value) {
        if (!value) {
            return {
                display: '時期未登録',
                year: '',
                month: ''
            };
        }

        const normalizedValue = String(value).slice(0, 10);

        const dateValue = new Date(
            `${normalizedValue}T00:00:00`
        );

        if (
            Number.isNaN(
                dateValue.getTime()
            )
        ) {
            return {
                display: normalizedValue,
                year: '',
                month: ''
            };
        }

        const year = String(
            dateValue.getFullYear()
        );

        const month = String(
            dateValue.getMonth() + 1
        ).padStart(
            2,
            '0'
        );

        return {
            display: `${year}.${month}`,
            year: year,
            month: month
        };
    }


    function getApiErrorMessage(
        responseData,
        fallbackMessage
    ) {
        if (
            responseData
            && typeof responseData.detail === 'string'
        ) {
            return responseData.detail;
        }

        if (
            responseData
            && typeof responseData.message === 'string'
        ) {
            return responseData.message;
        }

        return fallbackMessage;
    }


    /* ============================================================
       4. DECISION DISPLAY HELPERS
       ============================================================ */

    function getDecisionTitle(decision) {
        const title = normalizeText(
            decision.title
        );

        if (title) {
            return title;
        }

        const decisionType = normalizeText(
            decision.decision_type
        );

        if (!decisionType) {
            return 'キャリアの意思決定';
        }

        switch (decisionType) {
            case '転職':
                return '転職という選択';

            case '異動':
                return '社内異動という選択';

            case '昇進':
                return '昇進という選択';

            case '現職継続':
            case '継続':
            case '残留':
            case '現職に残る':
                return '今の環境に残るという選択';

            case '役割変更':
                return '新しい役割を選んだ';

            default:
                return `${decisionType}という選択`;
        }
    }


    function getRelatedCareerText(decision) {
        const companyName = normalizeText(
            decision.company_name
        );

        const department = normalizeText(
            decision.department
        );

        const position = normalizeText(
            decision.position
        );

        const roleText = [
            department,
            position
        ]
            .filter(Boolean)
            .join(' / ');

        if (
            companyName
            && roleText
        ) {
            return `${companyName}・${roleText}`;
        }

        if (companyName) {
            return companyName;
        }

        if (roleText) {
            return roleText;
        }

        return '';
    }


    function getDecisionSummary(decision) {
        /*
         * 一覧で最も価値があるのは
         * 「何に迷っていたのか」。
         *
         * dilemmaがない旧データでは
         * trigger → final_reason → result → learning
         * の順でfallback。
         */

        const candidates = [
            decision.dilemma_text,
            decision.trigger_text,
            decision.final_reason,
            decision.result_text,
            decision.learning_text
        ];

        const selected = candidates
            .map(normalizeText)
            .find(Boolean);

        if (!selected) {
            return 'この意思決定の詳細はまだ登録されていません。';
        }

        return truncateText(
            selected,
            160
        );
    }


    function getPriorityText(decision) {
        return truncateText(
            decision.priority_text,
            90
        );
    }


    function getResultText(decision) {
        return truncateText(
            decision.result_text,
            100
        );
    }


    function getLearningText(decision) {
        return truncateText(
            decision.learning_text,
            100
        );
    }


    function getSameChoiceAnswer(decision) {
        return normalizeText(
            decision.same_choice_answer
        );
    }


    function getSameChoiceClass(answer) {
        switch (answer) {
            case 'はい':
                return 'is-yes';

            case 'いいえ':
                return 'is-no';

            case 'どちらともいえない':
                return 'is-neutral';

            default:
                return '';
        }
    }


    /* ============================================================
       5. ENVIRONMENT
       ============================================================ */

    async function loadEnvironment() {
        const response = await fetch(
            '/get-environment',
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        if (!response.ok) {
            throw new Error(
                '環境情報の取得に失敗しました。'
            );
        }

        const responseData = await response.json();

        if (
            !responseData
            || typeof responseData.base_url !== 'string'
        ) {
            throw new Error(
                '環境情報の形式が正しくありません。'
            );
        }

        baseUrl = responseData.base_url.replace(
            /\/$/,
            ''
        );
    }


    /* ============================================================
       6. LOAD DECISIONS
       ============================================================ */

    async function loadCareerDecisions() {
        const response = await fetch(
            `${baseUrl}/career-decisions/`,
            {
                method: 'GET',
                credentials: 'include',
                headers: {
                    Accept: 'application/json'
                }
            }
        );

        if (response.status === 401) {
            window.location.href = 'Login.html';
            return null;
        }

        const responseData = await response
            .json()
            .catch(
                () => null
            );

        if (!response.ok) {
            throw new Error(
                getApiErrorMessage(
                    responseData,
                    'キャリアの意思決定一覧の取得に失敗しました。'
                )
            );
        }

        return responseData;
    }


    /* ============================================================
       7. EMPTY STATE
       ============================================================ */

    function renderEmptyState() {
        totalElement.textContent = '0';

        container.innerHTML = `
            <div class="career-decisions-empty">

                <div
                    class="empty-icon"
                    aria-hidden="true"
                >
                    ◇
                </div>

                <p class="career-decisions-empty__kicker">
                    YOUR FIRST DECISION
                </p>

                <h3>
                    まだ意思決定が登録されていません
                </h3>

                <p>
                    まずは、転職・異動・昇進など、
                    印象に残っている選択を1つ振り返ってみましょう。
                </p>

                <a
                    href="Career_decision_edit.html"
                    class="empty-add-button"
                >
                    最初の意思決定を振り返る
                </a>

            </div>
        `;
    }


    /* ============================================================
       8. DECISION CARD
       ============================================================ */

    function createDecisionCard(
        decision,
        index
    ) {
        const card = document.createElement(
            'article'
        );

        card.className = 'career-decision-card';

        card.dataset.decisionId = String(
            decision.id || ''
        );


        const date = formatDate(
            decision.occurred_at
        );

        const title = getDecisionTitle(
            decision
        );

        const decisionType =
            normalizeText(
                decision.decision_type
            )
            || 'その他';

        const relatedCareer =
            getRelatedCareerText(
                decision
            );

        const summary =
            getDecisionSummary(
                decision
            );

        const priority =
            getPriorityText(
                decision
            );

        const result =
            getResultText(
                decision
            );

        const learning =
            getLearningText(
                decision
            );

        const sameChoice =
            getSameChoiceAnswer(
                decision
            );

        const sameChoiceClass =
            getSameChoiceClass(
                sameChoice
            );


        const detailRows = [];


        /*
         * 判断軸
         */
        if (priority) {
            detailRows.push(`
                <div class="career-decision-card__point">

                    <span class="career-decision-card__point-label">
                        大切にしたこと
                    </span>

                    <p>
                        ${escapeHtml(priority)}
                    </p>

                </div>
            `);
        }


        /*
         * 結果
         */
        if (result) {
            detailRows.push(`
                <div class="career-decision-card__point">

                    <span class="career-decision-card__point-label">
                        その後
                    </span>

                    <p>
                        ${escapeHtml(result)}
                    </p>

                </div>
            `);
        }


        /*
         * 学び
         *
         * priority/resultがない場合でも、
         * 何か1つ補助情報を見せる。
         */
        if (
            learning
            && detailRows.length < 2
        ) {
            detailRows.push(`
                <div class="career-decision-card__point">

                    <span class="career-decision-card__point-label">
                        学んだこと
                    </span>

                    <p>
                        ${escapeHtml(learning)}
                    </p>

                </div>
            `);
        }


        card.innerHTML = `

            <div class="career-decision-card__timeline">

                <div class="career-decision-card__timeline-marker">

                    <span class="career-decision-card__number">
                        ${String(index + 1).padStart(2, '0')}
                    </span>

                </div>

                <div class="career-decision-card__timeline-line">
                </div>

            </div>


            <div class="career-decision-card__content">

                <div class="career-decision-card__top">

                    <div class="career-decision-card__date">

                        <span class="career-decision-card__date-label">
                            DECISION
                        </span>

                        <time>
                            ${escapeHtml(date.display)}
                        </time>

                    </div>


                    <div class="career-decision-card__meta">

                        <span class="career-decision-card__type">
                            ${escapeHtml(decisionType)}
                        </span>

                        ${
                            relatedCareer
                                ? `
                                    <span class="career-decision-card__career">
                                        ${escapeHtml(relatedCareer)}
                                    </span>
                                `
                                : ''
                        }

                    </div>

                </div>


                <h3 class="career-decision-card__title">
                    ${escapeHtml(title)}
                </h3>


                <div class="career-decision-card__dilemma">

                    <span class="career-decision-card__dilemma-label">
                        当時の迷い
                    </span>

                    <p>
                        ${escapeHtml(summary)}
                    </p>

                </div>


                ${
                    detailRows.length > 0
                        ? `
                            <div class="career-decision-card__points">
                                ${detailRows.join('')}
                            </div>
                        `
                        : ''
                }


                ${
                    sameChoice
                        ? `
                            <div
                                class="
                                    career-decision-card__answer
                                    ${escapeHtml(sameChoiceClass)}
                                "
                            >

                                <span>
                                    今なら同じ選択をする？
                                </span>

                                <strong>
                                    ${escapeHtml(sameChoice)}
                                </strong>

                            </div>
                        `
                        : ''
                }


                <div class="career-decision-card__footer">

                    <a
                        href="Career_decision_edit.html?id=${encodeURIComponent(
                            decision.id
                        )}"
                        class="career-decision-card__edit"
                    >
                        この意思決定を見る・編集する

                        <span aria-hidden="true">
                            →
                        </span>
                    </a>

                </div>

            </div>

        `;

        return card;
    }


    /* ============================================================
       9. RENDER LIST
       ============================================================ */

    function renderCareerDecisions(
        responseData
    ) {
        const decisions = Array.isArray(
            responseData.decisions
        )
            ? responseData.decisions
            : [];

        totalElement.textContent = String(
            responseData.count
            ?? decisions.length
        );

        if (
            decisions.length === 0
        ) {
            renderEmptyState();

            return;
        }

        container.innerHTML = '';

        decisions.forEach(
            (
                decision,
                index
            ) => {
                container.appendChild(
                    createDecisionCard(
                        decision,
                        index
                    )
                );
            }
        );
    }


    /* ============================================================
       10. PAGE MESSAGE
       ============================================================ */

    function showPageMessage() {
        const params = new URLSearchParams(
            window.location.search
        );

        let messageText = '';

        if (
            params.get('created') === '1'
        ) {
            messageText =
                '意思決定を追加しました。';
        }

        if (
            params.get('updated') === '1'
        ) {
            messageText =
                '意思決定を更新しました。';
        }

        if (!messageText) {
            return;
        }

        const message = document.createElement(
            'div'
        );

        message.className =
            'career-decisions-page-message is-success';

        message.textContent =
            messageText;

        const hero = document.querySelector(
            '.career-decisions-hero'
        );

        if (hero) {
            hero.insertAdjacentElement(
                'afterend',
                message
            );
        }

        const cleanUrl = new URL(
            window.location.href
        );

        cleanUrl.searchParams.delete(
            'created'
        );

        cleanUrl.searchParams.delete(
            'updated'
        );

        window.history.replaceState(
            {},
            '',
            `${cleanUrl.pathname}${cleanUrl.search}`
        );

        window.setTimeout(
            function () {
                message.remove();
            },
            5000
        );
    }


    /* ============================================================
       11. ERROR
       ============================================================ */

    function renderError(
        message
    ) {
        totalElement.textContent = '--';

        container.innerHTML = `
            <div class="career-decisions-error">

                <p class="career-decisions-error__kicker">
                    LOAD ERROR
                </p>

                <h3>
                    意思決定の一覧を読み込めませんでした
                </h3>

                <p>
                    ${escapeHtml(message)}
                </p>

                <button
                    type="button"
                    id="reload-career-decisions"
                >
                    再読み込み
                </button>

            </div>
        `;


        const reloadButton = document.getElementById(
            'reload-career-decisions'
        );


        if (reloadButton) {
            reloadButton.addEventListener(
                'click',
                function () {
                    window.location.reload();
                }
            );
        }
    }


    /* ============================================================
       12. INITIALIZE
       ============================================================ */

    async function initialize() {
        showPageMessage();

        try {
            await loadEnvironment();

            const responseData =
                await loadCareerDecisions();

            if (!responseData) {
                return;
            }

            renderCareerDecisions(
                responseData
            );

        } catch (error) {
            console.error(
                'Career Decision一覧初期化エラー:',
                error
            );

            renderError(
                error.message
                || 'キャリアの意思決定一覧の取得に失敗しました。'
            );
        }
    }


    await initialize();
});