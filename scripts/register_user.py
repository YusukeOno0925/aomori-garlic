# ユーザの新規登録

import mysql.connector
from passlib.context import CryptContext

# パスワードハッシュのコンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# データベース接続
def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Imnormal",  # 使用するパスワード
        database="my_database"  # 使用するデータベース名
    )
    return connection

# パスワードのハッシュ化
def get_password_hash(password):
    return pwd_context.hash(password)

# ユーザーをデータベースに登録
def register_user_to_db(username: str, email: str, profile: str, password: str):
    connection = get_db_connection()
    cursor = connection.cursor()

    hashed_password = get_password_hash(password)

    # データベースにユーザー情報を挿入
    cursor.execute(
        "INSERT INTO users (username, email, profile, password) VALUES (%s, %s, %s, %s)",
        (username, email, profile, hashed_password)
    )
    connection.commit()
    cursor.close()
    connection.close()