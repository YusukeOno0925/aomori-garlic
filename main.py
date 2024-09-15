import logging

import os
from dotenv import load_dotenv
from fastapi import FastAPI, Form, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from fastapi.middleware.cors import CORSMiddleware
from scripts.register_user import register_user_to_db, get_db_connection
from scripts.get_user_info import router as get_user_info_router
from scripts.update_user_info import router as update_user_info_router
from scripts.auth import authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
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
async def mypage(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user is None:
        # ログインしていない場合はログインページにリダイレクト
        return RedirectResponse(url="/Login.html")
    return FileResponse("Mypage.html")

# 統計ページへのエンドポイント
@app.get("/Stats.html")
async def stats():
    return FileResponse("Stats.html")


@app.get("/get-environment")
async def get_environment():
    base_url = local_base_url if environment == "development" else production_base_url
    return JSONResponse({"environment": environment, "base_url": base_url})