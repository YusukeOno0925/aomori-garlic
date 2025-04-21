import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from .register_user import get_db_connection

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/metrics/")
async def get_metrics():
    """
    ・メンバー数 (users.id)
    ・掲載事例数 (education.education_id)
    ・Q&A 投稿数 (posts.id)
    を JSON で返します
    """
    db = get_db_connection()
    cursor = db.cursor()
    try:
        # ユーザー数
        cursor.execute("SELECT COUNT(id) FROM users")
        user_count = cursor.fetchone()[0] or 0

        # 掲載事例数 ← education_id をカウント
        cursor.execute("SELECT COUNT(education_id) FROM education")
        story_count = cursor.fetchone()[0] or 0

        # Q&A 投稿数
        cursor.execute("SELECT COUNT(id) FROM posts")
        qa_count = cursor.fetchone()[0] or 0

        return JSONResponse({
            "users":   user_count,
            "stories": story_count,
            "qa":      qa_count
        })
    except Exception:
        logger.error("／metrics／取得中に例外発生", exc_info=True)
        raise HTTPException(status_code=500, detail="メトリクスの取得に失敗しました")
    finally:
        cursor.close()
        db.close()