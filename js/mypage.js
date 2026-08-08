document.addEventListener('DOMContentLoaded', function () {
    // ============================================================
    // 1. DOM・画面状態
    // ============================================================
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    const editButtons = document.querySelectorAll(
        '#edit-button-top, #edit-button-bottom'
    );
    const saveButtons = document.querySelectorAll(
        '#save-button-top, #save-button-bottom'
    );

    const form = document.getElementById('mypage-form');
    const jobExperiencesContainer = document.getElementById(
        'job-experiences-container'
    );
    const addJobExperienceButton = document.getElementById(
        'add-job-experience'
    );
    const careerDecisionCountElement = document.getElementById(
        'career-decision-count'
    );

    let companyIndexCounter = 0;
    let isEditing = false;
    let isSaving = false;

    // ============================================================
    // 2. 選択肢
    // ============================================================
    const industryOptions = [
        '金融',
        'コンサルティング・専門事務所',
        'IT・通信・インターネット',
        'マスコミ・広告関連',
        'メディカル',
        '生活インフラ、運輸、不動産、建設',
        '行政機関、社団法人、非営利団体',
        'メーカー・商社',
        'サービス、小売、外食',
        'その他'
    ];

    const jobCategoryOptions = [
        '営業',
        '管理・事務',
        '経営・企画',
        'マーケティング',
        'ITエンジニア',
        '機械・電気・電子・半導体（技術職）',
        '化学・薬品・食品（技術職）',
        '建築・土木・設備（技術職）',
        'メディカル（専門職）',
        '金融（専門職）',
        '不動産（専門職）',
        'コンサルタント・専門職',
        'クリエイティブ',
        'サービス・小売・運輸・その他'
    ];

    const salaryOptions = [
        '100万未満',
        '100〜200万円',
        '201〜300万円',
        '301〜400万円',
        '401〜500万円',
        '501〜600万円',
        '601〜700万円',
        '701〜800万円',
        '801〜900万円',
        '901〜1000万円',
        '1001〜1500万円',
        '1500万円以上'
    ];

    const workStyleOptions = [
        '出社中心',
        'ハイブリッド',
        'フルリモート',
        'フレックス',
        'シフト勤務',
        'その他'
    ];

    // ============================================================
    // 3. 共通関数
    // ============================================================
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeDateForInput(value) {
        if (!value || value === '0000-00-00') {
            return '';
        }

        return String(value).slice(0, 10);
    }

    function createOptions(options, selectedValue) {
        const selected = String(selectedValue ?? '');

        return options.map(option => {
            const selectedAttribute =
                String(option) === selected ? 'selected' : '';

            return `
                <option
                    value="${escapeHtml(option)}"
                    ${selectedAttribute}
                >
                    ${escapeHtml(option)}
                </option>
            `;
        }).join('');
    }

    function createSatisfactionOptions(selectedValue) {
        return [1, 2, 3, 4, 5].map(option => {
            const selectedAttribute =
                String(option) === String(selectedValue ?? '')
                    ? 'selected'
                    : '';

            return `
                <option value="${option}" ${selectedAttribute}>
                    ${option}
                </option>
            `;
        }).join('');
    }

    function setValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.value = value ?? '';
        }
    }

    function getValue(selector) {
        const element = document.querySelector(selector);
        return element ? element.value : '';
    }

    function getChecked(selector) {
        const element = document.querySelector(selector);
        return Boolean(element && element.checked);
    }

    /**
     * キャリアの振り返り登録件数を取得して表示する。
     */
    async function loadCareerDecisionCount(baseUrl) {
        if (!careerDecisionCountElement) {
            return;
        }

        try {
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
                return;
            }

            const responseData = await response
                .json()
                .catch(() => null);

            if (!response.ok) {
                throw new Error(
                    responseData?.detail
                    || 'キャリアの振り返り件数を取得できませんでした。'
                );
            }

            const decisions = Array.isArray(
                responseData?.decisions
            )
                ? responseData.decisions
                : [];

            const count = Number.isInteger(responseData?.count)
                ? responseData.count
                : decisions.length;

            careerDecisionCountElement.textContent =
                String(count);

        } catch (error) {
            console.error(
                'キャリアの振り返り件数取得エラー:',
                error
            );

            /*
            * 件数取得だけ失敗しても、
            * マイページ全体の表示は止めない。
            */
            careerDecisionCountElement.textContent = '--';
        }
    }

    // ============================================================
    // 4. タブ切替
    // ============================================================
    function switchTab(tabId) {
        tabLinks.forEach(link => {
            link.classList.toggle(
                'active',
                link.dataset.tab === tabId
            );
        });

        tabContents.forEach(content => {
            content.classList.toggle(
                'active',
                content.id === tabId
            );
        });
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });

    // ============================================================
    // 5. 閲覧・編集モード
    // ============================================================
    function getAllFormFields() {
        return document.querySelectorAll(
            '#mypage-form input, '
            + '#mypage-form textarea, '
            + '#mypage-form select'
        );
    }

    function setReadOnly(isReadOnly) {
        isEditing = !isReadOnly;

        getAllFormFields().forEach(field => {
            if (field.type === 'hidden') {
                return;
            }

            if (
                field.tagName === 'SELECT'
                || field.type === 'checkbox'
            ) {
                field.disabled = isReadOnly;
                return;
            }

            if (isReadOnly) {
                field.setAttribute('readonly', 'readonly');
            } else {
                field.removeAttribute('readonly');
            }
        });

        addJobExperienceButton.style.display =
            isReadOnly ? 'none' : 'inline-flex';

        document.querySelectorAll('.add-role-button').forEach(
            button => {
                button.style.display =
                    isReadOnly ? 'none' : 'inline-flex';
            }
        );
    }

    function toggleButtons(showEditButtons) {
        editButtons.forEach(button => {
            button.style.display =
                showEditButtons ? 'inline-flex' : 'none';
        });

        saveButtons.forEach(button => {
            button.style.display =
                showEditButtons ? 'none' : 'inline-flex';
            button.disabled = isSaving;
        });
    }

    function setSavingState(saving) {
        isSaving = saving;

        saveButtons.forEach(button => {
            button.disabled = saving;
            button.textContent = saving ? '保存中...' : '保存';
        });
    }

    // ============================================================
    // 6. 役割カード
    // ============================================================
    function createRoleCard(
        companyIndex,
        roleIndex,
        role = {}
    ) {
        const roleCard = document.createElement('div');

        roleCard.className = 'role-card';
        roleCard.dataset.roleIndex = String(roleIndex);

        roleCard.innerHTML = `
            <div class="role-card-header">
                <div>
                    <p class="role-card-kicker">
                        ROLE ${roleIndex + 1}
                    </p>
                    <h4>役割 ${roleIndex + 1}</h4>
                </div>
            </div>

            <input
                type="hidden"
                name="job_experiences[${companyIndex}]
                    [role_histories][${roleIndex}][id]"
                value="${escapeHtml(role.id || '')}"
            >

            <input
                type="hidden"
                name="job_experiences[${companyIndex}]
                    [role_histories][${roleIndex}][display_order]"
                value="${escapeHtml(
                    role.display_order || roleIndex + 1
                )}"
            >

            <div class="role-grid">
                <div class="floating-label">
                    <input
                        type="text"
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [department]"
                        value="${escapeHtml(
                            role.department || ''
                        )}"
                        placeholder=" "
                    >
                    <label>部署・組織名</label>
                </div>

                <div class="floating-label">
                    <input
                        type="text"
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [position]"
                        value="${escapeHtml(
                            role.position || ''
                        )}"
                        placeholder=" "
                    >
                    <label>役職・ポジション</label>
                </div>

                <div class="floating-label">
                    <select
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [job_category]"
                    >
                        <option value=""></option>
                        ${createOptions(
                            jobCategoryOptions,
                            role.job_category
                        )}
                    </select>
                    <label>職種</label>
                </div>

                <div class="floating-label">
                    <input
                        type="text"
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [job_sub_category]"
                        value="${escapeHtml(
                            role.job_sub_category || ''
                        )}"
                        placeholder=" "
                    >
                    <label>職種分類・専門領域</label>
                </div>

                <div class="floating-label">
                    <input
                        type="date"
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [start_period]"
                        value="${escapeHtml(
                            normalizeDateForInput(
                                role.start_period
                            )
                        )}"
                        placeholder=" "
                    >
                    <label>役割の開始日</label>
                </div>

                <div class="floating-label">
                    <input
                        type="date"
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [end_period]"
                        value="${escapeHtml(
                            normalizeDateForInput(
                                role.end_period
                            )
                        )}"
                        placeholder=" "
                    >
                    <label>役割の終了日</label>
                </div>

                <div class="floating-label">
                    <select
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [salary_range]"
                    >
                        <option value=""></option>
                        ${createOptions(
                            salaryOptions,
                            role.salary_range
                        )}
                    </select>
                    <label>年収レンジ</label>
                </div>

                <div class="floating-label">
                    <select
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [satisfaction_level]"
                    >
                        <option value=""></option>
                        ${createSatisfactionOptions(
                            role.satisfaction_level
                        )}
                    </select>
                    <label>仕事満足度</label>
                </div>

                <div class="floating-label">
                    <select
                        name="job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [work_style]"
                    >
                        <option value=""></option>
                        ${createOptions(
                            workStyleOptions,
                            role.work_style
                        )}
                    </select>
                    <label>働き方</label>
                </div>
            </div>

            <div class="floating-label role-description-field">
                <textarea
                    name="job_experiences[${companyIndex}]
                        [role_histories][${roleIndex}]
                        [role_description]"
                    placeholder=" "
                >${escapeHtml(
                    role.role_description || ''
                )}</textarea>
                <label>
                    この役割で担ったこと・取り組んだこと
                </label>
            </div>
        `;

        /*
         * HTMLのname属性内にコード整形用の空白・改行が
         * 入らないよう除去する。
         */
        roleCard.querySelectorAll('[name]').forEach(element => {
            element.name = element.name.replace(/\s+/g, '');
        });

        return roleCard;
    }

    // ============================================================
    // 7. 旧職歴データを役割形式に補完
    // ============================================================
    function getRolesForDisplay(jobExperience) {
        if (
            Array.isArray(jobExperience.role_histories)
            && jobExperience.role_histories.length > 0
        ) {
            return jobExperience.role_histories;
        }

        const hasLegacyRole = [
            jobExperience.position,
            jobExperience.job_category,
            jobExperience.job_sub_category,
            jobExperience.salary,
            jobExperience.satisfaction_level
        ].some(value => (
            value !== null
            && value !== undefined
            && value !== ''
        ));

        if (!hasLegacyRole) {
            return [];
        }

        return [
            {
                id: '',
                department: '',
                position: jobExperience.position || '',
                job_category:
                    jobExperience.job_category || '',
                job_sub_category:
                    jobExperience.job_sub_category || '',
                role_description: '',
                start_period:
                    jobExperience.work_start_period || '',
                end_period:
                    jobExperience.work_end_period || '',
                salary_range: jobExperience.salary || '',
                satisfaction_level:
                    jobExperience.satisfaction_level || '',
                work_style: '',
                display_order: 1
            }
        ];
    }

    // ============================================================
    // 8. 会社カード
    // ============================================================
    function createCompanyCard(jobExperience = {}) {
        const companyIndex = companyIndexCounter;
        const companyCard = document.createElement('section');

        companyCard.className =
            'job-info-group company-card';
        companyCard.dataset.index = String(companyIndex);

        companyCard.innerHTML = `
            <div class="company-card-header">
                <div>
                    <p class="company-card-kicker">
                        COMPANY ${companyIndex + 1}
                    </p>

                    <h3 class="company-card-title">
                        ${escapeHtml(
                            jobExperience.company_name
                            || `会社 ${companyIndex + 1}`
                        )}
                    </h3>

                    <p class="company-card-description">
                        会社での在籍情報と、その中で経験した
                        役割を分けて登録します。
                    </p>
                </div>
            </div>

            <input
                type="hidden"
                name="job_experiences[${companyIndex}][id]"
                value="${escapeHtml(jobExperience.id || '')}"
            >

            <div class="company-fields">
                <div class="floating-label">
                    <input
                        type="text"
                        name="job_experiences[${companyIndex}]
                            [company_name]"
                        value="${escapeHtml(
                            jobExperience.company_name || ''
                        )}"
                        placeholder=" "
                        required
                    >
                    <label>会社名</label>
                </div>

                <div class="floating-label">
                    <select
                        name="job_experiences[${companyIndex}]
                            [industry]"
                    >
                        <option value=""></option>
                        ${createOptions(
                            industryOptions,
                            jobExperience.industry
                        )}
                    </select>
                    <label>業界</label>
                </div>

                <div class="floating-label">
                    <input
                        type="date"
                        name="job_experiences[${companyIndex}]
                            [work_start_period]"
                        value="${escapeHtml(
                            normalizeDateForInput(
                                jobExperience.work_start_period
                            )
                        )}"
                        placeholder=" "
                    >
                    <label>入社日</label>
                </div>

                <div class="floating-label">
                    <input
                        type="date"
                        name="job_experiences[${companyIndex}]
                            [work_end_period]"
                        value="${escapeHtml(
                            normalizeDateForInput(
                                jobExperience.work_end_period
                            )
                        )}"
                        placeholder=" "
                    >
                    <label>退社日</label>
                </div>
            </div>

            <div class="checkbox-group company-private-field">
                <label>
                    <input
                        type="checkbox"
                        name="job_experiences[${companyIndex}]
                            [is_private]"
                        ${jobExperience.is_private
                            ? 'checked'
                            : ''}
                    >
                    この会社名を非公開にする
                </label>
            </div>

            <div class="roles-section">
                <div class="roles-section-header">
                    <div>
                        <p class="roles-section-kicker">
                            ROLE HISTORY
                        </p>
                        <h4>この会社で経験した役割</h4>
                    </div>

                    <button
                        type="button"
                        class="add-role-button"
                    >
                        ＋ 役割を追加
                    </button>
                </div>

                <div class="roles-container"></div>
            </div>
        `;

        companyCard.querySelectorAll('[name]').forEach(
            element => {
                element.name =
                    element.name.replace(/\s+/g, '');
            }
        );

        const rolesContainer = companyCard.querySelector(
            '.roles-container'
        );

        const roles = getRolesForDisplay(jobExperience);

        roles.forEach((role, roleIndex) => {
            rolesContainer.appendChild(
                createRoleCard(
                    companyIndex,
                    roleIndex,
                    role
                )
            );
        });

        const addRoleButton = companyCard.querySelector(
            '.add-role-button'
        );

        addRoleButton.addEventListener('click', function () {
            const roleIndex =
                rolesContainer.querySelectorAll(
                    '.role-card'
                ).length;

            const companyStartDate = companyCard.querySelector(
                `input[name="job_experiences`
                + `[${companyIndex}]`
                + `[work_start_period]"]`
            )?.value || '';

            const companyEndDate = companyCard.querySelector(
                `input[name="job_experiences`
                + `[${companyIndex}]`
                + `[work_end_period]"]`
            )?.value || '';

            rolesContainer.appendChild(
                createRoleCard(
                    companyIndex,
                    roleIndex,
                    {
                        start_period: companyStartDate,
                        end_period: companyEndDate,
                        display_order: roleIndex + 1
                    }
                )
            );

            /*
             * 動的追加された項目にも、
             * 現在の編集状態を反映する。
             */
            setReadOnly(!isEditing);
        });

        const companyNameInput = companyCard.querySelector(
            `input[name="job_experiences`
            + `[${companyIndex}]`
            + `[company_name]"]`
        );

        const companyTitle = companyCard.querySelector(
            '.company-card-title'
        );

        companyNameInput.addEventListener('input', function () {
            companyTitle.textContent =
                this.value.trim()
                || `会社 ${companyIndex + 1}`;
        });

        jobExperiencesContainer.appendChild(companyCard);

        companyIndexCounter += 1;

        setReadOnly(!isEditing);
    }

    addJobExperienceButton.addEventListener(
        'click',
        function () {
            createCompanyCard();
        }
    );

    // ============================================================
    // 9. 役割情報を送信用配列へ変換
    // ============================================================
    function collectRoleHistories(
        companyCard,
        companyIndex
    ) {
        const roles = [];

        companyCard.querySelectorAll('.role-card').forEach(
            (roleCard, roleIndex) => {
                const prefix =
                    `job_experiences[${companyIndex}]`
                    + `[role_histories][${roleIndex}]`;

                const role = {
                    id:
                        roleCard.querySelector(
                            `input[name="${prefix}[id]"]`
                        )?.value || null,

                    department:
                        roleCard.querySelector(
                            `input[name="${prefix}`
                            + `[department]"]`
                        )?.value || '',

                    position:
                        roleCard.querySelector(
                            `input[name="${prefix}`
                            + `[position]"]`
                        )?.value || '',

                    job_category:
                        roleCard.querySelector(
                            `select[name="${prefix}`
                            + `[job_category]"]`
                        )?.value || '',

                    job_sub_category:
                        roleCard.querySelector(
                            `input[name="${prefix}`
                            + `[job_sub_category]"]`
                        )?.value || '',

                    role_description:
                        roleCard.querySelector(
                            `textarea[name="${prefix}`
                            + `[role_description]"]`
                        )?.value || '',

                    start_period:
                        roleCard.querySelector(
                            `input[name="${prefix}`
                            + `[start_period]"]`
                        )?.value || '',

                    end_period:
                        roleCard.querySelector(
                            `input[name="${prefix}`
                            + `[end_period]"]`
                        )?.value || '',

                    salary_range:
                        roleCard.querySelector(
                            `select[name="${prefix}`
                            + `[salary_range]"]`
                        )?.value || '',

                    satisfaction_level:
                        roleCard.querySelector(
                            `select[name="${prefix}`
                            + `[satisfaction_level]"]`
                        )?.value || '',

                    work_style:
                        roleCard.querySelector(
                            `select[name="${prefix}`
                            + `[work_style]"]`
                        )?.value || '',

                    display_order: roleIndex + 1
                };

                const hasRoleContent = [
                    role.id,
                    role.department,
                    role.position,
                    role.job_category,
                    role.job_sub_category,
                    role.role_description,
                    role.start_period,
                    role.end_period,
                    role.salary_range,
                    role.satisfaction_level,
                    role.work_style
                ].some(value => (
                    value !== null
                    && String(value).trim() !== ''
                ));

                if (hasRoleContent) {
                    roles.push(role);
                }
            }
        );

        return roles;
    }

    // ============================================================
    // 10. 会社情報を送信用配列へ変換
    // ============================================================
    function collectJobExperiences() {
        const jobExperiences = [];

        document.querySelectorAll('.company-card').forEach(
            companyCard => {
                const companyIndex =
                    companyCard.dataset.index;

                const prefix =
                    `job_experiences[${companyIndex}]`;

                const roleHistories =
                    collectRoleHistories(
                        companyCard,
                        companyIndex
                    );

                /*
                 * 移行期間中は、先頭の役割を旧カラムにも送る。
                 */
                const primaryRole =
                    roleHistories[0] || {};

                const experience = {
                    id:
                        companyCard.querySelector(
                            `input[name="${prefix}[id]"]`
                        )?.value || null,

                    company_name:
                        companyCard.querySelector(
                            `input[name="${prefix}`
                            + `[company_name]"]`
                        )?.value || '',

                    industry:
                        companyCard.querySelector(
                            `select[name="${prefix}`
                            + `[industry]"]`
                        )?.value || '',

                    work_start_period:
                        companyCard.querySelector(
                            `input[name="${prefix}`
                            + `[work_start_period]"]`
                        )?.value || '',

                    work_end_period:
                        companyCard.querySelector(
                            `input[name="${prefix}`
                            + `[work_end_period]"]`
                        )?.value || '',

                    is_private: Boolean(
                        companyCard.querySelector(
                            `input[name="${prefix}`
                            + `[is_private]"]`
                        )?.checked
                    ),

                    role_histories: roleHistories,

                    // 旧形式との互換性維持
                    position:
                        primaryRole.position || '',

                    salary:
                        primaryRole.salary_range || '',

                    job_category:
                        primaryRole.job_category || '',

                    job_sub_category:
                        primaryRole.job_sub_category || '',

                    satisfaction_level:
                        primaryRole.satisfaction_level || ''
                };

                const hasCompanyContent = [
                    experience.id,
                    experience.company_name,
                    experience.industry,
                    experience.work_start_period,
                    experience.work_end_period,
                    roleHistories.length > 0
                ].some(Boolean);

                if (hasCompanyContent) {
                    jobExperiences.push(experience);
                }
            }
        );

        return jobExperiences;
    }

    // ============================================================
    // 11. API取得データを画面へ反映
    // ============================================================
    function populateForm(data) {
        // 基本情報
        setValue('username', data.username);
        setValue('email', data.email);
        setValue('family_name', data.family_name);
        setValue('given_name', data.given_name);
        setValue(
            'birthdate',
            normalizeDateForInput(data.birthdate)
        );
        setValue('gender', data.gender);

        document.getElementById(
            'newsletter_subscription'
        ).checked = Boolean(
            data.newsletter_subscription
        );

        // 学歴
        setValue('institution', data.institution);
        setValue('degree', data.degree);
        setValue('major', data.major);
        setValue(
            'education_start',
            normalizeDateForInput(data.education_start)
        );
        setValue(
            'education_end',
            normalizeDateForInput(data.education_end)
        );
        setValue('education_id', data.education_id);

        document.getElementById(
            'hide_institution'
        ).checked = Boolean(data.hide_institution);

        // 会社・役割
        jobExperiencesContainer.innerHTML = '';
        companyIndexCounter = 0;

        if (
            Array.isArray(data.job_experiences)
            && data.job_experiences.length > 0
        ) {
            data.job_experiences.forEach(
                jobExperience => {
                    createCompanyCard(jobExperience);
                }
            );
        }

        // 今後のキャリア志向
        setValue('career_type', data.career_type);
        setValue(
            'career_description',
            data.career_description
        );
        setValue(
            'career_aspirations_id',
            data.career_aspirations_id
        );
        setValue(
            'career_satisfaction_feedback',
            data.career_satisfaction_feedback
        );

        // キャリアのスタート地点
        setValue(
            'start_point_id',
            data.start_point_id
        );
        setValue('start_reason', data.start_reason);
        setValue(
            'first_job_feedback',
            data.first_job_feedback
        );

        // キャリアの転機
        setValue('transition_id', data.transition_id);
        setValue(
            'transition_type',
            data.transition_type
        );
        setValue(
            'transition_story',
            data.transition_story
        );
        setValue(
            'reason_for_job_change',
            data.reason_for_job_change
        );
        setValue(
            'job_experience_feedback',
            data.job_experience_feedback
        );

        // 達成と失敗
        setValue(
            'achievement_id',
            data.achievement_id
        );
        setValue(
            'proudest_achievement',
            data.proudest_achievement
        );
        setValue(
            'failure_experience',
            data.failure_experience
        );
        setValue(
            'lesson_learned',
            data.lesson_learned
        );
        setValue('concerns', data.concerns);

        // 学びと成長
        setValue('skill', data.skill);
        setValue(
            'growth_description',
            data.growth_description
        );
        setValue('growth_id', data.growth_id);

        setReadOnly(true);
        toggleButtons(true);
    }

    // ============================================================
    // 12. 保存リクエストを作成
    // ============================================================
    function buildRequestData() {
        const formData = new FormData(form);

        return {
            username:
                formData.get('username') || '',

            email:
                formData.get('email') || '',

            family_name:
                formData.get('family_name') || '',

            given_name:
                formData.get('given_name') || '',

            birthdate:
                formData.get('birthdate') || '',

            gender:
                getValue('#gender'),

            newsletter_subscription:
                getChecked('#newsletter_subscription'),

            institution:
                formData.get('institution') || '',

            hide_institution:
                getChecked('#hide_institution'),

            degree:
                formData.get('degree') || '',

            major:
                formData.get('major') || '',

            education_start:
                formData.get('education_start') || '',

            education_end:
                formData.get('education_end') || '',

            education_id:
                formData.get('education_id') || '',

            job_experiences:
                collectJobExperiences(),

            career_type:
                getValue('#career_type'),

            career_description:
                formData.get('career_description') || '',

            career_satisfaction_feedback:
                formData.get(
                    'career_satisfaction_feedback'
                ) || '',

            career_aspirations_id:
                formData.get(
                    'career_aspirations_id'
                ) || '',

            start_point_id:
                formData.get('start_point_id') || '',

            start_reason:
                formData.get('start_reason') || '',

            first_job_feedback:
                formData.get(
                    'first_job_feedback'
                ) || '',

            transition_id:
                formData.get('transition_id') || '',

            transition_type:
                getValue('#transition_type'),

            transition_story:
                formData.get('transition_story') || '',

            reason_for_job_change:
                formData.get(
                    'reason_for_job_change'
                ) || '',

            job_experience_feedback:
                formData.get(
                    'job_experience_feedback'
                ) || '',

            achievement_id:
                formData.get('achievement_id') || '',

            proudest_achievement:
                formData.get(
                    'proudest_achievement'
                ) || '',

            failure_experience:
                formData.get(
                    'failure_experience'
                ) || '',

            lesson_learned:
                formData.get('lesson_learned') || '',

            concerns:
                formData.get('concerns') || '',

            skill:
                formData.get('skill') || '',

            growth_description:
                formData.get(
                    'growth_description'
                ) || '',

            growth_id:
                formData.get('growth_id') || ''
        };
    }

    // ============================================================
    // 13. 折りたたみ表示
    // ============================================================
    function initializeCollapsible() {
        document.querySelectorAll(
            '.toggle-btn'
        ).forEach(button => {
            button.addEventListener('click', function () {
                const block = this.closest(
                    '.collapsible-block'
                );

                if (!block) {
                    return;
                }

                const details = block.querySelector(
                    '.collapsible-details'
                );

                if (!details) {
                    return;
                }

                details.style.display =
                    details.style.display === 'block'
                        ? 'none'
                        : 'block';
            });
        });
    }

    // ============================================================
    // 14. 初期化・API処理
    // ============================================================
    setReadOnly(true);
    toggleButtons(true);
    initializeCollapsible();

    fetch('/get-environment')
        .then(response => {
            if (!response.ok) {
                throw new Error(
                    '環境情報を取得できませんでした。'
                );
            }

            return response.json();
        })
        .then(environmentData => {
            const baseUrl = environmentData.base_url;

            // キャリアの振り返り登録件数を取得
            loadCareerDecisionCount(baseUrl);

            return fetch(
                `${baseUrl}/user-info/?include_private=true`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            )
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = 'Login.html';
                        return null;
                    }

                    if (!response.ok) {
                        throw new Error(
                            'ユーザー情報を取得できませんでした。'
                        );
                    }

                    return response.json();
                })
                .then(userData => {
                    if (userData) {
                        populateForm(userData);
                    }

                    // 編集
                    editButtons.forEach(button => {
                        button.addEventListener(
                            'click',
                            function () {
                                setReadOnly(false);
                                toggleButtons(false);
                            }
                        );
                    });

                    // 保存
                    saveButtons.forEach(button => {
                        button.addEventListener(
                            'click',
                            async function (event) {
                                event.preventDefault();

                                if (isSaving) {
                                    return;
                                }

                                const optionalRequired = [
                                    document.getElementById("career_type"),
                                    document.getElementById("transition_type")
                                ];
                                
                                optionalRequired.forEach(el => {
                                    if (el) {
                                        el.dataset.wasRequired = el.required;
                                        el.required = false;
                                    }
                                });
                                
                                const isValid = form.reportValidity();
                                
                                optionalRequired.forEach(el => {
                                    if (el && el.dataset.wasRequired === "true") {
                                        el.required = true;
                                    }
                                });
                                
                                if (!isValid) {
                                    return;
                                }

                                const requestData =
                                    buildRequestData();

                                try {
                                    setSavingState(true);

                                    const response =
                                        await fetch(
                                            `${baseUrl}`
                                            + `/update-user-info/`,
                                            {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type':
                                                        'application/json'
                                                },
                                                body: JSON.stringify(
                                                    requestData
                                                ),
                                                credentials:
                                                    'include'
                                            }
                                        );

                                    const responseData =
                                        await response
                                            .json()
                                            .catch(() => ({}));

                                    if (!response.ok) {
                                        throw new Error(
                                            responseData.detail
                                            || responseData.message
                                            || 'プロフィールを保存できませんでした。'
                                        );
                                    }

                                    alert(
                                        'プロフィールが更新されました。'
                                    );

                                    window.location.reload();

                                } catch (error) {
                                    console.error(
                                        'プロフィール保存エラー:',
                                        error
                                    );

                                    alert(
                                        error.message
                                        || 'エラーが発生しました。'
                                        + '再試行してください。'
                                    );

                                } finally {
                                    setSavingState(false);
                                }
                            }
                        );
                    });
                });
        })
        .catch(error => {
            console.error(
                'マイページの初期化中に'
                + 'エラーが発生しました:',
                error
            );

            alert(
                'マイページの読み込みに失敗しました。'
            );
        });
});