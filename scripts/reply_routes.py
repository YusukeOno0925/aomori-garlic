from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from .register_user import get_db_connection

router = APIRouter()

class ReplyData(BaseModel):
    post_id: int
    author: str
    content: str

@router.post("/reply")
async def add_reply(reply_data: ReplyData):
    """新しい返信を追加"""
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO replies (post_id, author, content, created_at) VALUES (%s, %s, %s, NOW())",
            (reply_data.post_id, reply_data.author, reply_data.content),
        )
        db.commit()
        return {"message": "返信が追加されました"}
    except Exception as e:
        print(f"Error in add_reply: {e}")  # エラーをログに出力
        raise HTTPException(status_code=500, detail=f"返信の追加に失敗しました: {str(e)}")
    finally:
        cursor.close()
        db.close()

@router.get("/replies/{post_id}")
async def get_replies(post_id: int):
    """指定された投稿に対する返信を取得"""
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT author, content, created_at FROM replies WHERE post_id = %s ORDER BY created_at ASC",
            (post_id,)
        )
        replies = cursor.fetchall()
        # Python側で日付をフォーマット
        for reply in replies:
            reply['created_at'] = reply['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        return {"replies": replies}
    except Exception as e:
        print(f"Error in get_replies: {e}")
        raise HTTPException(status_code=500, detail=f"返信の取得に失敗しました: {str(e)}")
    finally:
        cursor.close()
        db.close()