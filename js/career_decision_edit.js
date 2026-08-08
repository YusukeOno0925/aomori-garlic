document.addEventListener('DOMContentLoaded', async function () {
    'use strict';

    // ============================================================
    // 1. DOM取得
    // ============================================================

    const form = document.getElementById('career-decision-form');
    const messageElement = document.getElementById('form-message');
    const saveButton = document.getElementById('save-decision-button');

    const companySelect = document.getElementById('job_experience_id');
    const roleSelect = document.getElementById('role_history_id');

    const decisionTypeSelect = document.getElementById('decision_type');

    const deleteButton = document.getElementById(
        'delete-decision-btn'
    );

    if (
        !form
        || !messageElement
        || !saveButton
        || !companySelect
        || !roleSelect
        || !decisionTypeSelect
        || !deleteButton
    ) {
        console.error(
            'Career Decision画面に必要なHTML要素が見つかりません。'
        );
        return;
    }

    // ============================================================
    // 2. 状態管理
    // ============================================================

    let baseUrl = '';
    let companies = [];
    let roles = [];
    let isSaving = false;

    const urlParams = new URLSearchParams(
        window.location.search
    );

    const decisionIdValue = urlParams.get('id');

    const parsedDecisionId = decisionIdValue
        ? Number.parseInt(decisionIdValue, 10)
        : null;

    const decisionId = Number.isInteger(parsedDecisionId)
        && parsedDecisionId > 0
            ? parsedDecisionId
            : null;

    const isEditMode = decisionId !== null;

    // ============================================================
    // 3. 共通処理
    // ============================================================

    /**
     * 空文字をnullへ変換する。
     */
    function normalizeOptionalValue(value) {
        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value !== 'string') {
            return value;
        }

        const normalizedValue = value.trim();

        return normalizedValue === ''
            ? null
            : normalizedValue;
    }

    /**
     * selectの値を整数またはnullへ変換する。
     */
    function normalizeOptionalInteger(value) {
        const normalizedValue = normalizeOptionalValue(value);

        if (normalizedValue === null) {
            return null;
        }

        const integerValue = Number.parseInt(normalizedValue, 10);

        if (Number.isNaN(integerValue)) {
            return null;
        }

        return integerValue;
    }

    /**
     * APIレスポンスからエラーメッセージを取得する。
     */
    function getApiErrorMessage(responseData, fallbackMessage) {
        if (!responseData) {
            return fallbackMessage;
        }

        if (typeof responseData.detail === 'string') {
            return responseData.detail;
        }

        if (typeof responseData.message === 'string') {
            return responseData.message;
        }

        if (Array.isArray(responseData.detail)) {
            return responseData.detail
                .map(error => {
                    if (error && typeof error.msg === 'string') {
                        return error.msg;
                    }

                    return '';
                })
                .filter(Boolean)
                .join('、');
        }

        return fallbackMessage;
    }

    /**
     * 画面上部へメッセージを表示する。
     */
    function showMessage(message, type) {
        messageElement.textContent = message;
        messageElement.classList.remove(
            'is-success',
            'is-error'
        );

        if (type === 'success') {
            messageElement.classList.add('is-success');
        } else {
            messageElement.classList.add('is-error');
        }

        messageElement.style.display = 'block';

        messageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    /**
     * メッセージを非表示にする。
     */
    function hideMessage() {
        messageElement.textContent = '';
        messageElement.classList.remove(
            'is-success',
            'is-error'
        );
        messageElement.style.display = 'none';
    }

    /**
     * 保存中の表示を切り替える。
     */
    function setSavingState(saving) {
        isSaving = saving;
        saveButton.disabled = saving;
        saveButton.classList.toggle('is-loading', saving);

        if (saving) {
            saveButton.setAttribute('aria-busy', 'true');
        } else {
            saveButton.removeAttribute('aria-busy');
        }
    }

    /**
     * 日付を表示用に整形する。
     */
    function formatPeriod(startPeriod, endPeriod) {
        if (!startPeriod && !endPeriod) {
            return '';
        }

        const startText = startPeriod || '開始日不明';
        const endText = endPeriod || '現在';

        return `${startText} ～ ${endText}`;
    }

    // ============================================================
    // 4. 環境情報取得
    // ============================================================

    async function loadEnvironment() {
        const response = await fetch('/get-environment', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(
                '環境情報の取得に失敗しました。'
            );
        }

        const environmentData = await response.json();

        if (
            !environmentData
            || typeof environmentData.base_url !== 'string'
        ) {
            throw new Error(
                '環境情報の形式が正しくありません。'
            );
        }

        baseUrl = environmentData.base_url.replace(/\/$/, '');
    }

    // ============================================================
    // 5. 会社選択肢
    // ============================================================

    function renderCompanyOptions() {
        companySelect.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '会社を指定しない';

        companySelect.appendChild(defaultOption);

        companies.forEach(company => {
            const option = document.createElement('option');

            option.value = String(company.id);

            const companyName =
                normalizeOptionalValue(company.company_name)
                || '会社名未登録';

            const period = formatPeriod(
                company.work_start_period,
                company.work_end_period
            );

            option.textContent = period
                ? `${companyName}（${period}）`
                : companyName;

            companySelect.appendChild(option);
        });
    }

    // ============================================================
    // 6. 役割選択肢
    // ============================================================

    function renderRoleOptions(jobExperienceId) {
        roleSelect.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '役割を指定しない';

        roleSelect.appendChild(defaultOption);

        if (!jobExperienceId) {
            roleSelect.disabled = true;
            return;
        }

        const selectedCompanyId = Number.parseInt(
            jobExperienceId,
            10
        );

        const filteredRoles = roles.filter(role => {
            return Number(role.job_experience_id)
                === selectedCompanyId;
        });

        filteredRoles.forEach(role => {
            const option = document.createElement('option');

            option.value = String(role.id);

            const position =
                normalizeOptionalValue(role.position);

            const department =
                normalizeOptionalValue(role.department);

            const jobCategory =
                normalizeOptionalValue(role.job_category);

            const roleNameParts = [
                department,
                position,
                jobCategory
            ].filter(Boolean);

            const roleName = roleNameParts.length > 0
                ? roleNameParts.join(' / ')
                : `役割 ${role.display_order || role.id}`;

            const period = formatPeriod(
                role.start_period,
                role.end_period
            );

            option.textContent = period
                ? `${roleName}（${period}）`
                : roleName;

            roleSelect.appendChild(option);
        });

        roleSelect.disabled = false;
    }

    // ============================================================
    // 7. 会社・役割取得
    // ============================================================

    async function loadOptions() {
        const response = await fetch(
            `${baseUrl}/career-decisions/options/`,
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
            return;
        }

        const responseData = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                getApiErrorMessage(
                    responseData,
                    '会社・役割情報の取得に失敗しました。'
                )
            );
        }

        companies = Array.isArray(responseData.companies)
            ? responseData.companies
            : [];

        roles = Array.isArray(responseData.roles)
            ? responseData.roles
            : [];

        renderCompanyOptions();
        renderRoleOptions('');
    }

    // ============================================================
    // 8. 入力データ作成
    // ============================================================

    function buildRequestData() {
        return {
            job_experience_id: normalizeOptionalInteger(
                companySelect.value
            ),

            role_history_id: normalizeOptionalInteger(
                roleSelect.value
            ),

            title: normalizeOptionalValue(
                document.getElementById('title').value
            ),

            decision_type: normalizeOptionalValue(
                decisionTypeSelect.value
            ),

            occurred_at: normalizeOptionalValue(
                document.getElementById('occurred_at').value
            ),

            trigger_text: normalizeOptionalValue(
                document.getElementById('trigger_text').value
            ),

            dilemma_text: normalizeOptionalValue(
                document.getElementById('dilemma_text').value
            ),

            priority_text: normalizeOptionalValue(
                document.getElementById('priority_text').value
            ),

            final_reason: normalizeOptionalValue(
                document.getElementById('final_reason').value
            ),

            result_text: normalizeOptionalValue(
                document.getElementById('result_text').value
            ),

            unexpected_result: normalizeOptionalValue(
                document.getElementById(
                    'unexpected_result'
                ).value
            ),

            learning_text: normalizeOptionalValue(
                document.getElementById('learning_text').value
            ),

            same_choice_answer: normalizeOptionalValue(
                document.getElementById(
                    'same_choice_answer'
                ).value
            ),

            same_choice_reason: normalizeOptionalValue(
                document.getElementById(
                    'same_choice_reason'
                ).value
            ),

            advice_text: normalizeOptionalValue(
                document.getElementById('advice_text').value
            ),

            status: normalizeOptionalValue(
                document.getElementById('status').value
            ) || 'draft',

            needs_review: Number.parseInt(
                document.getElementById('needs_review').value,
                10
            ) || 0,

            display_order: Number.parseInt(
                document.getElementById('display_order').value,
                10
            ) || 1
        };
    }

    // ============================================================
    // 9. 入力チェック
    // ============================================================

    function clearValidationErrors() {
        form.querySelectorAll('.is-invalid').forEach(element => {
            element.classList.remove('is-invalid');
        });

        form.querySelectorAll('.field-error').forEach(element => {
            element.remove();
        });
    }

    function showFieldError(field, message) {
        if (!field) {
            return;
        }

        field.classList.add('is-invalid');

        const formField = field.closest('.form-field');

        if (!formField) {
            return;
        }

        const errorElement = document.createElement('p');
        errorElement.className = 'field-error';
        errorElement.textContent = message;

        formField.appendChild(errorElement);
    }

    function validateForm() {
        clearValidationErrors();
        hideMessage();

        let isValid = true;
        let firstInvalidField = null;

        if (!decisionTypeSelect.value) {
            showFieldError(
                decisionTypeSelect,
                '意思決定の種類を選択してください。'
            );

            isValid = false;
            firstInvalidField = decisionTypeSelect;
        }

        if (
            roleSelect.value
            && !companySelect.value
        ) {
            showFieldError(
                companySelect,
                '役割を指定する場合は、会社も指定してください。'
            );

            isValid = false;

            if (!firstInvalidField) {
                firstInvalidField = companySelect;
            }
        }

        if (!isValid && firstInvalidField) {
            firstInvalidField.focus();

            firstInvalidField.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }

        return isValid;
    }

    // ============================================================
    // 10. 新規登録
    // ============================================================

    async function createCareerDecision(requestData) {
        const response = await fetch(
            `${baseUrl}/career-decisions/`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(requestData)
            }
        );

        if (response.status === 401) {
            window.location.href = 'Login.html';
            return null;
        }

        const responseData = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                getApiErrorMessage(
                    responseData,
                    'キャリアの振り返りの登録に失敗しました。'
                )
            );
        }

        return responseData;
    }


    // ============================================================
    // 既存データ取得
    // ============================================================

    async function loadCareerDecisionDetail() {
        if (!isEditMode) {
            return null;
        }

        const response = await fetch(
            `${baseUrl}/career-decisions/${decisionId}`,
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
                    'キャリアの振り返りの取得に失敗しました。'
                )
            );
        }

        return responseData;
    }


    // ============================================================
    // フォームへの既存値反映
    // ============================================================

    function setFieldValue(id, value) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        element.value =
            value === null || value === undefined
                ? ''
                : String(value);
    }


    function populateForm(decision) {
        if (!decision) {
            return;
        }

        setFieldValue('decision_id', decision.id);
        setFieldValue('title', decision.title);
        setFieldValue(
            'decision_type',
            decision.decision_type
        );
        setFieldValue(
            'occurred_at',
            decision.occurred_at
        );

        setFieldValue(
            'job_experience_id',
            decision.job_experience_id
        );

        renderRoleOptions(
            decision.job_experience_id
                ? String(decision.job_experience_id)
                : ''
        );

        setFieldValue(
            'role_history_id',
            decision.role_history_id
        );

        setFieldValue(
            'trigger_text',
            decision.trigger_text
        );
        setFieldValue(
            'dilemma_text',
            decision.dilemma_text
        );
        setFieldValue(
            'priority_text',
            decision.priority_text
        );
        setFieldValue(
            'final_reason',
            decision.final_reason
        );
        setFieldValue(
            'result_text',
            decision.result_text
        );
        setFieldValue(
            'unexpected_result',
            decision.unexpected_result
        );
        setFieldValue(
            'learning_text',
            decision.learning_text
        );
        setFieldValue(
            'same_choice_answer',
            decision.same_choice_answer
        );
        setFieldValue(
            'same_choice_reason',
            decision.same_choice_reason
        );
        setFieldValue(
            'advice_text',
            decision.advice_text
        );

        setFieldValue(
            'status',
            decision.status || 'draft'
        );
        setFieldValue(
            'needs_review',
            decision.needs_review ?? 0
        );
        setFieldValue(
            'display_order',
            decision.display_order || 1
        );

        const pageTitle = document.getElementById(
            'page-title'
        );

        if (pageTitle) {
            pageTitle.textContent =
                'キャリアの振り返りを編集';
        }

        saveButton.textContent =
            '振り返りを更新する';
        
        deleteButton.style.display = 'inline-flex';

        document.title =
            'キャリアの振り返りを編集 | インノーマル';
    }


    // ============================================================
    // 既存データ更新
    // ============================================================

    async function updateCareerDecision(requestData) {
        if (!isEditMode) {
            throw new Error(
                '更新対象のIDが指定されていません。'
            );
        }

        const response = await fetch(
            `${baseUrl}/career-decisions/${decisionId}`,
            {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(requestData)
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
                    'キャリアの振り返りの更新に失敗しました。'
                )
            );
        }

        return responseData;
    }

    deleteButton.addEventListener('click', async function () {
        if (!isEditMode || isSaving) {
            return;
        }
    
        const confirmed = window.confirm(
            'この振り返りを削除しますか？\n削除した内容は元に戻せません。'
        );
    
        if (!confirmed) {
            return;
        }
    
        setSavingState(true);
        deleteButton.disabled = true;
        deleteButton.classList.add('is-loading');
        hideMessage();
    
        try {
            const responseData =
                await deleteCareerDecision();
    
            if (!responseData) {
                return;
            }
    
            window.location.href =
                'Career_decisions.html?deleted=1';
    
        } catch (error) {
            console.error(
                'キャリアの振り返り削除エラー:',
                error
            );
    
            showMessage(
                error.message
                    || 'キャリアの振り返りの削除に失敗しました。',
                'error'
            );
    
        } finally {
            setSavingState(false);
            deleteButton.disabled = false;
            deleteButton.classList.remove('is-loading');
        }
    });

    // ============================================================
    // 11. イベント登録
    // ============================================================

    companySelect.addEventListener('change', function () {
        renderRoleOptions(companySelect.value);
    });

    form.addEventListener('input', function (event) {
        const target = event.target;

        if (
            target
            && target.classList
            && target.classList.contains('is-invalid')
        ) {
            target.classList.remove('is-invalid');

            const formField = target.closest('.form-field');
            const fieldError = formField
                ? formField.querySelector('.field-error')
                : null;

            if (fieldError) {
                fieldError.remove();
            }
        }
    });

    form.addEventListener('change', function (event) {
        const target = event.target;

        if (
            target
            && target.classList
            && target.classList.contains('is-invalid')
        ) {
            target.classList.remove('is-invalid');

            const formField = target.closest('.form-field');
            const fieldError = formField
                ? formField.querySelector('.field-error')
                : null;

            if (fieldError) {
                fieldError.remove();
            }
        }
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        if (!validateForm()) {
            return;
        }

        const requestData = buildRequestData();

        setSavingState(true);
        hideMessage();

        try {
            const responseData = isEditMode
            ? await updateCareerDecision(requestData)
            : await createCareerDecision(requestData);

            if (!responseData) {
                return;
            }

            showMessage(
                responseData.message
                    || (
                        isEditMode
                            ? 'キャリアの振り返りを更新しました。'
                            : 'キャリアの振り返りを登録しました。'
                    ),
                'success'
            );
            
            window.setTimeout(function () {
                window.location.href = isEditMode
                    ? 'Career_decisions.html?updated=1'
                    : 'Career_decisions.html?created=1';
            }, 800);

        } catch (error) {
            console.error(
                'キャリアの振り返り登録エラー:',
                error
            );

            showMessage(
                error.message
                    || 'キャリアの振り返りの登録に失敗しました。',
                'error'
            );

        } finally {
            setSavingState(false);
        }
    });


    // ============================================================
    // 既存データ削除
    // ============================================================

    async function deleteCareerDecision() {
        if (!isEditMode) {
            throw new Error(
                '削除対象のIDが指定されていません。'
            );
        }

        const response = await fetch(
            `${baseUrl}/career-decisions/${decisionId}`,
            {
                method: 'DELETE',
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
                    'キャリアの振り返りの削除に失敗しました。'
                )
            );
        }

        return responseData;
    }

    // ============================================================
    // 12. 初期化
    // ============================================================

    async function initialize() {
        setSavingState(true);
    
        try {
            await loadEnvironment();
    
            // 会社・役割の選択肢を先に取得する
            await loadOptions();
    
            // URLにidがある場合だけ既存データを取得する
            if (isEditMode) {
                const decision =
                    await loadCareerDecisionDetail();
    
                populateForm(decision);
            }
    
        } catch (error) {
            console.error(
                'Career Decision画面の初期化エラー:',
                error
            );
    
            showMessage(
                error.message
                    || '画面の初期化に失敗しました。',
                'error'
            );
    
        } finally {
            setSavingState(false);
        }
    }

    await initialize();
});