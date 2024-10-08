import logging

import os
from dotenv import load_dotenv
from fastapi import FastAPI, Form, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from fastapi.middleware.cors import CORSMiddleware
from scripts.register_user import register_user_to_db, get_db_connection
from scripts.get_user_info import router as get_user_info_router
from scripts.update_user_info import router as update_user_info_router
from scripts.auth import authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES, get_token_from_request
from fastapi.responses import JSONResponse
from scripts.email_config import fast_mail, EmailSchema
from fastapi_mail import MessageSchema
from config import environment, local_base_url, production_base_url

# ロギングの設定
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# 静的ファイルの提供（html、css、jsなど）
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/images", StaticFiles(directory="images"), name="images")
app.mount("/data", StaticFiles(directory="data"), name="data")

# ルーターの登録
app.include_router(get_user_info_router)
app.include_router(update_user_info_router)

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        local_base_url if environment == "development" else production_base_url
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# トップページのルート
@app.get("/")
async def read_root():
    return FileResponse("Home.html")

@app.head("/")
async def read_root_head():
    return Response(status_code=200)

# ユーザー登録のエンドポイント
@app.post("/register/")
async def register_user(username: str = Form(...), email: str = Form(...), profile: str = Form(None), password: str = Form(...)):
    print(f"Received data - username: {username}, email: {email}, profile: {profile}")
    try:
        # ユーザー情報をデータベースに登録する
        register_user_to_db(username, email, profile, password)
        
        # 登録完了後、自動でログインする処理を追加
        db = get_db_connection()
        user = await authenticate_user(db, username, password)
        if user:
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.username}, expires_delta=access_token_expires
            )
            response = RedirectResponse(url="/Home.html", status_code=303)
            response.set_cookie(key="access_token", value=access_token, httponly=True)
            return response
        
        return RedirectResponse(url="/Home.html", status_code=303)
    except Exception as e:
        print(f"Error in registration: {e}")
        return {"message": "Registration failed"}

# トークン取得のエンドポイント（ログイン処理）
@app.post("/login/")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db_connection()  # データベース接続を取得
    user = await authenticate_user(db, form_data.username, form_data.password)  # すべての引数を渡す
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    response = RedirectResponse(url="/Home.html", status_code=303)
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    return response

@app.get("/check-login-status/")
async def check_login_status(current_user: dict = Depends(get_current_user)):
    # current_userが存在すればログインしている状態
    if current_user:
        return {"is_logged_in": True}
    else:
        raise HTTPException(status_code=401, detail="Not logged in")

@app.post("/send-contact/")
async def send_contact(name: str = Form(...), email: str = Form(...), message: str = Form(...)):
    email_data = EmailSchema(
        email=email,
        subject="お問い合わせ",
        message=f"名前: {name}\nメールアドレス: {email}\n\nメッセージ:\n{message}"
    )
    try:
        message = MessageSchema(
            subject=email_data.subject,
            recipients=["godyusuke.0205earth@gmail.com"],
            body=email_data.message,
            subtype="html"
        )
        await fast_mail.send_message(message)
        return {"message": "お問い合わせが送信されました"}
    except Exception as e:
        print(f"Error sending email: {e}")
        return {"message": "お問い合わせの送信に失敗しました"}


@app.post("/logout/")
async def logout():
    response = RedirectResponse(url="/Login.html", status_code=303)
    response.delete_cookie("access_token", path="/")
    return response


# ホームページのエンドポイント
@app.get("/Home.html")
async def home():
    return FileResponse("Home.html")

# ユーザー登録ページのエンドポイント
@app.get("/Register.html")
async def register():
    return FileResponse("Register.html")

# ログインページのエンドポイント
@app.get("/Login.html")
async def login():
    return FileResponse("Login.html")

# キャリア概要ページのエンドポイント
@app.get("/Career_overview.html")
async def career_overview():
    return FileResponse("Career_overview.html")

# キャリア詳細ページのエンドポイント
@app.get("/Career_detail.html")
async def career_detail():
    return FileResponse("Career_detail.html")

# キャリアパスページへのエンドポイント
@app.get("/Career_path.html")
async def career_path():
    return FileResponse("Career_path.html")

# コンタクトページへのエンドポイント
@app.get("/Contact.html")
async def contact():
    return FileResponse("Contact.html")

# マイページのエンドポイント
@app.get("/Mypage.html")
async def mypage(request: Request):
    try:
        # トークンをデバッグ用にログに出力
        token = await get_token_from_request(request)
        logger.debug(f"トークンを取得しました: {token}")

        current_user = await get_current_user(token=token)
        logger.debug(f"取得したユーザー情報: {current_user}")

    except HTTPException as e:
        logger.error(f"認証エラー: {e.detail}")
        # 認証エラーが発生した場合、ログイン画面にリダイレクト
        return RedirectResponse(url="/Login.html")
    
    # 認証に成功した場合はマイページを表示
    return FileResponse("Mypage.html")

# 統計ページへのエンドポイント
@app.get("/Stats.html")
async def stats():
    return FileResponse("Stats.html")


@app.get("/get-environment")
async def get_environment():
    base_url = local_base_url if environment == "development" else production_base_url
    return JSONResponse({"environment": environment, "base_url": base_url})


# キャリア概要ページのエンドポイント
@app.get("/career-overview/")
async def get_career_overview():
    db = get_db_connection()
    try:
        query = """
        SELECT u.id, u.username, u.birthdate, u.education, u.education_start,
               j.company_name, j.industry, j.job_type, j.current_salary, j.work_start_period,
               IFNULL(pv.view_count, 0) AS view_count  -- 閲覧回数を取得
        FROM users u
        JOIN job_experiences j ON u.id = j.user_id
        LEFT JOIN profile_views pv ON u.id = pv.user_id  -- 閲覧回数を結合
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query)
        result = cursor.fetchall()

        careers = []
        career_dict = {}

        for row in result:
            if row['id'] not in career_dict:
                career_dict[row['id']] = {
                    "id": row['id'],
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else None,
                    # 初期値を設定しないようにして、最後の職業情報で上書き
                    "profession": None,  
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                    "view_count": row['view_count']  # 閲覧回数を追加
                }
                # 最初に大学の入学情報を追加
                if row['education']:
                    education_start_year = row['education_start'].year if row['education_start'] else "不明"
                    career_dict[row['id']]['careerStages'].append({
                        "year": education_start_year, 
                        "stage": f"{row['education']} 入学"
                    })

            # 最新の職業情報として上書き
            career_dict[row['id']]['profession'] = row['job_type']
            career_dict[row['id']]['income'] = [{"income": row['current_salary']}]

            # 各会社の入社情報を追加
            career_dict[row['id']]['careerStages'].append({
                "year": row['work_start_period'].year, 
                "stage": f"{row['company_name']} 入社"
            })
            career_dict[row['id']]['companies'].append({
                "name": row['company_name'],
                "industry": row['industry'],
                "startYear": row['work_start_period'].year
            })
        
        careers = list(career_dict.values())
        
        return JSONResponse(content={"careers": careers})
    except Exception as e:
        print(f"Error fetching career data: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        db.close()


@app.get("/career-detail/{career_id}")
async def get_career_detail(career_id: int):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        
        # 最新のjob_typeを取得するクエリ
        cursor.execute("""
            SELECT job_type 
            FROM job_experiences 
            WHERE user_id = %s 
            ORDER BY work_end_period IS NULL DESC, work_end_period DESC
            LIMIT 1
        """, (career_id,))
        latest_job_type_data = cursor.fetchone()

        # 全職歴データを取得するクエリ
        cursor.execute("""
            SELECT u.id, u.username, u.profile, u.career_step,
                j.company_name, j.position, j.entry_salary, j.current_salary,
                j.entry_satisfaction, j.current_satisfaction, j.work_start_period, j.work_end_period, 
                j.success_experience, j.failure_experience, j.reflection, u.education
            FROM users u
            JOIN job_experiences j ON u.id = j.user_id
            WHERE u.id = %s
            ORDER BY j.work_start_period ASC
        """, (career_id,))
        career_data = cursor.fetchall()

        # 結果がない場合のエラーハンドリング
        if not career_data or not latest_job_type_data:
            raise HTTPException(status_code=404, detail="Career not found")

        # null値を適切に処理する
        for row in career_data:
            if row['entry_salary'] is None:
                row['entry_salary'] = "N/A"
            if row['current_salary'] is None:
                row['current_salary'] = "N/A"

        # 最新のjob_typeを取得してresponseに含める
        response_data = {
            "name": career_data[0]["username"],
            "profile": career_data[0]["profile"],
            "career_step": career_data[0]["career_step"],
            "profession": latest_job_type_data["job_type"],  # 最新のjob_typeを使用
            "success_experience": career_data[0]["success_experience"],
            "failures": career_data[0]["failure_experience"],
            "education": career_data[0]["education"],
            "companies": [
                {
                    "name": row["company_name"],
                    "startYear": row["work_start_period"].year,
                    "endYear": row["work_end_period"].year if row["work_end_period"] else '現時点',
                    "entry_salary": row["entry_salary"],
                    "current_salary": row["current_salary"],
                    "entry_satisfaction": row["entry_satisfaction"],
                    "current_satisfaction": row["current_satisfaction"],
                    "success_experience": row["success_experience"],
                    "failure_experience": row["failure_experience"],
                    "reflection": row["reflection"]
                } for row in career_data
            ]
        }

        return JSONResponse(content=response_data)

    finally:
        cursor.close()
        db.close()


# 最近のキャリアストーリーを取得するエンドポイント
@app.get("/recent-career-stories/")
async def get_recent_career_stories():
    db = get_db_connection()
    try:
        # 最新の3ユーザーとその職歴、学歴を一度に取得
        query = """
        SELECT u.id, u.username, u.birthdate, u.education, u.education_start,
               j.company_name, j.industry, j.job_type, j.current_salary, j.work_start_period
        FROM users u
        JOIN job_experiences j ON u.id = j.user_id
        ORDER BY u.created_at DESC, j.work_start_period ASC  -- 作成日時の降順で並べ替え、職歴は時系列で取得
        LIMIT 3  -- 最新のキャリアを持つ3ユーザーを取得
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query)
        recent_careers = cursor.fetchall()

        # ユーザーごとのキャリアをグループ化して返す
        career_dict = {}
        for row in recent_careers:
            if row['id'] not in career_dict:
                # ユーザー情報を初期化
                career_dict[row['id']] = {
                    "id": row['id'],
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else None,
                    "profession": None,
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                }

                # 学歴情報を最初に追加（入学年）
                if row['education']:
                    career_dict[row['id']]['careerStages'].append({
                        "year": row['education_start'].year if row['education_start'] else '不明',
                        "stage": f"{row['education']} 入学"
                    })

            # 職業情報を追加
            career_dict[row['id']]['profession'] = row['job_type']
            career_dict[row['id']]['income'].append({"income": row['current_salary']})
            career_dict[row['id']]['careerStages'].append({
                "year": row['work_start_period'].year, 
                "stage": f"{row['company_name']} 入社"
            })
            career_dict[row['id']]['companies'].append({
                "name": row['company_name'],
                "industry": row['industry'],
                "startYear": row['work_start_period'].year
            })

        # すべてのユーザーのキャリアをリスト化
        careers = list(career_dict.values())

        return JSONResponse(content={"careers": careers})
    except Exception as e:
        print(f"Error fetching recent career stories: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        db.close()

# 人気のキャリアストーリーを取得するエンドポイント
@app.get("/popular-career-stories/")
async def get_popular_career_stories():
    db = get_db_connection()
    try:
        query = """
        SELECT u.id, u.username, u.birthdate, u.education, u.education_start,
               j.company_name, j.industry, j.job_type, j.current_salary, j.work_start_period,
               IFNULL(pv.view_count, 0) AS view_count  -- 閲覧回数を取得
        FROM users u
        JOIN job_experiences j ON u.id = j.user_id
        LEFT JOIN profile_views pv ON u.id = pv.user_id  -- 閲覧回数を結合
        WHERE u.id IN (
            SELECT user_id FROM (
                SELECT u.id AS user_id, IFNULL(pv.view_count, 0) AS view_count
                FROM users u
                LEFT JOIN profile_views pv ON u.id = pv.user_id
                ORDER BY view_count DESC  -- 閲覧回数で並べ替え
                LIMIT 3  -- 人気のキャリアを持つ3ユーザーを取得
            ) AS popular_users
        )
        ORDER BY view_count DESC, j.work_start_period ASC -- 閲覧回数順に並べ、各ユーザーのキャリアは時系列で取得
        """
        cursor = db.cursor(dictionary=True)
        cursor.execute(query)
        popular_careers = cursor.fetchall()

        # ユーザーごとのキャリアをグループ化して返す
        career_dict = {}
        for row in popular_careers:
            if row['id'] not in career_dict:
                career_dict[row['id']] = {
                    "id": row['id'],
                    "name": row['username'],
                    "birthYear": row['birthdate'].year if row['birthdate'] else None,
                    "profession": None,  
                    "income": [],
                    "careerStages": [],
                    "companies": [],
                    "view_count": row['view_count']
                }

                # 学歴情報を最初に追加（入学年）
                if row['education']:
                    career_dict[row['id']]['careerStages'].append({
                        "year": row['education_start'].year if row['education_start'] else '不明',
                        "stage": f"{row['education']} 入学"
                    })

            # キャリアステージを追加
            career_dict[row['id']]['profession'] = row['job_type']
            career_dict[row['id']]['income'].append({"income": row['current_salary']})
            career_dict[row['id']]['careerStages'].append({
                "year": row['work_start_period'].year, 
                "stage": f"{row['company_name']} 入社"
            })
            career_dict[row['id']]['companies'].append({
                "name": row['company_name'],
                "industry": row['industry'],
                "startYear": row['work_start_period'].year
            })

        # すべてのユーザーのキャリアをリスト化
        careers = list(career_dict.values())

        return JSONResponse(content={"careers": careers})
    except Exception as e:
        print(f"Error fetching popular career stories: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")
    finally:
        cursor.close()
        db.close()


# 各ユーザのプロフィール回数の表示に用いる
@app.post("/increment-profile-view/{user_id}")
async def increment_profile_view(user_id: int):
    db = get_db_connection()  # データベース接続を取得
    try:
        print(f"Incrementing view count for user_id: {user_id}")
        cursor = db.cursor()
        
        # profile_viewsテーブルに挿入/更新
        cursor.execute("""
            INSERT INTO profile_views (user_id, view_count, last_viewed_at)
            VALUES (%s, 1, NOW())
            ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed_at = NOW()
        """, (user_id,))  # user_idに基づいてインクリメント処理
        
        db.commit()  # データベースの変更をコミット
        return {"message": "Profile view incremented"}
    
    except Exception as e:
        print(f"Error incrementing profile view: {e}")
        raise HTTPException(status_code=500, detail="Failed to increment profile view")
    
    finally:
        cursor.close()
        db.close()