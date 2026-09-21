document.addEventListener(
    'DOMContentLoaded',
    function () {

        'use strict';


        /* ============================================================
           1. DOM
           ============================================================ */

        const tabLinks =
            document.querySelectorAll(
                '.tab-link'
            );


        const tabContents =
            document.querySelectorAll(
                '.tab-content'
            );


        const editButtonTop =
            document.getElementById(
                'edit-button-top'
            );


        const editButtonBottom =
            document.getElementById(
                'edit-button-bottom'
            );


        const saveButtonTop =
            document.getElementById(
                'save-button-top'
            );


        const saveButtonBottom =
            document.getElementById(
                'save-button-bottom'
            );


        const closeEditorButton =
            document.getElementById(
                'close-editor-button'
            );


        const form =
            document.getElementById(
                'mypage-form'
            );


        const profileEditor =
            document.getElementById(
                'profile-editor'
            );


        const jobExperiencesContainer =
            document.getElementById(
                'job-experiences-container'
            );


        const addJobExperienceButton =
            document.getElementById(
                'add-job-experience'
            );


        /* ------------------------------------------------------------
           Hero / Current Position
           ------------------------------------------------------------ */

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


        const currentCompanyNameElement =
            document.getElementById(
                'current-company-name'
            );


        const currentRoleNameElement =
            document.getElementById(
                'current-role-name'
            );


        /* ------------------------------------------------------------
           Current Crossroad
           ------------------------------------------------------------ */

        const currentCrossroadText =
            document.getElementById(
                'current-crossroad-text'
            );


        const currentCrossroadStoriesLink =
            document.getElementById(
                'current-crossroad-stories-link'
            );


        const careerTypeSummaryElement =
            document.getElementById(
                'career-type-summary'
            );


        const currentCareerViewText =
            document.getElementById(
                'current-career-view-text'
            );


        const environmentToAvoidText =
            document.getElementById(
                'environment-to-avoid-text'
            );


        /* ------------------------------------------------------------
           Career Decisions
           ------------------------------------------------------------ */

        const decisionPreviewList =
            document.getElementById(
                'mypage-decision-preview-list'
            );


        /* ------------------------------------------------------------
           Journey
           ------------------------------------------------------------ */

        const careerJourneySummary =
            document.getElementById(
                'career-journey-summary'
            );


        /* ------------------------------------------------------------
           Future
           ------------------------------------------------------------ */

        const futureCareerType =
            document.getElementById(
                'future-career-type'
            );


        const futureDesiredRole =
            document.getElementById(
                'future-desired-role'
            );


        const futureCareerDescription =
            document.getElementById(
                'future-career-description'
            );


        const futureCareerSkill =
            document.getElementById(
                'future-career-skill'
            );


        const futureFiveYearGoal =
            document.getElementById(
                'future-five-year-goal'
            );


        /* ============================================================
           2. STATE
           ============================================================ */

        let companyIndexCounter =
            0;


        let isEditing =
            false;


        let isSaving =
            false;


        let baseUrl =
            '';


        let loadedUserData =
            null;



        /* ============================================================
           3. OPTIONS
           ============================================================ */

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



        /* ============================================================
           4. COMMON
           ============================================================ */

        function escapeHtml(
            value
        ) {

            return String(
                value ?? ''
            )
                .replace(
                    /&/g,
                    '&amp;'
                )
                .replace(
                    /</g,
                    '&lt;'
                )
                .replace(
                    />/g,
                    '&gt;'
                )
                .replace(
                    /"/g,
                    '&quot;'
                )
                .replace(
                    /'/g,
                    '&#039;'
                );

        }


        function normalizeText(
            value
        ) {

            if (
                value === null
                ||
                value === undefined
            ) {

                return '';

            }


            const text =
                String(
                    value
                )
                    .trim();


            if (
                !text
                ||
                [
                    'null',
                    'undefined',
                    'none',
                    'n/a'
                ].includes(
                    text.toLowerCase()
                )
            ) {

                return '';

            }


            return text;

        }


        function hasValue(
            value
        ) {

            return Boolean(
                normalizeText(
                    value
                )
            );

        }


        function setText(
            element,
            value,
            fallback =
                'まだ登録されていません。'
        ) {

            if (!element) {
                return;
            }


            const text =
                normalizeText(
                    value
                );


            element.textContent =
                text
                || fallback;

        }


        function setValue(
            id,
            value
        ) {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {
                return;
            }


            element.value =
                value ?? '';

        }


        function getValue(
            selector
        ) {

            const element =
                document.querySelector(
                    selector
                );


            return element
                ? element.value
                : '';

        }


        function getChecked(
            selector
        ) {

            const element =
                document.querySelector(
                    selector
                );


            return Boolean(
                element
                &&
                element.checked
            );

        }


        function normalizeDateForInput(
            value
        ) {

            if (
                !value
                ||
                value ===
                '0000-00-00'
            ) {

                return '';

            }


            return String(
                value
            )
                .slice(
                    0,
                    10
                );

        }


        function dateSortValue(
            value
        ) {

            const normalized =
                normalizeDateForInput(
                    value
                );


            if (!normalized) {
                return 0;
            }


            const timestamp =
                new Date(
                    `${normalized}T00:00:00`
                )
                    .getTime();


            return Number.isFinite(
                timestamp
            )
                ? timestamp
                : 0;

        }


        function formatDateForDisplay(
            value
        ) {

            const normalized =
                normalizeDateForInput(
                    value
                );


            if (!normalized) {
                return '';
            }


            const parts =
                normalized.split(
                    '-'
                );


            if (
                parts.length
                <
                2
            ) {

                return normalized;

            }


            return (
                `${parts[0]}.${parts[1]}`
            );

        }


        function formatDecisionDate(
            value
        ) {

            const normalized =
                normalizeDateForInput(
                    value
                );


            if (!normalized) {
                return '';
            }


            const parts =
                normalized.split(
                    '-'
                );


            if (
                parts.length
                <
                2
            ) {

                return normalized;

            }


            return (
                `${parts[0]}年${Number(parts[1])}月`
            );

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


            if (
                !start
                &&
                !end
            ) {

                return '';

            }


            if (
                start
                &&
                !end
            ) {

                return (
                    `${start} – 現在`
                );

            }


            if (
                !start
                &&
                end
            ) {

                return (
                    `– ${end}`
                );

            }


            return (
                `${start} – ${end}`
            );

        }


        function truncateText(
            value,
            maxLength
        ) {

            const text =
                normalizeText(
                    value
                );


            if (
                !text
                ||
                text.length
                <=
                maxLength
            ) {

                return text;

            }


            return (
                text
                    .slice(
                        0,
                        maxLength
                    )
                    .trim()
                +
                '…'
            );

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
                .map(
                    option => {

                        const selectedAttribute =
                            String(
                                option
                            )
                            ===
                            selected

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

                    }
                )
                .join('');

        }


        function createSatisfactionOptions(
            selectedValue
        ) {

            return [
                1,
                2,
                3,
                4,
                5
            ]
                .map(
                    option => {

                        const selectedAttribute =

                            String(
                                option
                            )
                            ===
                            String(
                                selectedValue
                                ??
                                ''
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

                    }
                )
                .join('');

        }



        /* ============================================================
           5. ROLE / COMPANY HELPERS
           ============================================================ */

        function getRolesForDisplay(
            jobExperience
        ) {

            if (
                Array.isArray(
                    jobExperience
                        ?.role_histories
                )
                &&
                jobExperience
                    .role_histories
                    .length
                >
                0
            ) {

                return (
                    jobExperience
                        .role_histories
                );

            }


            /*
             * 旧データ互換
             */
            const hasLegacyRole = [

                jobExperience
                    ?.position,

                jobExperience
                    ?.job_category,

                jobExperience
                    ?.job_sub_category,

                jobExperience
                    ?.salary,

                jobExperience
                    ?.satisfaction_level

            ].some(
                hasValue
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
                        ||
                        '',

                    job_category:
                        jobExperience.job_category
                        ||
                        '',

                    job_sub_category:
                        jobExperience.job_sub_category
                        ||
                        '',

                    role_description:
                        '',

                    start_period:
                        jobExperience.work_start_period
                        ||
                        '',

                    end_period:
                        jobExperience.work_end_period
                        ||
                        '',

                    salary_range:
                        jobExperience.salary
                        ||
                        '',

                    satisfaction_level:
                        jobExperience.satisfaction_level
                        ||
                        '',

                    work_style:
                        '',

                    display_order:
                        1

                }

            ];

        }


        function getValidJobs(
            data
        ) {

            const jobs =
                Array.isArray(
                    data
                        ?.job_experiences
                )
                    ? data.job_experiences
                    : [];


            return jobs.filter(
                job => {

                    return [

                        job.company_name,

                        job.industry,

                        job.work_start_period,

                        job.work_end_period

                    ].some(
                        hasValue
                    )
                    ||
                    getRolesForDisplay(
                        job
                    )
                        .length
                    >
                    0;

                }
            );

        }


        function isCurrentJob(
            job
        ) {

            if (!job) {
                return false;
            }


            /*
             * 終了日なし = 現職
             */
            return !hasValue(
                job.work_end_period
            );

        }


        function getCurrentJob(
            jobs
        ) {

            if (
                !Array.isArray(
                    jobs
                )
                ||
                jobs.length
                ===
                0
            ) {

                return null;

            }


            /*
             * 現職が複数あっても
             * 開始日の一番新しい会社を採用。
             */
            const currentJobs =
                jobs
                    .filter(
                        isCurrentJob
                    )
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            const dateDiff =
                                dateSortValue(
                                    a.work_start_period
                                )
                                -
                                dateSortValue(
                                    b.work_start_period
                                );


                            if (dateDiff !== 0) {
                                return dateDiff;
                            }


                            return (
                                Number(
                                    a.id
                                    ||
                                    0
                                )
                                -
                                Number(
                                    b.id
                                    ||
                                    0
                                )
                            );

                        }
                    );


            if (
                currentJobs.length
                >
                0
            ) {

                return (
                    currentJobs[
                        currentJobs.length
                        -
                        1
                    ]
                );

            }


            /*
             * 現職がなければ
             * 最後の在籍先。
             */
            const sorted =
                [
                    ...jobs
                ]
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            const dateDiff =
                                dateSortValue(
                                    a.work_start_period
                                )
                                -
                                dateSortValue(
                                    b.work_start_period
                                );


                            if (dateDiff !== 0) {
                                return dateDiff;
                            }


                            return (
                                Number(
                                    a.id
                                    ||
                                    0
                                )
                                -
                                Number(
                                    b.id
                                    ||
                                    0
                                )
                            );

                        }
                    );


            return (
                sorted[
                    sorted.length
                    -
                    1
                ]
                ||
                null
            );

        }


        function getCurrentRole(
            job
        ) {

            if (!job) {
                return null;
            }


            const roles =
                getRolesForDisplay(
                    job
                );


            if (
                roles.length
                ===
                0
            ) {

                return null;

            }


            const currentRoles =
                roles
                    .filter(
                        role =>
                            !hasValue(
                                role.end_period
                            )
                    )
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            const dateDiff =
                                dateSortValue(
                                    a.start_period
                                )
                                -
                                dateSortValue(
                                    b.start_period
                                );


                            if (dateDiff !== 0) {
                                return dateDiff;
                            }


                            return (
                                Number(
                                    a.display_order
                                    ||
                                    a.id
                                    ||
                                    0
                                )
                                -
                                Number(
                                    b.display_order
                                    ||
                                    b.id
                                    ||
                                    0
                                )
                            );

                        }
                    );


            if (
                currentRoles.length
                >
                0
            ) {

                return (
                    currentRoles[
                        currentRoles.length
                        -
                        1
                    ]
                );

            }


            const sorted =
                [
                    ...roles
                ]
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            const dateDiff =
                                dateSortValue(
                                    a.start_period
                                )
                                -
                                dateSortValue(
                                    b.start_period
                                );


                            if (dateDiff !== 0) {
                                return dateDiff;
                            }


                            return (
                                Number(
                                    a.display_order
                                    ||
                                    a.id
                                    ||
                                    0
                                )
                                -
                                Number(
                                    b.display_order
                                    ||
                                    b.id
                                    ||
                                    0
                                )
                            );

                        }
                    );


            return (
                sorted[
                    sorted.length
                    -
                    1
                ]
                ||
                null
            );

        }


        function getRoleDisplayName(
            role,
            job
        ) {

            if (role) {

                const values = [

                    role.position,

                    role.job_category,

                    role.job_sub_category

                ]
                    .map(
                        normalizeText
                    )
                    .filter(
                        Boolean
                    );


                if (
                    values.length
                    >
                    0
                ) {

                    return values[0];

                }

            }


            const legacyValues = [

                job?.position,

                job?.job_category,

                job?.job_sub_category

            ]
                .map(
                    normalizeText
                )
                .filter(
                    Boolean
                );


            return (
                legacyValues[0]
                ||
                '未設定'
            );

        }



        /* ============================================================
           6. CURRENT POSITION
           ============================================================ */

        function renderCurrentPosition(
            data
        ) {

            const jobs =
                getValidJobs(
                    data
                );


            const roleCount =
                jobs.reduce(
                    (
                        total,
                        job
                    ) => {

                        return (
                            total
                            +
                            getRolesForDisplay(
                                job
                            )
                                .length
                        );

                    },
                    0
                );


            if (
                companyCountElement
            ) {

                companyCountElement
                    .textContent =
                        String(
                            jobs.length
                        );

            }


            if (
                roleCountElement
            ) {

                roleCountElement
                    .textContent =
                        String(
                            roleCount
                        );

            }


            const currentJob =
                getCurrentJob(
                    jobs
                );


            const currentRole =
                getCurrentRole(
                    currentJob
                );


            setText(
                currentCompanyNameElement,
                currentJob
                    ?.company_name,
                '未設定'
            );


            setText(
                currentRoleNameElement,
                getRoleDisplayName(
                    currentRole,
                    currentJob
                ),
                '未設定'
            );


            updateProfileCompletion(
                data,
                jobs,
                roleCount
            );

        }



        /* ============================================================
           7. PROFILE COMPLETION
           ============================================================ */

        function updateProfileCompletion(
            data,
            jobs,
            roleCount
        ) {

            const currentView =
                data
                    ?.current_career_view_detail
                ||
                {};


            const decisions =
                Array.isArray(
                    data
                        ?.career_decisions
                )
                    ? data.career_decisions
                    : [];


            const currentConcerns =
                normalizeText(
                    currentView
                        .current_concerns
                )
                ||
                normalizeText(
                    data.concerns
                );


            const desiredDirection =
                normalizeText(
                    currentView
                        .desired_direction
                )
                ||
                normalizeText(
                    data.career_type
                );


            const futureGoals =
                normalizeText(
                    currentView
                        .future_goals
                )
                ||
                normalizeText(
                    data.career_description
                );


            /*
             * 新Career GPSの完成度。
             *
             * 過去Legacy項目は計算対象にしない。
             */
            const checkpoints = [

                hasValue(
                    data.username
                ),

                (
                    hasValue(
                        data.birthdate
                    )
                    ||
                    hasValue(
                        data.gender
                    )
                ),

                jobs.length
                >
                0,

                roleCount
                >
                0,

                hasValue(
                    currentConcerns
                ),

                hasValue(
                    desiredDirection
                ),

                (
                    hasValue(
                        futureGoals
                    )
                    ||
                    hasValue(
                        currentView
                            .desired_role
                    )
                    ||
                    hasValue(
                        currentView
                            .five_year_goal
                    )
                ),

                decisions.length
                >
                0

            ];


            const completed =
                checkpoints
                    .filter(
                        Boolean
                    )
                    .length;


            const percentage =
                Math.round(
                    (
                        completed
                        /
                        checkpoints.length
                    )
                    *
                    100
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



        /* ============================================================
           8. CURRENT CROSSROAD
           ============================================================ */

        function detectCrossroadTheme(
            data,
            concern
        ) {

            /*
             * 将来current_dilemma_theme等を追加した場合は
             * その値を最優先。
             */
            const structuredTheme =
                normalizeText(
                    data
                        ?.current_career_view_detail
                        ?.current_dilemma_theme
                );


            if (
                structuredTheme
            ) {

                return structuredTheme;

            }


            /*
             * 現時点では自由文しかないため、
             * 明確な「転職」の表現に限って
             * changeへ接続する。
             *
             * AI推定ではなく固定文字判定。
             */
            const normalized =
                normalizeText(
                    concern
                );


            if (
                normalized.includes(
                    '転職'
                )
            ) {

                return 'change';

            }


            return '';

        }


        function renderCurrentCrossroad(
            data
        ) {

            const currentView =
                data
                    ?.current_career_view_detail
                ||
                {};


            const concern =
                normalizeText(
                    currentView
                        .current_concerns
                )
                ||
                normalizeText(
                    data.concerns
                );


            const careerView =
                normalizeText(
                    currentView
                        .current_career_view
                )
                ||
                normalizeText(
                    data.career_satisfaction_feedback
                );


            const desiredDirection =
                normalizeText(
                    currentView
                        .desired_direction
                )
                ||
                normalizeText(
                    data.career_type
                );


            const environmentToAvoid =
                normalizeText(
                    currentView
                        .environment_to_avoid
                );


            setText(
                currentCrossroadText,
                concern
            );


            setText(
                currentCareerViewText,
                careerView
            );


            setText(
                careerTypeSummaryElement,
                desiredDirection,
                '未設定'
            );


            setText(
                environmentToAvoidText,
                environmentToAvoid
            );


            if (
                !currentCrossroadStoriesLink
            ) {

                return;

            }


            const theme =
                detectCrossroadTheme(
                    data,
                    concern
                );


            if (!theme) {

                currentCrossroadStoriesLink
                    .hidden =
                        true;

                currentCrossroadStoriesLink
                    .removeAttribute(
                        'href'
                    );

                return;

            }


            currentCrossroadStoriesLink
                .href =
                    `Career_overview.html?theme=${encodeURIComponent(theme)}`;


            currentCrossroadStoriesLink
                .hidden =
                    false;

        }



        /* ============================================================
           9. CAREER DECISIONS
           ============================================================ */

        function getDecisionTitle(
            decision
        ) {

            const title =
                normalizeText(
                    decision
                        ?.title
                );


            if (title) {
                return title;
            }


            const type =
                normalizeText(
                    decision
                        ?.decision_type
                );


            switch (type) {

                case '転職':

                    return (
                        '転職という選択'
                    );


                case '現職継続':
                case '継続':
                case '残留':
                case '現職に残る':

                    return (
                        '今の会社に残るという選択'
                    );


                case '異動':

                    return (
                        '社内で新しい道を選んだ'
                    );


                default:

                    return (
                        type
                            ? `${type}という選択`
                            : 'キャリアの意思決定'
                    );

            }

        }


        function getDecisionSummary(
            decision
        ) {

            const candidates = [

                decision
                    ?.dilemma_text,

                decision
                    ?.priority_text,

                decision
                    ?.final_reason,

                decision
                    ?.result_text,

                decision
                    ?.learning_text

            ];


            const text =
                candidates
                    .map(
                        normalizeText
                    )
                    .find(
                        Boolean
                    );


            return text
                ? truncateText(
                    text,
                    110
                )
                : '詳細はまだ登録されていません。';

        }


        function sortDecisionsNewest(
            decisions
        ) {

            return [
                ...decisions
            ]
                .sort(
                    (
                        a,
                        b
                    ) => {

                        const dateDifference =

                            dateSortValue(
                                b.occurred_at
                            )
                            -
                            dateSortValue(
                                a.occurred_at
                            );


                        if (
                            dateDifference
                            !==
                            0
                        ) {

                            return (
                                dateDifference
                            );

                        }


                        return (

                            Number(
                                b.id
                                ||
                                0
                            )
                            -
                            Number(
                                a.id
                                ||
                                0
                            )

                        );

                    }
                );

        }


        function renderDecisionPreview(
            data
        ) {

            const decisions =
                Array.isArray(
                    data
                        ?.career_decisions
                )
                    ? data.career_decisions
                    : [];


            const count =
                decisions.length;


            if (
                careerDecisionCountElement
            ) {

                careerDecisionCountElement
                    .textContent =
                        String(
                            count
                        );

            }


            if (
                careerDecisionCountLargeElement
            ) {

                careerDecisionCountLargeElement
                    .textContent =
                        String(
                            count
                        );

            }


            if (
                !decisionPreviewList
            ) {

                return;

            }


            if (
                count
                ===
                0
            ) {

                decisionPreviewList
                    .innerHTML = `

                        <div class="mypage-decision-empty">

                            <p class="mypage-decision-empty__kicker">
                                YOUR DECISIONS
                            </p>

                            <h3>
                                まだ意思決定が登録されていません
                            </h3>

                            <p>
                                転職・異動・昇進など、
                                印象に残っている選択を
                                1つ振り返ってみましょう。
                            </p>

                        </div>

                    `;


                return;

            }


            const previewDecisions =
                sortDecisionsNewest(
                    decisions
                )
                    .slice(
                        0,
                        2
                    );


            decisionPreviewList
                .innerHTML =
                    previewDecisions
                        .map(
                            decision => {

                                const title =
                                    getDecisionTitle(
                                        decision
                                    );


                                const summary =
                                    getDecisionSummary(
                                        decision
                                    );


                                const date =
                                    formatDecisionDate(
                                        decision
                                            .occurred_at
                                    );


                                const decisionType =
                                    normalizeText(
                                        decision
                                            .decision_type
                                    );


                                const sameChoice =
                                    normalizeText(
                                        decision
                                            .same_choice_answer
                                    );


                                return `

                                    <article
                                        class="mypage-decision-preview-card"
                                    >

                                        <div
                                            class="mypage-decision-preview-card__meta"
                                        >

                                            ${
                                                decisionType

                                                    ? `
                                                        <span
                                                            class="mypage-decision-preview-card__type"
                                                        >
                                                            ${escapeHtml(decisionType)}
                                                        </span>
                                                    `

                                                    : ''
                                            }


                                            ${
                                                date

                                                    ? `
                                                        <span>
                                                            ${escapeHtml(date)}
                                                        </span>
                                                    `

                                                    : ''
                                            }

                                        </div>


                                        <h3>
                                            ${escapeHtml(title)}
                                        </h3>


                                        <p
                                            class="mypage-decision-preview-card__summary"
                                        >
                                            ${escapeHtml(summary)}
                                        </p>


                                        ${
                                            sameChoice

                                                ? `
                                                    <div
                                                        class="mypage-decision-preview-card__reflection"
                                                    >

                                                        <span>
                                                            今なら同じ選択をする
                                                        </span>

                                                        <strong>
                                                            ${escapeHtml(sameChoice)}
                                                        </strong>

                                                    </div>
                                                `

                                                : ''
                                        }


                                        <a
                                            href="Career_decision_edit.html?id=${encodeURIComponent(
                                                decision.id
                                            )}"
                                        >
                                            この意思決定を見る

                                            <span aria-hidden="true">
                                                →
                                            </span>
                                        </a>

                                    </article>

                                `;

                            }
                        )
                        .join('');

        }



        /* ============================================================
           10. CAREER JOURNEY
           ============================================================ */

        function renderCareerJourney(
            data
        ) {

            if (
                !careerJourneySummary
            ) {

                return;

            }


            const jobs =
                getValidJobs(
                    data
                );


            if (
                jobs.length
                ===
                0
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
                                Roleを登録すると、
                                ここにCareer Journeyが
                                表示されます。
                            </p>

                        </div>

                    `;


                return;

            }


            const sortedJobs =
                [
                    ...jobs
                ]
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            const dateDiff =
                                dateSortValue(
                                    a.work_start_period
                                )
                                -
                                dateSortValue(
                                    b.work_start_period
                                );


                            if (
                                dateDiff
                                !==
                                0
                            ) {

                                return dateDiff;

                            }


                            return (
                                Number(
                                    a.id
                                    ||
                                    0
                                )
                                -
                                Number(
                                    b.id
                                    ||
                                    0
                                )
                            );

                        }
                    );


            careerJourneySummary
                .innerHTML =
                    sortedJobs
                        .map(
                            (
                                job,
                                companyIndex
                            ) => {

                                const roles =
                                    getRolesForDisplay(
                                        job
                                    );


                                const sortedRoles =
                                    [
                                        ...roles
                                    ]
                                        .sort(
                                            (
                                                a,
                                                b
                                            ) => {

                                                const orderDiff =

                                                    Number(
                                                        a.display_order
                                                        ||
                                                        0
                                                    )
                                                    -
                                                    Number(
                                                        b.display_order
                                                        ||
                                                        0
                                                    );


                                                if (
                                                    orderDiff
                                                    !==
                                                    0
                                                ) {

                                                    return (
                                                        orderDiff
                                                    );

                                                }


                                                return (

                                                    dateSortValue(
                                                        a.start_period
                                                    )
                                                    -
                                                    dateSortValue(
                                                        b.start_period
                                                    )

                                                );

                                            }
                                        );


                                const companyName =
                                    normalizeText(
                                        job.company_name
                                    )
                                    ||
                                    '会社名未設定';


                                const industry =
                                    normalizeText(
                                        job.industry
                                    );


                                const period =
                                    formatPeriod(

                                        job.work_start_period,

                                        job.work_end_period

                                    );


                                const roleHtml =

                                    sortedRoles.length
                                    >
                                    0

                                        ? sortedRoles
                                            .map(
                                                (
                                                    role,
                                                    roleIndex
                                                ) => {

                                                    const roleTitle =
                                                        getRoleDisplayName(
                                                            role,
                                                            job
                                                        );


                                                    const roleCategory =

                                                        normalizeText(
                                                            role.job_category
                                                        )

                                                        ||

                                                        normalizeText(
                                                            role.job_sub_category
                                                        );


                                                    const rolePeriod =
                                                        formatPeriod(

                                                            role.start_period,

                                                            role.end_period

                                                        );


                                                    const roleDescription =
                                                        normalizeText(
                                                            role.role_description
                                                        );


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


                                                                ${
                                                                    roleCategory

                                                                        ? `
                                                                            <p
                                                                                class="career-journey-role__category"
                                                                            >
                                                                                ${escapeHtml(roleCategory)}
                                                                            </p>
                                                                        `

                                                                        : ''
                                                                }


                                                                ${
                                                                    normalizeText(
                                                                        role.department
                                                                    )

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
                                                class="
                                                    career-journey-role
                                                    career-journey-role--empty
                                                "
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
                                                        Role情報は
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

                                            <div
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


                                                    ${
                                                        industry

                                                            ? `
                                                                <p
                                                                    class="career-journey-company__industry"
                                                                >
                                                                    ${escapeHtml(industry)}
                                                                </p>
                                                            `

                                                            : ''
                                                    }

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

                                            </div>


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



        /* ============================================================
           11. NEXT DIRECTION
           ============================================================ */

        function renderNextDirection(
            data
        ) {

            const currentView =
                data
                    ?.current_career_view_detail
                ||
                {};


            const desiredDirection =
                normalizeText(
                    currentView
                        .desired_direction
                )
                ||
                normalizeText(
                    data.career_type
                );


            const desiredRole =
                normalizeText(
                    currentView
                        .desired_role
                );


            const futureGoals =
                normalizeText(
                    currentView
                        .future_goals
                )
                ||
                normalizeText(
                    data.career_description
                );


            let skills =
                normalizeText(
                    currentView
                        .skills_to_develop
                );


            /*
             * 旧learning_and_growthは
             * 表示fallbackとしてのみ残す。
             */
            if (!skills) {

                const legacySkill =
                    normalizeText(
                        data.skill
                    );


                const legacyGrowth =
                    normalizeText(
                        data.growth_description
                    );


                if (
                    legacySkill
                    &&
                    legacyGrowth
                ) {

                    skills =
                        `${legacySkill} — ${legacyGrowth}`;

                } else {

                    skills =
                        legacySkill
                        ||
                        legacyGrowth;

                }

            }


            const fiveYearGoal =
                normalizeText(
                    currentView
                        .five_year_goal
                );


            setText(
                futureCareerType,
                desiredDirection,
                '未設定'
            );


            setText(
                futureDesiredRole,
                desiredRole
            );


            setText(
                futureCareerDescription,
                futureGoals
            );


            setText(
                futureCareerSkill,
                skills
            );


            setText(
                futureFiveYearGoal,
                fiveYearGoal
            );

        }



        /* ============================================================
           12. TAB
           ============================================================ */

        function switchTab(
            tabId
        ) {

            tabLinks
                .forEach(
                    link => {

                        link.classList
                            .toggle(

                                'active',

                                link.dataset.tab
                                ===
                                tabId

                            );

                    }
                );


            tabContents
                .forEach(
                    content => {

                        content.classList
                            .toggle(

                                'active',

                                content.id
                                ===
                                tabId

                            );

                    }
                );

        }


        tabLinks
            .forEach(
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



        /* ============================================================
           13. EDITOR
           ============================================================ */

        function openEditor() {

            if (
                !profileEditor
            ) {

                return;

            }


            profileEditor.hidden =
                false;


            isEditing =
                true;


            setReadOnly(
                false
            );


            updateEditorButtons();


            requestAnimationFrame(
                () => {

                    profileEditor
                        .scrollIntoView(
                            {
                                behavior:
                                    'smooth',

                                block:
                                    'start'
                            }
                        );

                }
            );

        }


        function closeEditor() {

            if (
                !profileEditor
            ) {

                return;

            }


            /*
             * 保存していない変更は
             * API取得済みデータへ戻す。
             */
            if (
                loadedUserData
            ) {

                populateForm(
                    loadedUserData,
                    false
                );

            }


            isEditing =
                false;


            setReadOnly(
                true
            );


            updateEditorButtons();


            profileEditor.hidden =
                true;

        }


        function getAllFormFields() {

            return document
                .querySelectorAll(

                    '#mypage-form input, '
                    +
                    '#mypage-form textarea, '
                    +
                    '#mypage-form select'

                );

        }


        function setReadOnly(
            isReadOnly
        ) {

            getAllFormFields()
                .forEach(
                    field => {

                        if (
                            field.type
                            ===
                            'hidden'
                        ) {

                            return;

                        }


                        if (
                            field.tagName
                            ===
                            'SELECT'
                            ||
                            field.type
                            ===
                            'checkbox'
                        ) {

                            field.disabled =
                                isReadOnly;

                            return;

                        }


                        if (
                            isReadOnly
                        ) {

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

                        button
                            .style.display =

                                isReadOnly

                                    ? 'none'
                                    : 'inline-flex';

                    }
                );

        }


        function updateEditorButtons() {

            if (
                editButtonTop
            ) {

                editButtonTop
                    .style.display =

                        isEditing

                            ? 'none'
                            : 'inline-flex';

            }


            if (
                editButtonBottom
            ) {

                editButtonBottom
                    .style.display =
                        'none';

            }


            const saveDisplay =

                isEditing

                    ? 'inline-flex'
                    : 'none';


            if (
                saveButtonTop
            ) {

                saveButtonTop
                    .style.display =
                        saveDisplay;


                saveButtonTop
                    .disabled =
                        isSaving;

            }


            if (
                saveButtonBottom
            ) {

                saveButtonBottom
                    .style.display =
                        saveDisplay;


                saveButtonBottom
                    .disabled =
                        isSaving;

            }

        }


        function setSavingState(
            saving
        ) {

            isSaving =
                saving;


            [
                saveButtonTop,
                saveButtonBottom
            ]
                .filter(
                    Boolean
                )
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


        if (
            editButtonTop
        ) {

            editButtonTop
                .addEventListener(
                    'click',
                    openEditor
                );

        }


        if (
            closeEditorButton
        ) {

            closeEditorButton
                .addEventListener(
                    'click',
                    closeEditor
                );

        }



        /* ============================================================
           14. ROLE CARD
           ============================================================ */

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


            roleCard.dataset
                .roleIndex =
                    String(
                        roleIndex
                    );


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
                        role.id
                        ||
                        ''
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
                        ||
                        roleIndex + 1
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
                                ||
                                ''
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
                                ||
                                ''
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
                                ||
                                ''
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
                        ||
                        ''
                    )}</textarea>

                    <label>
                        この役割で担ったこと・取り組んだこと
                    </label>

                </div>

            `;


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



        /* ============================================================
           15. COMPANY CARD
           ============================================================ */

        function createCompanyCard(
            jobExperience = {}
        ) {

            if (
                !jobExperiencesContainer
            ) {

                return;

            }


            const companyIndex =
                companyIndexCounter;


            const companyCard =
                document.createElement(
                    'section'
                );


            companyCard.className =
                'job-info-group company-card';


            companyCard.dataset.index =
                String(
                    companyIndex
                );


            companyCard.innerHTML = `

                <div class="company-card-header">

                    <div>

                        <p class="company-card-kicker">
                            COMPANY ${companyIndex + 1}
                        </p>

                        <h3 class="company-card-title">

                            ${escapeHtml(
                                jobExperience.company_name
                                ||
                                `会社 ${companyIndex + 1}`
                            )}

                        </h3>

                        <p class="company-card-description">
                            会社での在籍情報と、
                            その中で経験したRoleを
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
                        ||
                        ''
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
                                ||
                                ''
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
                                    jobExperience
                                        .work_start_period
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
                                    jobExperience
                                        .work_end_period
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
                                jobExperience
                                    .is_private

                                    ? 'checked'
                                    : ''
                            }
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

                            <h4>
                                この会社で経験したRole
                            </h4>

                        </div>


                        <button
                            type="button"
                            class="add-role-button"
                        >
                            ＋ Roleを追加
                        </button>

                    </div>


                    <div class="roles-container">
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
                                    +
                                    `job_experiences`
                                    +
                                    `[${companyIndex}]`
                                    +
                                    `[work_start_period]`
                                    +
                                    `"]`

                                )
                                ?.value
                            ||
                            '';


                        const companyEndDate =

                            companyCard
                                .querySelector(

                                    `input[name="`
                                    +
                                    `job_experiences`
                                    +
                                    `[${companyIndex}]`
                                    +
                                    `[work_end_period]`
                                    +
                                    `"]`

                                )
                                ?.value
                            ||
                            '';


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


                        setReadOnly(
                            false
                        );

                    }
                );


            const companyNameInput =
                companyCard
                    .querySelector(

                        `input[name="`
                        +
                        `job_experiences`
                        +
                        `[${companyIndex}]`
                        +
                        `[company_name]`
                        +
                        `"]`

                    );


            const companyTitle =
                companyCard
                    .querySelector(
                        '.company-card-title'
                    );


            if (
                companyNameInput
                &&
                companyTitle
            ) {

                companyNameInput
                    .addEventListener(
                        'input',
                        function () {

                            companyTitle
                                .textContent =

                                    this.value
                                        .trim()

                                    ||

                                    `会社 ${companyIndex + 1}`;

                        }
                    );

            }


            jobExperiencesContainer
                .appendChild(
                    companyCard
                );


            companyIndexCounter +=
                1;


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



        /* ============================================================
           16. COLLECT ROLE
           ============================================================ */

        function collectRoleHistories(
            companyCard,
            companyIndex
        ) {

            const roles =
                [];


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
                            +
                            `[${companyIndex}]`
                            +
                            `[role_histories]`
                            +
                            `[${roleIndex}]`;


                        const role = {

                            id:

                                roleCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[id]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                null,


                            department:

                                roleCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[department]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            position:

                                roleCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[position]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            job_category:

                                roleCard
                                    .querySelector(

                                        `select[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[job_category]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            job_sub_category:

                                roleCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[job_sub_category]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            role_description:

                                roleCard
                                    .querySelector(

                                        `textarea[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[role_description]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            start_period:

                                roleCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[start_period]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            end_period:

                                roleCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[end_period]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            salary_range:

                                roleCard
                                    .querySelector(

                                        `select[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[salary_range]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            satisfaction_level:

                                roleCard
                                    .querySelector(

                                        `select[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[satisfaction_level]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            work_style:

                                roleCard
                                    .querySelector(

                                        `select[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[work_style]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            display_order:
                                roleIndex
                                +
                                1

                        };


                        const hasContent = [

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
                            hasValue
                        );


                        if (
                            hasContent
                        ) {

                            roles.push(
                                role
                            );

                        }

                    }
                );


            return roles;

        }



        /* ============================================================
           17. COLLECT COMPANIES
           ============================================================ */

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
                            companyCard.dataset
                                .index;


                        const prefix =

                            `job_experiences`
                            +
                            `[${companyIndex}]`;


                        const roleHistories =
                            collectRoleHistories(

                                companyCard,

                                companyIndex

                            );


                        const primaryRole =
                            roleHistories[0]
                            ||
                            {};


                        const experience = {

                            id:

                                companyCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[id]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                null,


                            company_name:

                                companyCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[company_name]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            industry:

                                companyCard
                                    .querySelector(

                                        `select[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[industry]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            work_start_period:

                                companyCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[work_start_period]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            work_end_period:

                                companyCard
                                    .querySelector(

                                        `input[name="`
                                        +
                                        `${prefix}`
                                        +
                                        `[work_end_period]`
                                        +
                                        `"]`

                                    )
                                    ?.value

                                ||

                                '',


                            is_private:

                                Boolean(

                                    companyCard
                                        .querySelector(

                                            `input[name="`
                                            +
                                            `${prefix}`
                                            +
                                            `[is_private]`
                                            +
                                            `"]`

                                        )
                                        ?.checked

                                ),


                            role_histories:
                                roleHistories,


                            /*
                             * API旧形式互換。
                             */
                            position:
                                primaryRole.position
                                ||
                                '',

                            salary:
                                primaryRole.salary_range
                                ||
                                '',

                            job_category:
                                primaryRole.job_category
                                ||
                                '',

                            job_sub_category:
                                primaryRole.job_sub_category
                                ||
                                '',

                            satisfaction_level:
                                primaryRole.satisfaction_level
                                ||
                                ''

                        };


                        const hasContent = [

                            experience.id,

                            experience.company_name,

                            experience.industry,

                            experience.work_start_period,

                            experience.work_end_period,

                            roleHistories.length
                            >
                            0

                        ].some(
                            Boolean
                        );


                        if (
                            hasContent
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



        /* ============================================================
           18. POPULATE FORM
           ============================================================ */

        function populateForm(
            data,
            renderPage = true
        ) {

            if (!data) {
                return;
            }


            /* --------------------------------------------------------
               Basic
               -------------------------------------------------------- */

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


            if (
                newsletter
            ) {

                newsletter.checked =
                    Boolean(
                        data.newsletter_subscription
                    );

            }


            /* --------------------------------------------------------
               Education
               -------------------------------------------------------- */

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


            if (
                hideInstitution
            ) {

                hideInstitution.checked =
                    Boolean(
                        data.hide_institution
                    );

            }


            /* --------------------------------------------------------
               Companies
               -------------------------------------------------------- */

            if (
                jobExperiencesContainer
            ) {

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

            }


            /* --------------------------------------------------------
               Current / Future
               -------------------------------------------------------- */

            const currentView =
                data.current_career_view_detail
                ||
                {};


            setValue(

                'career_satisfaction_feedback',

                normalizeText(
                    currentView.current_career_view
                )

                ||

                normalizeText(
                    data.career_satisfaction_feedback
                )

            );


            setValue(

                'concerns',

                normalizeText(
                    currentView.current_concerns
                )

                ||

                normalizeText(
                    data.concerns
                )

            );


            setValue(

                'career_type',

                normalizeText(
                    currentView.desired_direction
                )

                ||

                normalizeText(
                    data.career_type
                )

            );


            setValue(

                'career_description',

                normalizeText(
                    currentView.future_goals
                )

                ||

                normalizeText(
                    data.career_description
                )

            );


            setValue(
                'desired_role',
                currentView.desired_role
            );


            setValue(
                'skills_to_develop',
                currentView.skills_to_develop
            );


            setValue(
                'environment_to_avoid',
                currentView.environment_to_avoid
            );


            setValue(
                'five_year_goal',
                currentView.five_year_goal
            );


            setValue(
                'career_aspirations_id',
                currentView.id
                ||
                data.career_aspirations_id
                ||
                ''
            );


            if (
                renderPage
            ) {

                renderCurrentPosition(
                    data
                );


                renderCurrentCrossroad(
                    data
                );


                renderDecisionPreview(
                    data
                );


                renderCareerJourney(
                    data
                );


                renderNextDirection(
                    data
                );

            }


            setReadOnly(
                true
            );


            updateEditorButtons();

        }



        /* ============================================================
           19. REQUEST DATA
           ============================================================ */

        function buildRequestData() {

            const formData =
                new FormData(
                    form
                );


            const concern =
                formData.get(
                    'concerns'
                )
                ||
                '';


            const currentCareerView =
                formData.get(
                    'career_satisfaction_feedback'
                )
                ||
                '';


            const desiredDirection =
                getValue(
                    '#career_type'
                );


            const futureGoals =
                formData.get(
                    'career_description'
                )
                ||
                '';


            return {

                username:
                    formData.get(
                        'username'
                    )
                    ||
                    '',


                email:
                    formData.get(
                        'email'
                    )
                    ||
                    '',


                family_name:
                    formData.get(
                        'family_name'
                    )
                    ||
                    '',


                given_name:
                    formData.get(
                        'given_name'
                    )
                    ||
                    '',


                birthdate:
                    formData.get(
                        'birthdate'
                    )
                    ||
                    '',


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
                    ||
                    '',


                hide_institution:
                    getChecked(
                        '#hide_institution'
                    ),


                degree:
                    formData.get(
                        'degree'
                    )
                    ||
                    '',


                major:
                    formData.get(
                        'major'
                    )
                    ||
                    '',


                education_start:
                    formData.get(
                        'education_start'
                    )
                    ||
                    '',


                education_end:
                    formData.get(
                        'education_end'
                    )
                    ||
                    '',


                education_id:
                    formData.get(
                        'education_id'
                    )
                    ||
                    '',


                job_experiences:
                    collectJobExperiences(),


                /*
                 * ----------------------------------------------------
                 * 現行API互換フィールド
                 * ----------------------------------------------------
                 */

                career_satisfaction_feedback:
                    currentCareerView,


                career_type:
                    desiredDirection,


                career_description:
                    futureGoals,


                career_aspirations_id:
                    formData.get(
                        'career_aspirations_id'
                    )
                    ||
                    '',


                /*
                 * 旧update_user_info.pyでもconcernsは保存できるため
                 * backend切替まで維持。
                 */
                concerns:
                    concern,


                /*
                 * ----------------------------------------------------
                 * 新current_career_views正式フィールド
                 *
                 * 次にupdate_user_info.pyを対応させる。
                 * 現在のAPIでは未知フィールドは無視されるため、
                 * 先にfrontendを入れても既存処理は壊さない。
                 * ----------------------------------------------------
                 */

                current_career_view:
                    currentCareerView,


                current_concerns:
                    concern,


                desired_direction:
                    desiredDirection,


                future_goals:
                    futureGoals,


                desired_role:
                    formData.get(
                        'desired_role'
                    )
                    ||
                    '',


                skills_to_develop:
                    formData.get(
                        'skills_to_develop'
                    )
                    ||
                    '',


                environment_to_avoid:
                    formData.get(
                        'environment_to_avoid'
                    )
                    ||
                    '',


                five_year_goal:
                    formData.get(
                        'five_year_goal'
                    )
                    ||
                    ''

            };

        }



        /* ============================================================
           20. SAVE
           ============================================================ */

        async function saveProfile(
            event
        ) {

            event.preventDefault();


            if (
                isSaving
            ) {

                return;

            }


            const careerType =
                document.getElementById(
                    'career_type'
                );


            if (
                careerType
            ) {

                careerType.required =
                    false;

            }


            const isValid =
                form.reportValidity();


            if (
                !isValid
            ) {

                return;

            }


            const requestData =
                buildRequestData();


            try {

                setSavingState(
                    true
                );


                const response =
                    await fetch(

                        `${baseUrl}`
                        +
                        `/update-user-info/`,

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


                if (
                    response.status
                    ===
                    401
                ) {

                    window.location.href =
                        'Login.html';

                    return;

                }


                if (
                    !response.ok
                ) {

                    throw new Error(

                        responseData.detail

                        ||

                        responseData.message

                        ||

                        'Career GPSを保存できませんでした。'

                    );

                }


                alert(
                    'Career GPSを更新しました。'
                );


                window.location.reload();


            } catch (
                error
            ) {

                console.error(
                    'Career GPS保存エラー:',
                    error
                );


                alert(

                    error.message

                    ||

                    '保存中にエラーが発生しました。'

                );


            } finally {

                setSavingState(
                    false
                );

            }

        }



        /* ============================================================
           21. INITIALIZE
           ============================================================ */

        async function initialize() {

            setReadOnly(
                true
            );


            updateEditorButtons();


            try {

                /* ----------------------------------------------------
                   Environment
                   ---------------------------------------------------- */

                const environmentResponse =
                    await fetch(
                        '/get-environment',
                        {
                            credentials:
                                'include'
                        }
                    );


                if (
                    !environmentResponse.ok
                ) {

                    throw new Error(
                        '環境情報を取得できませんでした。'
                    );

                }


                const environmentData =
                    await environmentResponse
                        .json();


                baseUrl =
                    String(
                        environmentData.base_url
                        ||
                        ''
                    )
                        .replace(
                            /\/$/,
                            ''
                        );


                /* ----------------------------------------------------
                   User
                   ---------------------------------------------------- */

                const userResponse =
                    await fetch(

                        `${baseUrl}`
                        +
                        `/user-info/`
                        +
                        `?include_private=true`,

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
                    userResponse.status
                    ===
                    401
                ) {

                    window.location.href =
                        'Login.html';

                    return;

                }


                if (
                    !userResponse.ok
                ) {

                    throw new Error(
                        'ユーザー情報を取得できませんでした。'
                    );

                }


                const userData =
                    await userResponse
                        .json();


                loadedUserData =
                    userData;


                populateForm(
                    userData
                );


                /* ----------------------------------------------------
                   Save Buttons
                   ---------------------------------------------------- */

                [
                    saveButtonTop,
                    saveButtonBottom
                ]
                    .filter(
                        Boolean
                    )
                    .forEach(
                        button => {

                            button
                                .addEventListener(
                                    'click',
                                    saveProfile
                                );

                        }
                    );


                if (
                    form
                ) {

                    form.addEventListener(
                        'submit',
                        saveProfile
                    );

                }


            } catch (
                error
            ) {

                console.error(
                    'My Career GPS初期化エラー:',
                    error
                );


                alert(
                    'My Career GPSの読み込みに失敗しました。'
                );

            }

        }



        initialize();

    }
);