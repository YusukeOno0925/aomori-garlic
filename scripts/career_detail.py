import html

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import JSONResponse
from fastapi_mail import MessageSchema
from datetime import date as _date, datetime

from .register_user import get_db_connection
from .auth import User, get_current_user
from .email_config import fast_mail

from config import (
    environment,
    local_base_url,
    production_base_url,
)


router = APIRouter()

CAREER_TALK_ADMIN_EMAIL = (
    "imnormal0901@gmail.com"
)


def _get_career_talk_base_url():

    base_url = (
        local_base_url
        if environment == "development"
        else production_base_url
    )

    return str(
        base_url
    ).rstrip("/")


async def _send_career_talk_email(
    subject,
    recipient,
    body,
    label
):

    if not recipient:

        return


    try:

        html_body = (
            html.escape(
                body
            )
            .replace(
                "\n",
                "<br>"
            )
        )


        message = MessageSchema(
            subject=subject,
            recipients=[
                recipient
            ],
            body=html_body,
            subtype="html"
        )


        await fast_mail.send_message(
            message
        )


    except Exception as error:

        # メールが失敗しても、
        # Career Talkの申込自体は成功扱いにする。
        print(
            f"Career Talk email error ({label}):",
            error
        )

class CareerTalkRequestCreate(BaseModel):
    host_user_id: int
    decision_id: Optional[int] = None
    requester_name: str
    requester_email: str
    question_text: str
    preferred_schedule_text: Optional[str] = None


class CareerTalkHostUpdate(BaseModel):
    is_active: bool
    price_yen: int = 3000
    duration_minutes: int = 30
    host_message: Optional[str] = None


# ============================================================
# Helper functions
# ============================================================

def _normalize_date(value):
    """
    DATE, datetime, string, None を date または None に変換する
    """

    if value is None or value == "" or value == "0000-00-00":
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, _date):
        return value

    try:
        return datetime.strptime(
            str(value),
            "%Y-%m-%d"
        ).date()

    except Exception:
        return None


def _endyear_label(value):
    """
    終了日を表示用の年に変換する
    終了日がない場合は現時点を返す
    """

    date_value = _normalize_date(value)

    if date_value is None:
        return "現時点"

    return date_value.year


def _date_to_iso(value):
    """
    日付をISO形式の文字列に変換する
    """

    date_value = _normalize_date(value)

    if date_value is None:
        return None

    return date_value.isoformat()


# ============================================================
# Career Detail API
# ============================================================

@router.get("/career-detail/{career_id}")
async def get_career_detail(career_id: int):

    db = get_db_connection()
    cursor = None

    try:

        cursor = db.cursor(dictionary=True)


        # ====================================================
        # 1. UserとCareer Experienceを取得
        #
        # 最初にUserの存在確認を行う。
        #
        # Userが存在しない場合のみ404とする。
        # Userは存在するが職歴未登録の場合は、
        # Career Story未登録ユーザーとして200を返す。
        # ====================================================

        cursor.execute(
            """
            SELECT
                u.id,
                u.username,
                u.birthdate,

                c.start_reason,
                c.first_job_feedback,

                t.transition_type,
                t.transition_story,
                t.reason_for_job_change,
                t.job_experience_feedback,

                a.proudest_achievement,
                a.failure_experience,
                a.lesson_learned,
                a.concerns

            FROM users u

            LEFT JOIN career_start_point c
                ON u.id = c.user_id

            LEFT JOIN career_transitions t
                ON u.id = t.user_id

            LEFT JOIN career_achievements a
                ON u.id = a.user_id

            WHERE u.id = %s
            LIMIT 1
            """,
            (career_id,)
        )

        user_data = cursor.fetchone()


        # ====================================================
        # Userそのものが存在しない場合のみ404
        # ====================================================

        if not user_data:

            raise HTTPException(
                status_code=404,
                detail="Career not found"
            )


        # ====================================================
        # 2. Job Experienceを取得
        #
        # 職歴が0件でも404にはしない。
        # all_jobs = [] のまま後続処理を行う。
        # ====================================================

        cursor.execute(
            """
            SELECT
                j.id,
                j.user_id,
                j.company_name,
                j.position,
                j.job_category,
                j.salary,
                j.satisfaction_level,
                j.work_start_period,
                j.work_end_period,
                j.is_private
            FROM job_experiences j
            WHERE j.user_id = %s
            """,
            (career_id,)
        )

        all_jobs = cursor.fetchall()


        # ====================================================
        # 3. 最新職種を取得
        # ====================================================

        jobs_for_latest = list(all_jobs)


        jobs_for_latest.sort(
            key=lambda row: (
                _normalize_date(
                    row["work_end_period"]
                ) is None,

                _normalize_date(
                    row["work_end_period"]
                )
                or _date(9999, 12, 31),

                _normalize_date(
                    row["work_start_period"]
                )
                or _date(1, 1, 1)
            ),
            reverse=True
        )


        latest_job_category = (
            jobs_for_latest[0]["job_category"]
            if jobs_for_latest
            else None
        )


        # ====================================================
        # 4. Role Historyを取得
        #
        # 年収と満足度は会社単位ではなくRole単位で取得する。
        #
        # 職歴が0件の場合は結果も0件になるため、
        # そのまま空配列として扱う。
        # ====================================================

        cursor.execute(
            """
            SELECT
                rh.id,
                rh.job_experience_id,

                rh.department,
                rh.position,

                rh.job_category,
                rh.job_sub_category,

                rh.start_period,
                rh.end_period,

                rh.salary_range,
                rh.satisfaction_level,

                rh.display_order

            FROM role_histories rh

            INNER JOIN job_experiences je
                ON je.id = rh.job_experience_id

            WHERE je.user_id = %s

            ORDER BY
                je.work_start_period ASC,
                rh.display_order ASC,
                rh.start_period ASC,
                rh.id ASC
            """,
            (career_id,)
        )

        role_history_data = cursor.fetchall()


        # ====================================================
        # 5. Career Decisionを取得
        # ====================================================

        cursor.execute(
            """
            SELECT
                cd.id,
                cd.job_experience_id,
                cd.role_history_id,

                cd.title,
                cd.decision_type,
                cd.occurred_at,

                cd.trigger_text,
                cd.dilemma_text,
                cd.priority_text,
                cd.final_reason,

                cd.result_text,
                cd.unexpected_result,
                cd.learning_text,

                cd.same_choice_answer,
                cd.same_choice_reason,

                cd.advice_text,

                CASE
                    WHEN je.id IS NULL THEN NULL
                    WHEN je.is_private = 1 THEN '非公開'
                    ELSE je.company_name
                END AS company_name,

                rh.department,
                rh.position

            FROM career_decisions cd

            LEFT JOIN job_experiences je
                ON je.id = cd.job_experience_id
                AND je.user_id = cd.user_id

            LEFT JOIN role_histories rh
                ON rh.id = cd.role_history_id
                AND rh.job_experience_id = cd.job_experience_id

            WHERE cd.user_id = %s

            ORDER BY
                CASE
                    WHEN cd.occurred_at IS NULL THEN 1
                    ELSE 0
                END,

                cd.occurred_at DESC,
                cd.id DESC
            """,
            (career_id,)
        )

        career_decisions_data = cursor.fetchall()


        # ====================================================
        # 5-A. Career Talk受付情報
        # ====================================================

        cursor.execute(
            """
            SELECT
                is_active,
                price_yen,
                duration_minutes,
                host_message
            FROM career_talk_hosts
            WHERE user_id = %s
            AND is_active = 1
            LIMIT 1
            """,
            (career_id,)
        )

        career_talk_host = cursor.fetchone()


        # ====================================================
        # 6. 年齢を計算
        # ====================================================

        birthdate = user_data.get("birthdate")


        if isinstance(birthdate, (datetime, _date)):

            if isinstance(birthdate, datetime):
                birthdate = birthdate.date()

            today = _date.today()

            age = (
                today.year
                - birthdate.year
                - (
                    (today.month, today.day)
                    <
                    (birthdate.month, birthdate.day)
                )
            )

        else:

            age = "N/A"


        # ====================================================
        # 7. Role Historyを会社ごとに整理
        # ====================================================

        roles_by_company = {}


        for role in role_history_data:

            job_experience_id = role[
                "job_experience_id"
            ]


            if job_experience_id not in roles_by_company:

                roles_by_company[
                    job_experience_id
                ] = []


            roles_by_company[
                job_experience_id
            ].append(
                {
                    "id":
                        role["id"],

                    "department":
                        role["department"],

                    "position":
                        role["position"],

                    "job_category":
                        role["job_category"],

                    "job_sub_category":
                        role["job_sub_category"],

                    "start_period":
                        _date_to_iso(
                            role["start_period"]
                        ),

                    "end_period":
                        _date_to_iso(
                            role["end_period"]
                        ),

                    "salary":
                        (
                            role["salary_range"]
                            if role["salary_range"] is not None
                            else "N/A"
                        ),

                    "satisfaction_level":
                        (
                            role["satisfaction_level"]
                            if role["satisfaction_level"] is not None
                            else "N/A"
                        ),

                    "display_order":
                        role["display_order"]
                }
            )


        # ====================================================
        # 8. Companyデータを作成
        #
        # work_start_period がNULLでも会社情報は捨てない。
        #
        # これにより、
        # 「会社は登録済みだが入社日が未入力」
        # というCareer Storyも保持できる。
        # ====================================================

        companies = []


        sorted_jobs = sorted(
            all_jobs,
            key=lambda row:
                _normalize_date(
                    row["work_start_period"]
                )
                or _date(1, 1, 1)
        )


        for row in sorted_jobs:

            start_date = _normalize_date(
                row["work_start_period"]
            )


            company_roles = roles_by_company.get(
                row["id"],
                []
            )


            companies.append(
                {
                    "id":
                        row["id"],

                    "name":
                        (
                            row["company_name"]
                            if row["is_private"] == 0
                            else "非公開"
                        ),

                    "position":
                        row["position"],

                    "job_category":
                        row["job_category"],

                    # 入社日未入力の場合はNoneを返す
                    "startYear":
                        (
                            start_date.year
                            if start_date
                            else None
                        ),

                    "endYear":
                        _endyear_label(
                            row["work_end_period"]
                        ),

                    # 既存データとの互換性のため
                    # 会社単位の値も残す
                    "salary":
                        (
                            row["salary"]
                            if row["salary"] is not None
                            else "N/A"
                        ),

                    "satisfaction_level":
                        (
                            row["satisfaction_level"]
                            if row["satisfaction_level"] is not None
                            else "N/A"
                        ),

                    # Career Detailではこちらを優先して利用する
                    "roles":
                        company_roles
                }
            )


        # ====================================================
        # 9. Career Decisionレスポンスを作成
        # ====================================================

        career_decisions = []


        for row in career_decisions_data:

            career_decisions.append(
                {
                    "id":
                        row["id"],

                    "job_experience_id":
                        row["job_experience_id"],

                    "role_history_id":
                        row["role_history_id"],

                    "title":
                        row["title"],

                    "decision_type":
                        row["decision_type"],

                    "occurred_at":
                        _date_to_iso(
                            row["occurred_at"]
                        ),

                    "company_name":
                        row["company_name"],

                    "department":
                        row["department"],

                    "position":
                        row["position"],

                    "trigger_text":
                        row["trigger_text"],

                    "dilemma_text":
                        row["dilemma_text"],

                    "priority_text":
                        row["priority_text"],

                    "final_reason":
                        row["final_reason"],

                    "result_text":
                        row["result_text"],

                    "unexpected_result":
                        row["unexpected_result"],

                    "learning_text":
                        row["learning_text"],

                    "same_choice_answer":
                        row["same_choice_answer"],

                    "same_choice_reason":
                        row["same_choice_reason"],

                    "advice_text":
                        row["advice_text"]
                }
            )


        # ====================================================
        # 10. Response
        #
        # 職歴がない場合：
        #
        # profession      = None
        # companies       = []
        #
        # として正常レスポンス（200）を返す。
        # ====================================================

        response_data = {

            "name":
                user_data["username"],

            "age":
                age,

            "profession":
                latest_job_category,

            "career_decisions":
                career_decisions,

            "career_talk":
            (
                {
                    "enabled": True,

                    "price_yen":
                        career_talk_host[
                            "price_yen"
                        ],

                    "duration_minutes":
                        career_talk_host[
                            "duration_minutes"
                        ],

                    "host_message":
                        career_talk_host[
                            "host_message"
                        ]
                }
                if career_talk_host
                else {
                    "enabled": False
                }
            ),

            "career_experiences": {

                "start_reason":
                    user_data["start_reason"],

                "first_job_feedback":
                    user_data["first_job_feedback"],

                "transition_type":
                    user_data["transition_type"],

                "transition_story":
                    user_data["transition_story"],

                "reason_for_job_change":
                    user_data[
                        "reason_for_job_change"
                    ],

                "job_experience_feedback":
                    user_data[
                        "job_experience_feedback"
                    ],

                "proudest_achievement":
                    user_data[
                        "proudest_achievement"
                    ],

                "failure_experience":
                    user_data[
                        "failure_experience"
                    ],

                "lesson_learned":
                    user_data[
                        "lesson_learned"
                    ],

                "concerns":
                    user_data["concerns"]
            },

            "companies":
                companies
        }


        return JSONResponse(
            content=response_data
        )


    finally:

        if cursor is not None:
            cursor.close()

        db.close()


# ============================================================
# Career Talk Request
# ============================================================

@router.post("/career-talk/request")
async def create_career_talk_request(
    payload: CareerTalkRequestCreate
):

    requester_name = (
        payload.requester_name
        or ""
    ).strip()

    requester_email = (
        payload.requester_email
        or ""
    ).strip()

    question_text = (
        payload.question_text
        or ""
    ).strip()

    preferred_schedule_text = (
        payload.preferred_schedule_text
        or ""
    ).strip()


    if not requester_name:
        raise HTTPException(
            status_code=400,
            detail="お名前を入力してください。"
        )


    if (
        not requester_email
        or
        "@" not in requester_email
        or
        len(requester_email) > 255
    ):
        raise HTTPException(
            status_code=400,
            detail="メールアドレスを確認してください。"
        )


    if not question_text:
        raise HTTPException(
            status_code=400,
            detail="聞いてみたいことを入力してください。"
        )


    if len(question_text) > 2000:
        raise HTTPException(
            status_code=400,
            detail="聞いてみたいことは2000文字以内で入力してください。"
        )


    if len(preferred_schedule_text) > 500:
        raise HTTPException(
            status_code=400,
            detail="希望日時は500文字以内で入力してください。"
        )


    db = get_db_connection()
    cursor = None


    try:

        cursor = db.cursor(
            dictionary=True
        )


        # --------------------------------------------------------
        # Career Talk受付中か確認
        # --------------------------------------------------------

        cursor.execute(
            """
            SELECT
                cth.user_id,
                cth.price_yen,
                cth.duration_minutes,

                u.username AS host_username,
                u.email AS host_email

            FROM career_talk_hosts cth

            INNER JOIN users u
                ON u.id = cth.user_id

            WHERE cth.user_id = %s
            AND cth.is_active = 1

            LIMIT 1
            """,
            (
                payload.host_user_id,
            )
        )

        host = cursor.fetchone()


        if not host:

            raise HTTPException(
                status_code=400,
                detail="現在このユーザーはCareer Talkを受け付けていません。"
            )


        # --------------------------------------------------------
        # DecisionとHostの紐付け確認
        # --------------------------------------------------------

        decision = None


        if payload.decision_id is not None:

            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    decision_type
                FROM career_decisions
                WHERE id = %s
                AND user_id = %s
                LIMIT 1
                """,
                (
                    payload.decision_id,
                    payload.host_user_id
                )
            )


            decision = cursor.fetchone()


            if not decision:

                raise HTTPException(
                    status_code=400,
                    detail="対象のCareer Storyを確認できませんでした。"
                )


        # --------------------------------------------------------
        # Request保存
        #
        # 価格・時間はクライアントから受け取らず、
        # career_talk_hosts側の値を保存する。
        # --------------------------------------------------------

        cursor.execute(
            """
            INSERT INTO career_talk_requests (
                host_user_id,
                decision_id,
                requester_user_id,
                requester_name,
                requester_email,
                question_text,
                preferred_schedule_text,
                price_yen,
                duration_minutes,
                status
            )
            VALUES (
                %s,
                %s,
                NULL,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'requested'
            )
            """,
            (
                payload.host_user_id,
                payload.decision_id,
                requester_name,
                requester_email,
                question_text,
                (
                    preferred_schedule_text
                    or None
                ),
                host["price_yen"],
                host["duration_minutes"]
            )
        )


        request_id = cursor.lastrowid


        db.commit()


        # ====================================================
        # Career Talk メール通知
        #
        # DBへの保存完了後にメールを送る。
        #
        # メール送信に失敗しても、
        # 申込自体はDBに残す。
        # ====================================================

        try:

            base_url = (
                _get_career_talk_base_url()
            )


            story_title = (
                (
                    decision.get(
                        "title"
                    )
                    if decision
                    else None
                )
                or
                (
                    decision.get(
                        "decision_type"
                    )
                    if decision
                    else None
                )
                or
                "Career Story"
            )


            preferred_schedule = (
                preferred_schedule_text
                or
                "未指定"
            )


            story_url = ""


            if (
                payload.decision_id
                is not None
            ):

                story_url = (
                    f"{base_url}/Career_detail.html"
                    f"?id={payload.host_user_id}"
                    f"&decision_id={payload.decision_id}"
                )


            mypage_url = (
                f"{base_url}/Mypage.html"
            )


            # ----------------------------------------------
            # Talk提供者へ
            # ----------------------------------------------

            host_body = f"""\
{host.get("host_username") or "Career Talk提供者"} 様

Career Talkの新しい申込が届きました。

【申込者】
名前：{requester_name}
メールアドレス：{requester_email}

【対象Career Story】
{story_title}
{story_url}

【聞いてみたいこと】
{question_text}

【希望日時】
{preferred_schedule}

【Career Talk】
{host["duration_minutes"]}分 / {host["price_yen"]:,}円

MyPageから申込内容をご確認ください。
{mypage_url}

申込ID：{request_id}

Imnormal
"""


            await _send_career_talk_email(
                subject=(
                    "[Imnormal] Career Talkの申込が届きました"
                ),
                recipient=(
                    host.get(
                        "host_email"
                    )
                ),
                body=host_body,
                label="host"
            )


            # ----------------------------------------------
            # Imnormal運営へ
            # ----------------------------------------------

            admin_body = f"""\
Career Talkの新しい申込がありました。

【Talk提供者】
ユーザーID：{payload.host_user_id}
ユーザー名：{host.get("host_username") or "未設定"}
メールアドレス：{host.get("host_email") or "未設定"}

【申込者】
名前：{requester_name}
メールアドレス：{requester_email}

【対象Career Story】
{story_title}
{story_url}

【聞いてみたいこと】
{question_text}

【希望日時】
{preferred_schedule}

【Career Talk】
{host["duration_minutes"]}分 / {host["price_yen"]:,}円

申込ID：{request_id}

Imnormal
"""


            await _send_career_talk_email(
                subject=(
                    "[Imnormal運営] Career Talkの新規申込"
                ),
                recipient=(
                    CAREER_TALK_ADMIN_EMAIL
                ),
                body=admin_body,
                label="admin"
            )


            # ----------------------------------------------
            # 申込者へ自動返信
            # ----------------------------------------------

            requester_body = f"""\
{requester_name} 様

Career Talkのお申し込みを受け付けました。

現時点では、
日程・決済はまだ確定していません。

本人へ受付可否を確認後、
改めてご連絡いたします。

【対象Career Story】
{story_title}

【聞いてみたいこと】
{question_text}

【希望日時】
{preferred_schedule}

【Career Talk】
{host["duration_minutes"]}分 / {host["price_yen"]:,}円

申込ID：{request_id}

Imnormal
"""


            await _send_career_talk_email(
                subject=(
                    "[Imnormal] Career Talkのお申し込みを受け付けました"
                ),
                recipient=requester_email,
                body=requester_body,
                label="requester"
            )


        except Exception as email_error:

            # ここでエラーになっても
            # DB保存済みの申込は成功扱い。
            print(
                "Career Talk notification error:",
                email_error
            )


        return {
            "success": True,
            "request_id": request_id,
            "status": "requested"
        }


    except HTTPException:

        db.rollback()

        raise


    except Exception as error:

        db.rollback()

        print(
            "Career Talk request error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Career Talkの申込を保存できませんでした。"
        )


    finally:

        if cursor is not None:
            cursor.close()

        db.close()


# ============================================================
# Career Talk - My Settings
# ============================================================

@router.get("/career-talk/me")
async def get_my_career_talk_settings(
    current_user: User = Depends(get_current_user)
):

    if current_user.id is None:

        raise HTTPException(
            status_code=401,
            detail="ログインが必要です。"
        )


    db = get_db_connection()
    cursor = None


    try:

        cursor = db.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                is_active,
                price_yen,
                duration_minutes,
                host_message
            FROM career_talk_hosts
            WHERE user_id = %s
            LIMIT 1
            """,
            (
                current_user.id,
            )
        )


        host = cursor.fetchone()


        if not host:

            return {
                "enabled": False,
                "price_yen": 3000,
                "duration_minutes": 30,
                "host_message": ""
            }


        return {
            "enabled":
                bool(
                    host["is_active"]
                ),

            "price_yen":
                host["price_yen"],

            "duration_minutes":
                host["duration_minutes"],

            "host_message":
                host["host_message"]
                or ""
        }


    finally:

        if cursor is not None:

            cursor.close()


        db.close()



# ============================================================
# Career Talk - Save My Settings
# ============================================================

@router.post("/career-talk/me")
async def save_my_career_talk_settings(
    payload: CareerTalkHostUpdate,
    current_user: User = Depends(get_current_user)
):

    if current_user.id is None:

        raise HTTPException(
            status_code=401,
            detail="ログインが必要です。"
        )


    if (
        payload.price_yen < 0
        or
        payload.price_yen > 100000
    ):

        raise HTTPException(
            status_code=400,
            detail="料金を確認してください。"
        )


    if payload.duration_minutes not in (
        30,
        45,
        60
    ):

        raise HTTPException(
            status_code=400,
            detail="時間を確認してください。"
        )


    host_message = (
        payload.host_message
        or ""
    ).strip()


    if len(host_message) > 500:

        raise HTTPException(
            status_code=400,
            detail="話せることは500文字以内で入力してください。"
        )


    db = get_db_connection()
    cursor = None


    try:

        cursor = db.cursor()


        cursor.execute(
            """
            INSERT INTO career_talk_hosts (
                user_id,
                is_active,
                price_yen,
                duration_minutes,
                host_message
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s
            )
            ON DUPLICATE KEY UPDATE
                is_active = VALUES(is_active),
                price_yen = VALUES(price_yen),
                duration_minutes = VALUES(duration_minutes),
                host_message = VALUES(host_message)
            """,
            (
                current_user.id,
                (
                    1
                    if payload.is_active
                    else 0
                ),
                payload.price_yen,
                payload.duration_minutes,
                host_message
                or None
            )
        )


        db.commit()


        return {
            "success": True,
            "enabled": payload.is_active,
            "price_yen": payload.price_yen,
            "duration_minutes":
                payload.duration_minutes,
            "host_message":
                host_message
        }


    except Exception as error:

        db.rollback()


        print(
            "Career Talk settings save error:",
            error
        )


        raise HTTPException(
            status_code=500,
            detail="Career Talkの設定を保存できませんでした。"
        )


    finally:

        if cursor is not None:

            cursor.close()


        db.close()



# ============================================================
# Career Talk - My Requests
# ============================================================

@router.get("/career-talk/me/requests")
async def get_my_career_talk_requests(
    current_user: User = Depends(get_current_user)
):

    if current_user.id is None:

        raise HTTPException(
            status_code=401,
            detail="ログインが必要です。"
        )


    db = get_db_connection()
    cursor = None


    try:

        cursor = db.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                ctr.id,
                ctr.decision_id,
                ctr.requester_name,
                ctr.requester_email,
                ctr.question_text,
                ctr.preferred_schedule_text,
                ctr.price_yen,
                ctr.duration_minutes,
                ctr.status,
                ctr.created_at,

                cd.title AS decision_title,
                cd.decision_type

            FROM career_talk_requests ctr

            LEFT JOIN career_decisions cd
                ON cd.id = ctr.decision_id
                AND cd.user_id = ctr.host_user_id

            WHERE ctr.host_user_id = %s

            ORDER BY
                ctr.created_at DESC,
                ctr.id DESC
            """,
            (
                current_user.id,
            )
        )


        requests = cursor.fetchall()

        for request in requests:

            created_at = request.get(
                "created_at"
            )


            if created_at is not None:

                request["created_at"] = (
                    created_at.isoformat()
                )


        return {
            "count":
                len(
                    requests
                ),

            "requests":
                requests
        }


    finally:

        if cursor is not None:

            cursor.close()


        db.close()