document.addEventListener('DOMContentLoaded', async function () {
    'use strict';

    // ============================================================
    // 1. DOM取得
    // ============================================================

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

    // ============================================================
    // 2. 状態
    // ============================================================

    let baseUrl = '';

    // ============================================================
    // 3. 共通処理
    // ============================================================

    function normalizeText(value) {
        if (value === undefined || value === null) {
            return '';
        }

        return String(value).trim();
    }

    function escapeHtml(value) {
        return normalizeText(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatDate(value) {
        if (!value) {
            return '日付未登録';
        }

        const dateValue = new Date(`${value}T00:00:00`);

        if (Number.isNaN(dateValue.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat(
            'ja-JP',
            {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }
        ).format(dateValue);
    }

    function getSummaryText(decision) {
        const candidates = [
            decision.final_reason,
            decision.dilemma_text,
            decision.trigger_text,
            decision.result_text,
            decision.learning_text
        ];

        const selectedText = candidates
            .map(normalizeText)
            .find(Boolean);

        if (!selectedText) {
            return '詳細はまだ登録されていません。';
        }

        if (selectedText.length <= 110) {
            return selectedText;
        }

        return `${selectedText.slice(0, 110)}…`;
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
        ].filter(Boolean).join(' / ');

        if (companyName && roleText) {
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

    // ============================================================
    // 4. 環境情報取得
    // ============================================================

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

        baseUrl = responseData.base_url.replace(/\/$/, '');
    }

    // ============================================================
    // 5. 一覧取得
    // ============================================================

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
            .catch(() => null);

        if (!response.ok) {
            throw new Error(
                getApiErrorMessage(
                    responseData,
                    'キャリアの振り返り一覧の取得に失敗しました。'
                )
            );
        }

        return responseData;
    }

    // ============================================================
    // 6. 空表示
    // ============================================================

    function renderEmptyState() {
        totalElement.textContent = '0';

        container.innerHTML = `
            <div class="career-decisions-empty">
                <div class="empty-icon" aria-hidden="true">
                    ◇
                </div>

                <h3>
                    まだ振り返りが登録されていません
                </h3>

                <p>
                    まずは、転職・異動・昇進など、
                    印象に残っている意思決定を1つ登録してみましょう。
                </p>

                <a
                    href="Career_decision_edit.html"
                    class="empty-add-button"
                >
                    最初の振り返りを追加する
                </a>
            </div>
        `;
    }

    // ============================================================
    // 7. カード生成
    // ============================================================

    function createDecisionCard(decision) {
        const card = document.createElement('article');
        card.className = 'career-decision-card';

        const title =
            normalizeText(decision.title)
            || `${normalizeText(decision.decision_type) || '意思決定'}の振り返り`;

        const decisionType =
            normalizeText(decision.decision_type)
            || '種類未登録';

        const relatedCareer =
            getRelatedCareerText(decision);

        const summaryText =
            getSummaryText(decision);

        const sameChoiceAnswer =
            normalizeText(decision.same_choice_answer);

        card.innerHTML = `
            <div class="career-decision-card__date">
                <span class="career-decision-card__date-label">
                    DECISION DATE
                </span>

                <time>
                    ${escapeHtml(
                        formatDate(decision.occurred_at)
                    )}
                </time>
            </div>

            <div class="career-decision-card__body">
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

                <h3 class="career-decision-card__title">
                    ${escapeHtml(title)}
                </h3>

                <p class="career-decision-card__summary">
                    ${escapeHtml(summaryText)}
                </p>

                ${
                    sameChoiceAnswer
                        ? `
                            <div class="career-decision-card__answer">
                                <span>
                                    今なら同じ選択をする
                                </span>

                                <strong>
                                    ${escapeHtml(sameChoiceAnswer)}
                                </strong>
                            </div>
                        `
                        : ''
                }
            </div>

            <div class="career-decision-card__actions">
                <a
                    href="Career_decision_edit.html?id=${encodeURIComponent(
                        decision.id
                    )}"
                    class="career-decision-card__edit"
                >
                    編集
                    <span aria-hidden="true">→</span>
                </a>
            </div>
        `;

        return card;
    }

    // ============================================================
    // 8. 一覧描画
    // ============================================================

    function renderCareerDecisions(responseData) {
        const decisions = Array.isArray(
            responseData.decisions
        )
            ? responseData.decisions
            : [];

        totalElement.textContent = String(
            responseData.count ?? decisions.length
        );

        if (decisions.length === 0) {
            renderEmptyState();
            return;
        }

        container.innerHTML = '';

        decisions.forEach(decision => {
            container.appendChild(
                createDecisionCard(decision)
            );
        });
    }

    // ============================================================
    // 9. 登録完了メッセージ
    // ============================================================

    function showCreatedMessage() {
        const params = new URLSearchParams(
            window.location.search
        );

        if (params.get('created') !== '1') {
            return;
        }

        const message = document.createElement('div');
        message.className =
            'career-decisions-page-message is-success';

        message.textContent =
            'キャリアの振り返りを登録しました。';

        const main = document.querySelector(
            '.career-decisions-main'
        );

        const header = document.querySelector(
            '.career-decisions-header'
        );

        if (main && header) {
            header.insertAdjacentElement(
                'afterend',
                message
            );
        }

        const cleanUrl = new URL(
            window.location.href
        );

        cleanUrl.searchParams.delete('created');

        window.history.replaceState(
            {},
            '',
            cleanUrl.pathname
        );

        window.setTimeout(function () {
            message.remove();
        }, 5000);
    }

    // ============================================================
    // 10. エラー表示
    // ============================================================

    function renderError(message) {
        totalElement.textContent = '--';

        container.innerHTML = `
            <div class="career-decisions-error">
                <h3>
                    一覧を読み込めませんでした
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

    // ============================================================
    // 11. 初期化
    // ============================================================

    async function initialize() {
        showCreatedMessage();

        try {
            await loadEnvironment();

            const responseData =
                await loadCareerDecisions();

            if (!responseData) {
                return;
            }

            renderCareerDecisions(responseData);

        } catch (error) {
            console.error(
                'Career Decision一覧初期化エラー:',
                error
            );

            renderError(
                error.message
                || 'キャリアの振り返り一覧の取得に失敗しました。'
            );
        }
    }

    await initialize();
});