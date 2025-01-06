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
from scripts.recent_stories import router as recent_stories_router
from scripts.popular_stories import router as popular_stories_router
from scripts.career_overview import router as career_overview_router
from scripts.career_detail import router as career_detail_router
from scripts.board import router as board_router
from scripts.reply_routes import router as reply_router
from scripts.comments import router as comments_router
from scripts.online_status import router as online_status_router
from scripts.online_status import update_last_active  # ミドルウェア関数をインポート
from scripts.password_reset import router as password_reset_router
from scripts.auth import router as auth_router
from scripts.career_path import router as career_path_router
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
app.include_router(recent_stories_router)
app.include_router(popular_stories_router)
app.include_router(career_overview_router)
app.include_router(career_detail_router)
app.include_router(board_router)
app.include_router(reply_router)
app.include_router(comments_router)
app.include_router(online_status_router)
app.include_router(auth_router)
app.include_router(password_reset_router)
app.include_router(career_path_router)

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

# ミドルウェアをアプリケーションに追加
app.middleware("http")(update_last_active)

# トップページのルート
@app.get("/")
async def read_root():
    return FileResponse("Home.html")

@app.head("/")
async def read_root_head():
    return Response(status_code=200)

# ユーザー登録のエンドポイント
@app.post("/register/")
async def register_user(username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    print(f"Received data - username: {username}, email: {email}")
    try:
        # ユーザー情報をデータベースに登録する
        register_user_to_db(username, email, password)
        
        # 登録完了後、自動でログインする処理を追加
        db = get_db_connection()
        user = await authenticate_user(db, email, password)
        if user:
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.email}, expires_delta=access_token_expires
            )
            response = RedirectResponse(url="/Home.html", status_code=303)
            response.set_cookie(key="access_token", value=access_token, httponly=True)
            return response
        
        return RedirectResponse(url="/Home.html", status_code=303)
    except ValueError as ve:
        print(f"ValueError in registration: {ve}")
        # エラーメッセージと共に400ステータスコードを返す
        return JSONResponse(content={"message": str(ve)}, status_code=400)
    except Exception as e:
        print(f"Error in registration: {e}")
        # サーバーエラーとして500ステータスコードを返す
        return JSONResponse(content={"message": "サーバーエラーが発生しました。"}, status_code=500)

class EmailPasswordRequestForm:
    def __init__(self, email: str = Form(...), password: str = Form(...)):
        self.email = email
        self.password = password

# トークン取得のエンドポイント（ログイン処理）
@app.post("/login/")
async def login_for_access_token(form_data: EmailPasswordRequestForm = Depends()):
    db = get_db_connection()
    user = await authenticate_user(db, email=form_data.email, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=400,
            detail="メールアドレスまたはパスワードが正しくありません。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
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

# board.htmlを返すエンドポイント
@app.get("/Board.html")
async def board_page():
    return FileResponse("Board.html")

# Forgot_password.html のエンドポイントを追加
@app.get("/Forgot_password.html")
async def forgot_password():
    return FileResponse("Forgot_password.html")

# Reset_password.html のエンドポイントを追加
@app.get("/Reset_password.html")
async def reset_password():
    return FileResponse("Reset_password.html")


@app.get("/get-environment")
async def get_environment():
    base_url = local_base_url if environment == "development" else production_base_url
    return JSONResponse({"environment": environment, "base_url": base_url})


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