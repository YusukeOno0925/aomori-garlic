import logging

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import mysql.connector
from passlib.context import CryptContext
import secrets
from config import db_host, db_user, db_password, db_name, db_port

# ログの設定
logger = logging.getLogger(__name__)

# 秘密鍵とアルゴリズムの設定（JWT用）
SECRET_KEY = "aP8jS9f3hT6KlmN7QpX5zV7bW9rXyT3gPzR4tB6kJcM2nPdH8sJr"  # 例として生成されたランダムな文字列
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# パスワードハッシュのコンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2の設定
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    id: Optional[int] 
    username: str
    email: str

class UserInDB(User):
    hashed_password: str

# データベース接続の設定
def get_db_connection():
    connection = mysql.connector.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name,
        port=db_port
    )
    return connection

async def get_token_from_request(request: Request):
    # Authorizationヘッダーからトークンを取得
    auth: str = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth.split(" ")[1]
    
    # クッキーからトークンを取得
    token = request.cookies.get("access_token")
    if token:
        return token
    
    # トークンが見つからない場合は例外を投げる
    raise HTTPException(status_code=401, detail="認証トークンが見つかりません")

# パスワードのハッシュ化
def get_password_hash(password):
    return pwd_context.hash(password)

# ユーザーの検索
def get_user_from_db(username: str):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    # クエリの実行
    cursor.execute("SELECT id, username, email, password FROM users WHERE username = %s", (username,))
    
    # 結果を1行だけフェッチ
    user = cursor.fetchone()

    # 残りの行があればフェッチして処理する
    if cursor.with_rows:
        cursor.fetchall()  # 未読の残りの行をフェッチして処理
    
    # カーソルと接続を閉じる
    cursor.close()
    connection.close()
    
    # 結果が存在する場合の処理
    if user:
        # 'password' フィールド名がデータベースと一致しているか確認
        user["hashed_password"] = user.pop("password")
        return UserInDB(**user)
    
    return None

# JWTトークンのデコードとユーザーの取得
async def get_current_user(token: str = Depends(get_token_from_request)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="無効なトークン")
        
    except JWTError as e:
        logger.error(f"JWTのエラー: {str(e)}")
        raise HTTPException(status_code=401, detail="無効なトークンまたは期限切れ")
    
    # データベースからユーザー情報を取得
    user = get_user_from_db(username=username)
    if user is None:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")
    
    return user

# パスワードの検証
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# ユーザー認証
async def authenticate_user(db, username: str, password: str):
    user = get_user_from_db(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# JWTトークンの作成
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)  # デフォルト15分
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt