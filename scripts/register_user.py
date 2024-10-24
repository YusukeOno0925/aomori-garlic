# ユーザの新規登録

import mysql.connector
from passlib.context import CryptContext
from config import db_host, db_user, db_password, db_name, db_port

# パスワードハッシュのコンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# データベース接続
def get_db_connection():
    connection = mysql.connector.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name,
        port=db_port
    )
    return connection

# パスワードのハッシュ化
def get_password_hash(password):
    return pwd_context.hash(password)

# ユーザーをデータベースに登録
def register_user_to_db(username: str, email: str, password: str):
    connection = get_db_connection()
    cursor = connection.cursor()

    # ユーザー名の存在をチェック
    cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s", (username,))
    result = cursor.fetchone()
    if result[0] > 0:
        cursor.close()
        connection.close()
        raise ValueError("ユーザー名は既に存在します")

    hashed_password = get_password_hash(password)

    # 新しいユーザーを挿入
    cursor.execute(
        "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
        (username, email, hashed_password)
    )
    connection.commit()
    cursor.close()
    connection.close()