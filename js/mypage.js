document.addEventListener('DOMContentLoaded', function () {

    // ============================================================
    // 1. DOM / 画面状態
    // ============================================================

    const tabLinks =
        document.querySelectorAll('.tab-link');

    const tabContents =
        document.querySelectorAll('.tab-content');


    const editButtonTop =
        document.getElementById('edit-button-top');

    const editButtonBottom =
        document.getElementById('edit-button-bottom');

    const saveButtonTop =
        document.getElementById('save-button-top');

    const saveButtonBottom =
        document.getElementById('save-button-bottom');

    const closeEditorButton =
        document.getElementById('close-editor-button');


    const form =
        document.getElementById('mypage-form');

    const profileEditor =
        document.getElementById('profile-editor');


    const jobExperiencesContainer =
        document.getElementById(
            'job-experiences-container'
        );

    const addJobExperienceButton =
        document.getElementById(
            'add-job-experience'
        );


    // ============================================================
    // Career GPS表示用
    // ============================================================

    const profileCompletionElement =
        document.getElementById(
            'profile-completion'
        );

    const profileCompletionBar =
        document.getElementById(
            'profile-completion-bar'
        );


    const companyCountElement =
        document.getElementById(
            'career-company-count'
        );

    const roleCountElement =
        document.getElementById(
            'career-role-count'
        );


    const careerDecisionCountElement =
        document.getElementById(
            'career-decision-count'
        );

    const careerDecisionCountLargeElement =
        document.getElementById(
            'career-decision-count-large'
        );


    const careerTypeSummaryElement =
        document.getElementById(
            'career-type-summary'
        );


    const careerJourneySummary =
        document.getElementById(
            'career-journey-summary'
        );


    const futureCareerType =
        document.getElementById(
            'future-career-type'
        );

    const futureCareerDescription =
        document.getElementById(
            'future-career-description'
        );

    const futureCareerSkill =
        document.getElementById(
            'future-career-skill'
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

        return String(
            value ?? ''
        )
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    }


    function normalizeDateForInput(value) {

        if (
            !value
            || value === '0000-00-00'
        ) {
            return '';
        }

        return String(value).slice(0, 10);

    }


    function formatDateForDisplay(value) {

        if (
            !value
            || value === '0000-00-00'
        ) {
            return '';
        }


        const normalized =
            String(value).slice(0, 10);

        const parts =
            normalized.split('-');


        if (parts.length < 2) {
            return normalized;
        }


        return `${parts[0]}.${parts[1]}`;

    }


    function formatPeriod(
        startValue,
        endValue
    ) {

        const start =
            formatDateForDisplay(
                startValue
            );

        const end =
            formatDateForDisplay(
                endValue
            );


        if (!start && !end) {
            return '';
        }


        if (start && !end) {
            return `${start} – 現在`;
        }


        if (!start && end) {
            return `– ${end}`;
        }


        return `${start} – ${end}`;

    }


    function createOptions(
        options,
        selectedValue
    ) {

        const selected =
            String(
                selectedValue ?? ''
            );


        return options
            .map(option => {

                const selectedAttribute =
                    String(option) === selected
                        ? 'selected'
                        : '';


                return `
                    <option
                        value="${escapeHtml(option)}"
                        ${selectedAttribute}
                    >
                        ${escapeHtml(option)}
                    </option>
                `;

            })
            .join('');

    }


    function createSatisfactionOptions(
        selectedValue
    ) {

        return [1, 2, 3, 4, 5]
            .map(option => {

                const selectedAttribute =
                    String(option)
                    === String(
                        selectedValue ?? ''
                    )
                        ? 'selected'
                        : '';


                return `
                    <option
                        value="${option}"
                        ${selectedAttribute}
                    >
                        ${option}
                    </option>
                `;

            })
            .join('');

    }


    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {
            element.value =
                value ?? '';
        }

    }


    function getValue(selector) {

        const element =
            document.querySelector(
                selector
            );


        return element
            ? element.value
            : '';

    }


    function getChecked(selector) {

        const element =
            document.querySelector(
                selector
            );


        return Boolean(
            element
            && element.checked
        );

    }


    function hasValue(value) {

        return (
            value !== null
            && value !== undefined
            && String(value).trim() !== ''
        );

    }



    // ============================================================
    // 4. Career GPS用
    //    Role取得
    // ============================================================

    function getRolesForDisplay(
        jobExperience
    ) {

        if (
            Array.isArray(
                jobExperience.role_histories
            )
            && jobExperience
                .role_histories
                .length > 0
        ) {

            return jobExperience
                .role_histories;

        }


        /*
         * 旧データとの互換性
         */

        const hasLegacyRole = [

            jobExperience.position,

            jobExperience.job_category,

            jobExperience.job_sub_category,

            jobExperience.salary,

            jobExperience.satisfaction_level

        ].some(
            value =>
                value !== null
                && value !== undefined
                && value !== ''
        );


        if (!hasLegacyRole) {
            return [];
        }


        return [

            {

                id:
                    '',

                department:
                    '',

                position:
                    jobExperience.position
                    || '',

                job_category:
                    jobExperience.job_category
                    || '',

                job_sub_category:
                    jobExperience.job_sub_category
                    || '',

                role_description:
                    '',

                start_period:
                    jobExperience.work_start_period
                    || '',

                end_period:
                    jobExperience.work_end_period
                    || '',

                salary_range:
                    jobExperience.salary
                    || '',

                satisfaction_level:
                    jobExperience.satisfaction_level
                    || '',

                work_style:
                    '',

                display_order:
                    1

            }

        ];

    }



    // ============================================================
    // 5. Career Snapshot
    // ============================================================

    function updateCareerSnapshot(data) {

        const jobs =
            Array.isArray(
                data.job_experiences
            )
                ? data.job_experiences
                : [];


        const validJobs =
            jobs.filter(job => {

                return [

                    job.company_name,
                    job.industry,
                    job.work_start_period,
                    job.work_end_period

                ].some(hasValue)
                || getRolesForDisplay(job)
                    .length > 0;

            });


        const roleCount =
            validJobs.reduce(
                (
                    total,
                    job
                ) => {

                    return total
                        + getRolesForDisplay(
                            job
                        ).length;

                },
                0
            );


        if (companyCountElement) {

            companyCountElement.textContent =
                String(
                    validJobs.length
                );

        }


        if (roleCountElement) {

            roleCountElement.textContent =
                String(roleCount);

        }


        const careerType =
            hasValue(
                data.career_type
            )
                ? data.career_type
                : '未設定';


        if (
            careerTypeSummaryElement
        ) {

            careerTypeSummaryElement
                .textContent =
                    careerType;

        }


        updateProfileCompletion(
            data,
            validJobs,
            roleCount
        );

    }



    // ============================================================
    // 6. プロフィール完成度
    // ============================================================

    function updateProfileCompletion(
        data,
        jobs,
        roleCount
    ) {

        /*
         * 完成度は、
         * Career GPSとして重要な
         * 10項目を対象に算出。
         */

        const checkpoints = [

            hasValue(
                data.username
            ),

            hasValue(
                data.birthdate
            ),

            hasValue(
                data.institution
            ),

            jobs.length > 0,

            roleCount > 0,

            (
                hasValue(
                    data.start_reason
                )
                || hasValue(
                    data.first_job_feedback
                )
            ),

            (
                hasValue(
                    data.transition_story
                )
                || hasValue(
                    data.reason_for_job_change
                )
            ),

            (
                hasValue(
                    data.proudest_achievement
                )
                || hasValue(
                    data.failure_experience
                )
                || hasValue(
                    data.lesson_learned
                )
            ),

            hasValue(
                data.career_type
            ),

            (
                hasValue(
                    data.skill
                )
                || hasValue(
                    data.growth_description
                )
            )

        ];


        const completedCount =
            checkpoints
                .filter(Boolean)
                .length;


        const percentage =
            Math.round(
                (
                    completedCount
                    / checkpoints.length
                )
                * 100
            );


        if (
            profileCompletionElement
        ) {

            profileCompletionElement
                .textContent =
                    `${percentage}%`;

        }


        if (
            profileCompletionBar
        ) {

            profileCompletionBar
                .style.width =
                    `${percentage}%`;

        }

    }



    // ============================================================
    // 7. Career Journey生成
    // ============================================================

    function renderCareerJourney(data) {

        if (!careerJourneySummary) {
            return;
        }


        const jobs =
            Array.isArray(
                data.job_experiences
            )
                ? data.job_experiences
                : [];


        const validJobs =
            jobs.filter(job => {

                return hasValue(
                    job.company_name
                )
                || getRolesForDisplay(job)
                    .length > 0;

            });


        if (
            validJobs.length === 0
        ) {

            careerJourneySummary
                .innerHTML = `

                    <div
                        class="career-journey-empty"
                    >

                        <p
                            class="career-journey-empty__kicker"
                        >
                            YOUR JOURNEY
                        </p>

                        <h3>
                            まだキャリアが
                            登録されていません
                        </h3>

                        <p>
                            これまで経験した会社や
                            役割を登録すると、
                            ここにあなたのCareer Journeyが
                            表示されます。
                        </p>

                    </div>

                `;


            return;
        }


        careerJourneySummary
            .innerHTML =
                validJobs
                    .map(
                        (
                            job,
                            companyIndex
                        ) => {

                            const roles =
                                getRolesForDisplay(
                                    job
                                );


                            const companyName =
                                hasValue(
                                    job.company_name
                                )
                                    ? job.company_name
                                    : '会社名未設定';


                            const industry =
                                hasValue(
                                    job.industry
                                )
                                    ? job.industry
                                    : '業界未設定';


                            const period =
                                formatPeriod(
                                    job.work_start_period,
                                    job.work_end_period
                                );


                            const roleHtml =
                                roles.length > 0

                                    ? roles
                                        .map(
                                            (
                                                role,
                                                roleIndex
                                            ) => {

                                                const roleTitle =

                                                    role.position
                                                    || role.job_category
                                                    || role.job_sub_category
                                                    || `役割 ${roleIndex + 1}`;


                                                const roleCategory =
                                                    role.job_category
                                                    || role.job_sub_category
                                                    || '職種未設定';


                                                const rolePeriod =
                                                    formatPeriod(
                                                        role.start_period,
                                                        role.end_period
                                                    );


                                                const roleDescription =
                                                    role.role_description
                                                    || '';


                                                return `

                                                    <div
                                                        class="career-journey-role"
                                                    >

                                                        <div
                                                            class="career-journey-role__line"
                                                        >

                                                            <span
                                                                class="career-journey-role__dot"
                                                            ></span>

                                                        </div>


                                                        <div
                                                            class="career-journey-role__content"
                                                        >

                                                            <div
                                                                class="career-journey-role__header"
                                                            >

                                                                <div>

                                                                    <p
                                                                        class="career-journey-role__label"
                                                                    >
                                                                        ROLE ${roleIndex + 1}
                                                                    </p>

                                                                    <h4>
                                                                        ${escapeHtml(roleTitle)}
                                                                    </h4>

                                                                </div>


                                                                ${
                                                                    rolePeriod

                                                                    ? `
                                                                        <span
                                                                            class="career-journey-role__period"
                                                                        >
                                                                            ${escapeHtml(rolePeriod)}
                                                                        </span>
                                                                    `

                                                                    : ''
                                                                }

                                                            </div>


                                                            <p
                                                                class="career-journey-role__category"
                                                            >
                                                                ${escapeHtml(roleCategory)}
                                                            </p>


                                                            ${
                                                                role.department

                                                                ? `
                                                                    <p
                                                                        class="career-journey-role__department"
                                                                    >
                                                                        ${escapeHtml(role.department)}
                                                                    </p>
                                                                `

                                                                : ''
                                                            }


                                                            ${
                                                                roleDescription

                                                                ? `
                                                                    <p
                                                                        class="career-journey-role__description"
                                                                    >
                                                                        ${escapeHtml(roleDescription)}
                                                                    </p>
                                                                `

                                                                : ''
                                                            }

                                                        </div>

                                                    </div>

                                                `;

                                            }
                                        )
                                        .join('')

                                    : `

                                        <div
                                            class="career-journey-role career-journey-role--empty"
                                        >

                                            <div
                                                class="career-journey-role__line"
                                            >

                                                <span
                                                    class="career-journey-role__dot"
                                                ></span>

                                            </div>


                                            <div
                                                class="career-journey-role__content"
                                            >

                                                <p>
                                                    役割情報は
                                                    まだ登録されていません。
                                                </p>

                                            </div>

                                        </div>

                                    `;


                            return `

                                <article
                                    class="career-journey-company"
                                >

                                    <div
                                        class="career-journey-company__index"
                                    >
                                        ${String(
                                            companyIndex + 1
                                        ).padStart(
                                            2,
                                            '0'
                                        )}
                                    </div>


                                    <div
                                        class="career-journey-company__body"
                                    >

                                        <header
                                            class="career-journey-company__header"
                                        >

                                            <div>

                                                <p
                                                    class="career-journey-company__kicker"
                                                >
                                                    COMPANY ${companyIndex + 1}
                                                </p>

                                                <h3>
                                                    ${escapeHtml(companyName)}
                                                </h3>

                                                <p
                                                    class="career-journey-company__industry"
                                                >
                                                    ${escapeHtml(industry)}
                                                </p>

                                            </div>


                                            ${
                                                period

                                                ? `
                                                    <span
                                                        class="career-journey-company__period"
                                                    >
                                                        ${escapeHtml(period)}
                                                    </span>
                                                `

                                                : ''
                                            }

                                        </header>


                                        <div
                                            class="career-journey-company__roles"
                                        >

                                            ${roleHtml}

                                        </div>

                                    </div>

                                </article>

                            `;

                        }
                    )
                    .join('');

    }



    // ============================================================
    // 8. LOOKING AHEAD
    // ============================================================

    function renderFutureCareer(data) {

        const careerType =
            hasValue(
                data.career_type
            )
                ? data.career_type
                : 'まだ設定されていません。';


        const description =
            hasValue(
                data.career_description
            )
                ? data.career_description
                : 'まだ登録されていません。';


        let skillText =
            'まだ登録されていません。';


        if (
            hasValue(
                data.skill
            )
            && hasValue(
                data.growth_description
            )
        ) {

            skillText =
                `${data.skill} — `
                + `${data.growth_description}`;

        } else if (
            hasValue(
                data.skill
            )
        ) {

            skillText =
                data.skill;

        } else if (
            hasValue(
                data.growth_description
            )
        ) {

            skillText =
                data.growth_description;

        }


        if (futureCareerType) {

            futureCareerType
                .textContent =
                    careerType;

        }


        if (
            futureCareerDescription
        ) {

            futureCareerDescription
                .textContent =
                    description;

        }


        if (futureCareerSkill) {

            futureCareerSkill
                .textContent =
                    skillText;

        }

    }



    // ============================================================
    // 9. Career Decision件数
    // ============================================================

    async function loadCareerDecisionCount(
        baseUrl
    ) {

        try {

            const response =
                await fetch(
                    `${baseUrl}/career-decisions/`,
                    {
                        method:
                            'GET',

                        credentials:
                            'include',

                        headers: {
                            Accept:
                                'application/json'
                        }
                    }
                );


            if (
                response.status === 401
            ) {

                window.location.href =
                    'Login.html';

                return;
            }


            const responseData =
                await response
                    .json()
                    .catch(
                        () => null
                    );


            if (!response.ok) {

                throw new Error(

                    responseData?.detail

                    || 'キャリアの振り返り件数を取得できませんでした。'

                );

            }


            const decisions =
                Array.isArray(
                    responseData?.decisions
                )
                    ? responseData.decisions
                    : [];


            const count =
                Number.isInteger(
                    responseData?.count
                )

                    ? responseData.count

                    : decisions.length;


            if (
                careerDecisionCountElement
            ) {

                careerDecisionCountElement
                    .textContent =
                        String(count);

            }


            if (
                careerDecisionCountLargeElement
            ) {

                careerDecisionCountLargeElement
                    .textContent =
                        String(count);

            }


        } catch (error) {

            console.error(
                'Career Decision件数取得エラー:',
                error
            );


            if (
                careerDecisionCountElement
            ) {

                careerDecisionCountElement
                    .textContent =
                        '--';

            }


            if (
                careerDecisionCountLargeElement
            ) {

                careerDecisionCountLargeElement
                    .textContent =
                        '--';

            }

        }

    }



    // ============================================================
    // 10. タブ切替
    // ============================================================

    function switchTab(tabId) {

        tabLinks.forEach(
            link => {

                link.classList.toggle(

                    'active',

                    link.dataset.tab
                    === tabId

                );

            }
        );


        tabContents.forEach(
            content => {

                content.classList.toggle(

                    'active',

                    content.id
                    === tabId

                );

            }
        );

    }


    tabLinks.forEach(
        link => {

            link.addEventListener(
                'click',
                function () {

                    switchTab(
                        this.dataset.tab
                    );

                }
            );

        }
    );



    // ============================================================
    // 11. Editor開閉
    // ============================================================

    function openEditor() {

        if (!profileEditor) {
            return;
        }


        profileEditor.hidden =
            false;


        isEditing =
            true;


        setReadOnly(false);

        updateEditorButtons();


        requestAnimationFrame(
            () => {

                profileEditor
                    .scrollIntoView({
                        behavior:
                            'smooth',

                        block:
                            'start'
                    });

            }
        );

    }


    function closeEditor() {

        if (!profileEditor) {
            return;
        }


        isEditing =
            false;


        setReadOnly(true);

        updateEditorButtons();


        profileEditor.hidden =
            true;

    }



    // ============================================================
    // 12. 編集 / 閲覧モード
    // ============================================================

    function getAllFormFields() {

        return document.querySelectorAll(

            '#mypage-form input, '
            + '#mypage-form textarea, '
            + '#mypage-form select'

        );

    }


    function setReadOnly(isReadOnly) {

        getAllFormFields()
            .forEach(
                field => {

                    if (
                        field.type
                        === 'hidden'
                    ) {
                        return;
                    }


                    if (
                        field.tagName
                            === 'SELECT'
                        || field.type
                            === 'checkbox'
                    ) {

                        field.disabled =
                            isReadOnly;

                        return;
                    }


                    if (isReadOnly) {

                        field.setAttribute(
                            'readonly',
                            'readonly'
                        );

                    } else {

                        field.removeAttribute(
                            'readonly'
                        );

                    }

                }
            );


        if (
            addJobExperienceButton
        ) {

            addJobExperienceButton
                .style.display =
                    isReadOnly
                        ? 'none'
                        : 'inline-flex';

        }


        document
            .querySelectorAll(
                '.add-role-button'
            )
            .forEach(
                button => {

                    button.style.display =
                        isReadOnly
                            ? 'none'
                            : 'inline-flex';

                }
            );

    }



    function updateEditorButtons() {

        if (editButtonTop) {

            editButtonTop.style.display =
                isEditing
                    ? 'none'
                    : 'inline-flex';

        }


        /*
         * 下部EditはHTML互換用。
         * 通常は表示しない。
         */

        if (editButtonBottom) {

            editButtonBottom.style.display =
                'none';

        }


        const saveDisplay =
            isEditing
                ? 'inline-flex'
                : 'none';


        if (saveButtonTop) {

            saveButtonTop.style.display =
                saveDisplay;

            saveButtonTop.disabled =
                isSaving;

        }


        if (saveButtonBottom) {

            saveButtonBottom.style.display =
                saveDisplay;

            saveButtonBottom.disabled =
                isSaving;

        }

    }



    function setSavingState(saving) {

        isSaving =
            saving;


        [
            saveButtonTop,
            saveButtonBottom
        ]
            .filter(Boolean)
            .forEach(
                button => {

                    button.disabled =
                        saving;


                    button.textContent =
                        saving
                            ? '保存中...'
                            : '変更を保存する';

                }
            );

    }



    if (editButtonTop) {

        editButtonTop
            .addEventListener(
                'click',
                openEditor
            );

    }


    if (closeEditorButton) {

        closeEditorButton
            .addEventListener(
                'click',
                closeEditor
            );

    }



    // ============================================================
    // 13. Role Card
    // ============================================================

    function createRoleCard(
        companyIndex,
        roleIndex,
        role = {}
    ) {

        const roleCard =
            document.createElement(
                'div'
            );


        roleCard.className =
            'role-card';


        roleCard.dataset.roleIndex =
            String(roleIndex);


        roleCard.innerHTML = `

            <div class="role-card-header">

                <div>

                    <p class="role-card-kicker">
                        ROLE ${roleIndex + 1}
                    </p>

                    <h4>
                        役割 ${roleIndex + 1}
                    </h4>

                </div>

            </div>


            <input
                type="hidden"
                name="
                    job_experiences[${companyIndex}]
                    [role_histories][${roleIndex}]
                    [id]
                "
                value="${escapeHtml(
                    role.id || ''
                )}"
            >


            <input
                type="hidden"
                name="
                    job_experiences[${companyIndex}]
                    [role_histories][${roleIndex}]
                    [display_order]
                "
                value="${escapeHtml(
                    role.display_order
                    || roleIndex + 1
                )}"
            >


            <div class="role-grid">


                <div class="floating-label">

                    <input
                        type="text"
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [department]
                        "
                        value="${escapeHtml(
                            role.department
                            || ''
                        )}"
                        placeholder=" "
                    >

                    <label>
                        部署・組織名
                    </label>

                </div>


                <div class="floating-label">

                    <input
                        type="text"
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [position]
                        "
                        value="${escapeHtml(
                            role.position
                            || ''
                        )}"
                        placeholder=" "
                    >

                    <label>
                        役職・ポジション
                    </label>

                </div>


                <div class="floating-label">

                    <select
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [job_category]
                        "
                    >

                        <option value="">
                        </option>

                        ${createOptions(
                            jobCategoryOptions,
                            role.job_category
                        )}

                    </select>

                    <label>
                        職種
                    </label>

                </div>


                <div class="floating-label">

                    <input
                        type="text"
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [job_sub_category]
                        "
                        value="${escapeHtml(
                            role.job_sub_category
                            || ''
                        )}"
                        placeholder=" "
                    >

                    <label>
                        職種分類・専門領域
                    </label>

                </div>


                <div class="floating-label">

                    <input
                        type="date"
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [start_period]
                        "
                        value="${escapeHtml(
                            normalizeDateForInput(
                                role.start_period
                            )
                        )}"
                        placeholder=" "
                    >

                    <label>
                        役割の開始日
                    </label>

                </div>


                <div class="floating-label">

                    <input
                        type="date"
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [end_period]
                        "
                        value="${escapeHtml(
                            normalizeDateForInput(
                                role.end_period
                            )
                        )}"
                        placeholder=" "
                    >

                    <label>
                        役割の終了日
                    </label>

                </div>


                <div class="floating-label">

                    <select
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [salary_range]
                        "
                    >

                        <option value="">
                        </option>

                        ${createOptions(
                            salaryOptions,
                            role.salary_range
                        )}

                    </select>

                    <label>
                        年収レンジ
                    </label>

                </div>


                <div class="floating-label">

                    <select
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [satisfaction_level]
                        "
                    >

                        <option value="">
                        </option>

                        ${createSatisfactionOptions(
                            role.satisfaction_level
                        )}

                    </select>

                    <label>
                        仕事満足度
                    </label>

                </div>


                <div class="floating-label">

                    <select
                        name="
                            job_experiences[${companyIndex}]
                            [role_histories][${roleIndex}]
                            [work_style]
                        "
                    >

                        <option value="">
                        </option>

                        ${createOptions(
                            workStyleOptions,
                            role.work_style
                        )}

                    </select>

                    <label>
                        働き方
                    </label>

                </div>

            </div>


            <div
                class="
                    floating-label
                    role-description-field
                "
            >

                <textarea
                    name="
                        job_experiences[${companyIndex}]
                        [role_histories][${roleIndex}]
                        [role_description]
                    "
                    placeholder=" "
                >${escapeHtml(
                    role.role_description
                    || ''
                )}</textarea>

                <label>
                    この役割で担ったこと・取り組んだこと
                </label>

            </div>

        `;


        /*
         * name属性の改行を除去
         */

        roleCard
            .querySelectorAll(
                '[name]'
            )
            .forEach(
                element => {

                    element.name =
                        element.name
                            .replace(
                                /\s+/g,
                                ''
                            );

                }
            );


        return roleCard;

    }



    // ============================================================
    // 14. Company Card
    // ============================================================

    function createCompanyCard(
        jobExperience = {}
    ) {

        const companyIndex =
            companyIndexCounter;


        const companyCard =
            document.createElement(
                'section'
            );


        companyCard.className =
            'job-info-group company-card';


        companyCard.dataset.index =
            String(companyIndex);


        companyCard.innerHTML = `

            <div class="company-card-header">

                <div>

                    <p class="company-card-kicker">
                        COMPANY ${companyIndex + 1}
                    </p>


                    <h3
                        class="company-card-title"
                    >
                        ${escapeHtml(
                            jobExperience.company_name
                            || `会社 ${companyIndex + 1}`
                        )}
                    </h3>


                    <p
                        class="company-card-description"
                    >
                        会社での在籍情報と、
                        その中で経験した役割を
                        分けて登録します。
                    </p>

                </div>

            </div>


            <input
                type="hidden"
                name="
                    job_experiences[${companyIndex}]
                    [id]
                "
                value="${escapeHtml(
                    jobExperience.id
                    || ''
                )}"
            >


            <div class="company-fields">


                <div class="floating-label">

                    <input
                        type="text"
                        name="
                            job_experiences[${companyIndex}]
                            [company_name]
                        "
                        value="${escapeHtml(
                            jobExperience.company_name
                            || ''
                        )}"
                        placeholder=" "
                        required
                    >

                    <label>
                        会社名
                    </label>

                </div>


                <div class="floating-label">

                    <select
                        name="
                            job_experiences[${companyIndex}]
                            [industry]
                        "
                    >

                        <option value="">
                        </option>

                        ${createOptions(
                            industryOptions,
                            jobExperience.industry
                        )}

                    </select>

                    <label>
                        業界
                    </label>

                </div>


                <div class="floating-label">

                    <input
                        type="date"
                        name="
                            job_experiences[${companyIndex}]
                            [work_start_period]
                        "
                        value="${escapeHtml(
                            normalizeDateForInput(
                                jobExperience.work_start_period
                            )
                        )}"
                        placeholder=" "
                    >

                    <label>
                        入社日
                    </label>

                </div>


                <div class="floating-label">

                    <input
                        type="date"
                        name="
                            job_experiences[${companyIndex}]
                            [work_end_period]
                        "
                        value="${escapeHtml(
                            normalizeDateForInput(
                                jobExperience.work_end_period
                            )
                        )}"
                        placeholder=" "
                    >

                    <label>
                        退社日
                    </label>

                </div>

            </div>


            <div
                class="
                    checkbox-group
                    company-private-field
                "
            >

                <label>

                    <input
                        type="checkbox"
                        name="
                            job_experiences[${companyIndex}]
                            [is_private]
                        "
                        ${
                            jobExperience.is_private
                                ? 'checked'
                                : ''
                        }
                    >

                    この会社名を非公開にする

                </label>

            </div>


            <div class="roles-section">

                <div
                    class="roles-section-header"
                >

                    <div>

                        <p
                            class="roles-section-kicker"
                        >
                            ROLE HISTORY
                        </p>

                        <h4>
                            この会社で経験した役割
                        </h4>

                    </div>


                    <button
                        type="button"
                        class="add-role-button"
                    >
                        ＋ 役割を追加
                    </button>

                </div>


                <div
                    class="roles-container"
                >
                </div>

            </div>

        `;


        companyCard
            .querySelectorAll(
                '[name]'
            )
            .forEach(
                element => {

                    element.name =
                        element.name
                            .replace(
                                /\s+/g,
                                ''
                            );

                }
            );


        const rolesContainer =
            companyCard
                .querySelector(
                    '.roles-container'
                );


        const roles =
            getRolesForDisplay(
                jobExperience
            );


        roles.forEach(
            (
                role,
                roleIndex
            ) => {

                rolesContainer
                    .appendChild(

                        createRoleCard(
                            companyIndex,
                            roleIndex,
                            role
                        )

                    );

            }
        );


        const addRoleButton =
            companyCard
                .querySelector(
                    '.add-role-button'
                );


        addRoleButton
            .addEventListener(
                'click',
                function () {

                    const roleIndex =
                        rolesContainer
                            .querySelectorAll(
                                '.role-card'
                            )
                            .length;


                    const companyStartDate =
                        companyCard
                            .querySelector(

                                `input[name="`
                                + `job_experiences`
                                + `[${companyIndex}]`
                                + `[work_start_period]`
                                + `"]`

                            )
                            ?.value
                        || '';


                    const companyEndDate =
                        companyCard
                            .querySelector(

                                `input[name="`
                                + `job_experiences`
                                + `[${companyIndex}]`
                                + `[work_end_period]`
                                + `"]`

                            )
                            ?.value
                        || '';


                    rolesContainer
                        .appendChild(

                            createRoleCard(

                                companyIndex,

                                roleIndex,

                                {

                                    start_period:
                                        companyStartDate,

                                    end_period:
                                        companyEndDate,

                                    display_order:
                                        roleIndex + 1

                                }

                            )

                        );


                    setReadOnly(false);

                }
            );


        const companyNameInput =
            companyCard
                .querySelector(

                    `input[name="`
                    + `job_experiences`
                    + `[${companyIndex}]`
                    + `[company_name]`
                    + `"]`

                );


        const companyTitle =
            companyCard
                .querySelector(
                    '.company-card-title'
                );


        if (
            companyNameInput
            && companyTitle
        ) {

            companyNameInput
                .addEventListener(
                    'input',
                    function () {

                        companyTitle
                            .textContent =

                                this.value.trim()

                                || `会社 ${companyIndex + 1}`;

                    }
                );

        }


        jobExperiencesContainer
            .appendChild(
                companyCard
            );


        companyIndexCounter += 1;


        setReadOnly(
            !isEditing
        );

    }



    if (
        addJobExperienceButton
    ) {

        addJobExperienceButton
            .addEventListener(
                'click',
                function () {

                    createCompanyCard();

                }
            );

    }



    // ============================================================
    // 15. Roleデータ収集
    // ============================================================

    function collectRoleHistories(
        companyCard,
        companyIndex
    ) {

        const roles = [];


        companyCard
            .querySelectorAll(
                '.role-card'
            )
            .forEach(
                (
                    roleCard,
                    roleIndex
                ) => {

                    const prefix =
                        `job_experiences`
                        + `[${companyIndex}]`
                        + `[role_histories]`
                        + `[${roleIndex}]`;


                    const role = {

                        id:
                            roleCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[id]`
                                    + `"]`

                                )
                                ?.value
                            || null,


                        department:
                            roleCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[department]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        position:
                            roleCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[position]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        job_category:
                            roleCard
                                .querySelector(

                                    `select[name="`
                                    + `${prefix}`
                                    + `[job_category]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        job_sub_category:
                            roleCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[job_sub_category]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        role_description:
                            roleCard
                                .querySelector(

                                    `textarea[name="`
                                    + `${prefix}`
                                    + `[role_description]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        start_period:
                            roleCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[start_period]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        end_period:
                            roleCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[end_period]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        salary_range:
                            roleCard
                                .querySelector(

                                    `select[name="`
                                    + `${prefix}`
                                    + `[salary_range]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        satisfaction_level:
                            roleCard
                                .querySelector(

                                    `select[name="`
                                    + `${prefix}`
                                    + `[satisfaction_level]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        work_style:
                            roleCard
                                .querySelector(

                                    `select[name="`
                                    + `${prefix}`
                                    + `[work_style]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        display_order:
                            roleIndex + 1

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

                    ].some(
                        value =>
                            value !== null
                            && String(value)
                                .trim()
                                !== ''
                    );


                    if (hasRoleContent) {

                        roles.push(role);

                    }

                }
            );


        return roles;

    }



    // ============================================================
    // 16. Companyデータ収集
    // ============================================================

    function collectJobExperiences() {

        const jobExperiences =
            [];


        document
            .querySelectorAll(
                '.company-card'
            )
            .forEach(
                companyCard => {

                    const companyIndex =
                        companyCard.dataset.index;


                    const prefix =
                        `job_experiences`
                        + `[${companyIndex}]`;


                    const roleHistories =
                        collectRoleHistories(
                            companyCard,
                            companyIndex
                        );


                    const primaryRole =
                        roleHistories[0]
                        || {};


                    const experience = {

                        id:
                            companyCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[id]`
                                    + `"]`

                                )
                                ?.value
                            || null,


                        company_name:
                            companyCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[company_name]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        industry:
                            companyCard
                                .querySelector(

                                    `select[name="`
                                    + `${prefix}`
                                    + `[industry]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        work_start_period:
                            companyCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[work_start_period]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        work_end_period:
                            companyCard
                                .querySelector(

                                    `input[name="`
                                    + `${prefix}`
                                    + `[work_end_period]`
                                    + `"]`

                                )
                                ?.value
                            || '',


                        is_private:
                            Boolean(

                                companyCard
                                    .querySelector(

                                        `input[name="`
                                        + `${prefix}`
                                        + `[is_private]`
                                        + `"]`

                                    )
                                    ?.checked

                            ),


                        role_histories:
                            roleHistories,


                        /*
                         * 旧API互換
                         */

                        position:
                            primaryRole.position
                            || '',

                        salary:
                            primaryRole.salary_range
                            || '',

                        job_category:
                            primaryRole.job_category
                            || '',

                        job_sub_category:
                            primaryRole.job_sub_category
                            || '',

                        satisfaction_level:
                            primaryRole.satisfaction_level
                            || ''

                    };


                    const hasCompanyContent = [

                        experience.id,
                        experience.company_name,
                        experience.industry,
                        experience.work_start_period,
                        experience.work_end_period,
                        roleHistories.length > 0

                    ].some(Boolean);


                    if (
                        hasCompanyContent
                    ) {

                        jobExperiences
                            .push(
                                experience
                            );

                    }

                }
            );


        return jobExperiences;

    }



    // ============================================================
    // 17. APIデータ → フォーム
    // ============================================================

    function populateForm(data) {

        // ------------------------
        // 基本情報
        // ------------------------

        setValue(
            'username',
            data.username
        );

        setValue(
            'email',
            data.email
        );

        setValue(
            'family_name',
            data.family_name
        );

        setValue(
            'given_name',
            data.given_name
        );

        setValue(
            'birthdate',
            normalizeDateForInput(
                data.birthdate
            )
        );

        setValue(
            'gender',
            data.gender
        );


        const newsletter =
            document.getElementById(
                'newsletter_subscription'
            );


        if (newsletter) {

            newsletter.checked =
                Boolean(
                    data.newsletter_subscription
                );

        }


        // ------------------------
        // 学歴
        // ------------------------

        setValue(
            'institution',
            data.institution
        );

        setValue(
            'degree',
            data.degree
        );

        setValue(
            'major',
            data.major
        );

        setValue(
            'education_start',
            normalizeDateForInput(
                data.education_start
            )
        );

        setValue(
            'education_end',
            normalizeDateForInput(
                data.education_end
            )
        );

        setValue(
            'education_id',
            data.education_id
        );


        const hideInstitution =
            document.getElementById(
                'hide_institution'
            );


        if (hideInstitution) {

            hideInstitution.checked =
                Boolean(
                    data.hide_institution
                );

        }


        // ------------------------
        // 会社・Role
        // ------------------------

        jobExperiencesContainer
            .innerHTML =
                '';


        companyIndexCounter =
            0;


        if (
            Array.isArray(
                data.job_experiences
            )
        ) {

            data.job_experiences
                .forEach(
                    jobExperience => {

                        createCompanyCard(
                            jobExperience
                        );

                    }
                );

        }


        // ------------------------
        // Future
        // ------------------------

        setValue(
            'career_type',
            data.career_type
        );

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


        // ------------------------
        // Start Point
        // ------------------------

        setValue(
            'start_point_id',
            data.start_point_id
        );

        setValue(
            'start_reason',
            data.start_reason
        );

        setValue(
            'first_job_feedback',
            data.first_job_feedback
        );


        // ------------------------
        // Turning Point
        // ------------------------

        setValue(
            'transition_id',
            data.transition_id
        );

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


        // ------------------------
        // Achievement
        // ------------------------

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

        setValue(
            'concerns',
            data.concerns
        );


        // ------------------------
        // Growth
        // ------------------------

        setValue(
            'skill',
            data.skill
        );

        setValue(
            'growth_description',
            data.growth_description
        );

        setValue(
            'growth_id',
            data.growth_id
        );


        // ====================================================
        // Career GPS表示を生成
        // ====================================================

        updateCareerSnapshot(data);

        renderCareerJourney(data);

        renderFutureCareer(data);


        setReadOnly(true);

        updateEditorButtons();

    }



    // ============================================================
    // 18. 保存データ作成
    // ============================================================

    function buildRequestData() {

        const formData =
            new FormData(form);


        return {

            username:
                formData.get(
                    'username'
                )
                || '',


            email:
                formData.get(
                    'email'
                )
                || '',


            family_name:
                formData.get(
                    'family_name'
                )
                || '',


            given_name:
                formData.get(
                    'given_name'
                )
                || '',


            birthdate:
                formData.get(
                    'birthdate'
                )
                || '',


            gender:
                getValue(
                    '#gender'
                ),


            newsletter_subscription:
                getChecked(
                    '#newsletter_subscription'
                ),


            institution:
                formData.get(
                    'institution'
                )
                || '',


            hide_institution:
                getChecked(
                    '#hide_institution'
                ),


            degree:
                formData.get(
                    'degree'
                )
                || '',


            major:
                formData.get(
                    'major'
                )
                || '',


            education_start:
                formData.get(
                    'education_start'
                )
                || '',


            education_end:
                formData.get(
                    'education_end'
                )
                || '',


            education_id:
                formData.get(
                    'education_id'
                )
                || '',


            job_experiences:
                collectJobExperiences(),


            career_type:
                getValue(
                    '#career_type'
                ),


            career_description:
                formData.get(
                    'career_description'
                )
                || '',


            career_satisfaction_feedback:
                formData.get(
                    'career_satisfaction_feedback'
                )
                || '',


            career_aspirations_id:
                formData.get(
                    'career_aspirations_id'
                )
                || '',


            start_point_id:
                formData.get(
                    'start_point_id'
                )
                || '',


            start_reason:
                formData.get(
                    'start_reason'
                )
                || '',


            first_job_feedback:
                formData.get(
                    'first_job_feedback'
                )
                || '',


            transition_id:
                formData.get(
                    'transition_id'
                )
                || '',


            transition_type:
                getValue(
                    '#transition_type'
                ),


            transition_story:
                formData.get(
                    'transition_story'
                )
                || '',


            reason_for_job_change:
                formData.get(
                    'reason_for_job_change'
                )
                || '',


            job_experience_feedback:
                formData.get(
                    'job_experience_feedback'
                )
                || '',


            achievement_id:
                formData.get(
                    'achievement_id'
                )
                || '',


            proudest_achievement:
                formData.get(
                    'proudest_achievement'
                )
                || '',


            failure_experience:
                formData.get(
                    'failure_experience'
                )
                || '',


            lesson_learned:
                formData.get(
                    'lesson_learned'
                )
                || '',


            concerns:
                formData.get(
                    'concerns'
                )
                || '',


            skill:
                formData.get(
                    'skill'
                )
                || '',


            growth_description:
                formData.get(
                    'growth_description'
                )
                || '',


            growth_id:
                formData.get(
                    'growth_id'
                )
                || ''

        };

    }



    // ============================================================
    // 19. 折りたたみ
    // ============================================================

    function initializeCollapsible() {

        document
            .querySelectorAll(
                '.toggle-btn'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        function () {

                            const block =
                                this.closest(
                                    '.collapsible-block'
                                );


                            if (!block) {
                                return;
                            }


                            const details =
                                block.querySelector(
                                    '.collapsible-details'
                                );


                            if (!details) {
                                return;
                            }


                            details.style.display =

                                details.style.display
                                    === 'block'

                                    ? 'none'

                                    : 'block';

                        }
                    );

                }
            );

    }



    // ============================================================
    // 20. 保存
    // ============================================================

    async function saveProfile(
        baseUrl,
        event
    ) {

        event.preventDefault();


        if (isSaving) {
            return;
        }


        const optionalRequired = [

            document.getElementById(
                'career_type'
            ),

            document.getElementById(
                'transition_type'
            )

        ];


        optionalRequired
            .forEach(
                element => {

                    if (!element) {
                        return;
                    }


                    element.dataset.wasRequired =
                        String(
                            element.required
                        );


                    element.required =
                        false;

                }
            );


        const isValid =
            form.reportValidity();


        optionalRequired
            .forEach(
                element => {

                    if (
                        element
                        && element.dataset
                            .wasRequired
                            === 'true'
                    ) {

                        element.required =
                            true;

                    }

                }
            );


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

                        method:
                            'POST',

                        headers: {

                            'Content-Type':
                                'application/json'

                        },

                        body:
                            JSON.stringify(
                                requestData
                            ),

                        credentials:
                            'include'

                    }

                );


            const responseData =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );


            if (!response.ok) {

                throw new Error(

                    responseData.detail

                    || responseData.message

                    || 'プロフィールを保存できませんでした。'

                );

            }


            alert(
                'Career GPSを更新しました。'
            );


            window.location.reload();


        } catch (error) {

            console.error(
                'Career GPS保存エラー:',
                error
            );


            alert(

                error.message

                || '保存中にエラーが発生しました。'

            );


        } finally {

            setSavingState(false);

        }

    }



    // ============================================================
    // 21. 初期化
    // ============================================================

    setReadOnly(true);

    updateEditorButtons();

    initializeCollapsible();


    fetch('/get-environment')

        .then(
            response => {

                if (!response.ok) {

                    throw new Error(
                        '環境情報を取得できませんでした。'
                    );

                }


                return response.json();

            }
        )


        .then(
            environmentData => {

                const baseUrl =
                    environmentData.base_url;


                // Career Decision件数
                loadCareerDecisionCount(
                    baseUrl
                );


                // ----------------------------
                // ユーザー情報
                // ----------------------------

                return fetch(

                    `${baseUrl}`
                    + `/user-info/`
                    + `?include_private=true`,

                    {

                        method:
                            'GET',

                        credentials:
                            'include'

                    }

                )


                    .then(
                        response => {

                            if (
                                response.status
                                === 401
                            ) {

                                window.location.href =
                                    'Login.html';

                                return null;

                            }


                            if (!response.ok) {

                                throw new Error(
                                    'ユーザー情報を取得できませんでした。'
                                );

                            }


                            return response.json();

                        }
                    )


                    .then(
                        userData => {

                            if (userData) {

                                populateForm(
                                    userData
                                );

                            }


                            // -------------------------
                            // Save button
                            // -------------------------

                            [
                                saveButtonTop,
                                saveButtonBottom
                            ]
                                .filter(Boolean)
                                .forEach(
                                    button => {

                                        button
                                            .addEventListener(
                                                'click',
                                                event => {

                                                    saveProfile(
                                                        baseUrl,
                                                        event
                                                    );

                                                }
                                            );

                                    }
                                );

                        }
                    );

            }
        )


        .catch(
            error => {

                console.error(
                    'マイページ初期化エラー:',
                    error
                );


                alert(
                    'My Career GPSの読み込みに失敗しました。'
                );

            }
        );

});