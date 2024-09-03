from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

class EmailSchema(BaseModel):
    email: EmailStr
    subject: str
    message: str

# ConnectionConfigの設定を直接記述
conf = ConnectionConfig(
    MAIL_USERNAME="godyusuke.0205earth@gmail.com",
    MAIL_PASSWORD="hmiylzhclsrpwset",
    MAIL_FROM="godyusuke.0205earth@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_TLS=True,   # これを使用
    MAIL_SSL=False,  # これを使用
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

fast_mail = FastMail(conf)