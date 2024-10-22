from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List

router = APIRouter()

class PostData(BaseModel):
    author: str
    content: str

@router.get("/board")
async def get_posts():
    """掲示板の投稿を取得"""
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM posts ORDER BY created_at DESC")
        posts = cursor.fetchall()
        return {"posts": posts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"投稿の取得に失敗しました: {str(e)}")
    finally:
        cursor.close()
        db.close()

@router.post("/board")
async def add_post(post_data: PostData):
    """新しい投稿を追加"""
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO posts (author, content, created_at) VALUES (%s, %s, NOW())",
            (post_data.author, post_data.content),
        )
        db.commit()
        return {"message": "投稿が追加されました"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"投稿の追加に失敗しました: {str(e)}")
    finally:
        cursor.close()
        db.close()