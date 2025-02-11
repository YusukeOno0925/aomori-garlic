from fastapi import APIRouter, HTTPException
from .register_user import get_db_connection  # 既存のDB接続関数を流用
from typing import List, Optional
from pydantic import BaseModel
import datetime

router = APIRouter()

# --- Pydanticモデル ---
class Announcement(BaseModel):
    id: Optional[int]
    title: str
    content: str
    timestamp: datetime.datetime
    is_pinned: bool = False

@router.get("/announcements/")
async def get_announcements():
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        sql = "SELECT * FROM announcements ORDER BY is_pinned DESC, timestamp DESC"
        cursor.execute(sql)
        rows = cursor.fetchall()

        # rows（list[dict]) を Announcement に変換
        announcements = []
        for row in rows:
            ann = Announcement(
                id=row['id'],
                title=row['title'],
                content=row['content'],
                timestamp=row['timestamp'],
                is_pinned=bool(row['is_pinned'])
            )
            announcements.append(ann)
        
        # ここをオブジェクト形式 {"announcements": ...} で返すよう変更
        return {"announcements": announcements}

    except Exception as e:
        print(f"Error fetching announcements: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch announcements")
    finally:
        db.close()

# --- 新規お知らせの投稿 ---
@router.post("/announcements/", response_model=Announcement)
async def create_announcement(announcement: Announcement):
    db = get_db_connection()
    try:
        cursor = db.cursor()
        sql = """
            INSERT INTO announcements (title, content, timestamp, is_pinned)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (
            announcement.title,
            announcement.content,
            announcement.timestamp.strftime('%Y-%m-%d %H:%M:%S'),  # DATETIME形式に変換
            announcement.is_pinned
        ))
        db.commit()

        # 追加した行のIDを取得
        new_id = cursor.lastrowid
        
        # 追加後のデータを再構築して返却
        created = Announcement(
            id=new_id,
            title=announcement.title,
            content=announcement.content,
            timestamp=announcement.timestamp,
            is_pinned=announcement.is_pinned
        )
        return created
    except Exception as e:
        print(f"Error creating announcement: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create announcement")
    finally:
        db.close()