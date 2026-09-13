import os

from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, ConnectionConfig


# .env の内容を読み込む
load_dotenv()


class EmailSchema(BaseModel):
    email: EmailStr
    subject: str
    message: str


# メール設定を .env から取得
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))


# 必須設定が存在しない場合は起動時にエラーにする
if not MAIL_USERNAME:
    raise RuntimeError("MAIL_USERNAME is not configured.")

if not MAIL_PASSWORD:
    raise RuntimeError("MAIL_PASSWORD is not configured.")

if not MAIL_FROM:
    raise RuntimeError("MAIL_FROM is not configured.")


conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_TLS=True,
    MAIL_SSL=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

fast_mail = FastMail(conf)