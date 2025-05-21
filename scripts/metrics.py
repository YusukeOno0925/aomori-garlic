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

# ホーム画面のヒーローセクションで使う業界グラフ
@router.get("/metrics/industry/")
async def get_industry_metrics():
    """
    ・業界ごとの現職者数を集計して返します
      (job_experiences.industry 列をグルーピング)
    """
    db = get_db_connection()
    # 辞書型で取得できるカーソルにする
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            /*
              最新 (現職) の職歴だけをユーザーごとに1件、
              同一ユーザーは重複カウントしない
            */
            SELECT
              je.industry,
              COUNT(DISTINCT je.user_id) AS count
            FROM job_experiences AS je
            /* 現職：終了日が未設定または未来 */
            WHERE je.industry IS NOT NULL
              AND je.industry <> ''
              AND (je.work_end_period IS NULL
                   OR CAST(je.work_end_period AS CHAR) = '0000-00-00'
                   )
            GROUP BY je.industry
            ORDER BY count DESC
        """)
        results = cursor.fetchall()
        # 返り値例: [ { "industry": "金融", "count": 42 }, ... ]
        return JSONResponse(results)
    except Exception:
        logger.error("/metrics/industry/ 取得中に例外発生", exc_info=True)
        raise HTTPException(status_code=500, detail="業界メトリクスの取得に失敗しました")
    finally:
        cursor.close()
        db.close()