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
        # 人気のある投稿トップ3を取得
        cursor.execute(
            "SELECT id, author, content, created_at, view_count FROM posts ORDER BY view_count DESC LIMIT 3"
        )
        popular_posts = cursor.fetchall()
        for post in popular_posts:
            post['created_at'] = post['created_at'].strftime('%Y-%m-%d %H:%M:%S')

        # 人気のある投稿以外の最新の投稿を取得
        popular_post_ids = [post['id'] for post in popular_posts]
        format_strings = ','.join(['%s'] * len(popular_post_ids)) if popular_post_ids else 'NULL'
        cursor.execute(
            f"SELECT id, author, content, created_at, view_count FROM posts WHERE id NOT IN ({format_strings}) ORDER BY created_at DESC LIMIT 5",
            tuple(popular_post_ids)
        )
        new_posts = cursor.fetchall()
        for post in new_posts:
            post['created_at'] = post['created_at'].strftime('%Y-%m-%d %H:%M:%S')

        # 全ての投稿（ページネーションを考慮）
        cursor.execute(
            f"SELECT id, author, content, created_at, view_count FROM posts WHERE id NOT IN ({format_strings}) ORDER BY created_at DESC",
            tuple(popular_post_ids)
        )
        all_posts = cursor.fetchall()
        for post in all_posts:
            post['created_at'] = post['created_at'].strftime('%Y-%m-%d %H:%M:%S')

        return {"popular_posts": popular_posts, "new_posts": new_posts, "all_posts": all_posts}
    except Exception as e:
        print(f"Error in get_posts: {e}")
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
        print(f"Error in add_post: {e}")
        raise HTTPException(status_code=500, detail=f"投稿の追加に失敗しました: {str(e)}")
    finally:
        cursor.close()
        db.close()

@router.post("/board/{post_id}/view")
async def increment_view_count(post_id: int):
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE posts SET view_count = view_count + 1 WHERE id = %s",
            (post_id,)
        )
        db.commit()
        return {"message": "閲覧回数が更新されました"}
    except Exception as e:
        print(f"Error in increment_view_count: {e}")
        raise HTTPException(status_code=500, detail=f"閲覧回数の更新に失敗しました: {str(e)}")
    finally:
        cursor.close()
        db.close()