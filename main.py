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
               j.company_name, j.industry, j.position, j.current_salary, j.work_start_period
        FROM users u
        JOIN job_experiences j ON u.id = j.user_id
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
                    "companies": []
                }
                # 最初に大学の入学情報を追加
                if row['education']:
                    education_start_year = row['education_start'].year if row['education_start'] else "不明"
                    career_dict[row['id']]['careerStages'].append({
                        "year": education_start_year, 
                        "stage": f"{row['education']} 入学"
                    })

            # 最新の職業情報として上書き
            career_dict[row['id']]['profession'] = row['position']
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
        
        # クエリ実行
        cursor.execute("""
            SELECT u.id, u.username, u.profile, j.company_name, j.position, j.entry_salary, j.current_salary,
                j.entry_satisfaction, j.current_satisfaction, j.work_start_period, j.work_end_period, 
                j.success_experience, j.failure_experience, u.education
            FROM users u
            JOIN job_experiences j ON u.id = j.user_id
            WHERE u.id = %s
        """, (career_id,))
        
        career_data = cursor.fetchall()

        if not career_data:
            raise HTTPException(status_code=404, detail="Career not found")

        # null値をNoneに置き換える処理を追加
        for row in career_data:
            if row['entry_salary'] is None:
                row['entry_salary'] = "N/A"
            if row['current_salary'] is None:
                row['current_salary'] = "N/A"

        # データをクライアントに返す
        response_data = {
            "name": career_data[0]["username"],
            "profile": career_data[0]["profile"],
            "profession": career_data[0]["position"],
            "success_experience": career_data[0]["success_experience"],
            "failures": career_data[0]["failure_experience"],
            "challenges": career_data[0]["entry_satisfaction"],
            "education": career_data[0]["education"],
            "companies": [
                {
                    "name": row["company_name"],
                    "startYear": row["work_start_period"].year,
                    "endYear": row["work_end_period"].year if row["work_end_period"] else '現時点',
                    "entry_salary": row["entry_salary"],
                    "current_salary": row["current_salary"],
                    "entry_satisfaction": row["entry_satisfaction"],
                    "current_satisfaction": row["current_satisfaction"]
                } for row in career_data
            ]
        }

        return JSONResponse(content=response_data)

    finally:
        cursor.close()
        db.close()