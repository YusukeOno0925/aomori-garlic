from fastapi import APIRouter, HTTPException, Depends, Form
from .register_user import get_db_connection
from .auth import get_current_user
from fastapi.responses import JSONResponse
from scripts.email_config import fast_mail, EmailSchema
from fastapi_mail import MessageSchema
from fastapi import APIRouter, HTTPException, Depends, Form, BackgroundTasks

router = APIRouter()

# コメントの取得
@router.get("/comments/{career_id}")
async def get_comments(career_id: int, page: int = 1, per_page: int = 10):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        offset = (page - 1) * per_page

        # コメントを取得して表示
        def fetch_comments(parent_id=None, nest_level=0):
            max_nest_level = 2  # ネストレベルの最大値
            if nest_level > max_nest_level:
                return []

            if parent_id:
                cursor.execute("""
                    SELECT c.id, c.content, c.created_at, c.parent_comment_id,
                           u.username,
                           (SELECT username FROM users WHERE id = (SELECT user_id FROM comments WHERE id = c.parent_comment_id)) AS parent_username,
                           (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS like_count
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.parent_comment_id = %s
                    ORDER BY c.created_at ASC
                """, (parent_id,))
            else:
                cursor.execute("""
                    SELECT c.id, c.content, c.created_at, c.parent_comment_id,
                           u.username,
                           NULL AS parent_username,
                           (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS like_count
                    FROM comments c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.career_id = %s AND c.parent_comment_id IS NULL
                    ORDER BY c.created_at ASC
                    LIMIT %s OFFSET %s
                """, (career_id, per_page, offset))

            comments = cursor.fetchall()
            for comment in comments:
                comment['created_at'] = comment['created_at'].isoformat()
                comment['replies'] = fetch_comments(comment['id'], nest_level + 1)
            return comments

        comments = fetch_comments()

        # 総コメント数を取得
        cursor.execute("""
            SELECT COUNT(*) as count FROM comments WHERE career_id = %s AND parent_comment_id IS NULL
        """, (career_id,))
        total_comments = cursor.fetchone()['count']
        total_pages = (total_comments + per_page - 1) // per_page

        return JSONResponse(content={"comments": comments, "total_pages": total_pages})
    except Exception as e:
        print(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch comments")
    finally:
        cursor.close()
        db.close()

# コメントの投稿
@router.post("/comments/{career_id}")
async def post_comment(
    career_id: int,
    background_tasks: BackgroundTasks,
    content: str = Form(...),
    parent_comment_id: int = Form(None),
    current_user = Depends(get_current_user)
):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        # コメントをデータベースに挿入
        cursor.execute("""
            INSERT INTO comments (user_id, career_id, content, parent_comment_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
        """, (current_user.id, career_id, content, parent_comment_id))
        db.commit()

        # 挿入されたコメントのIDを取得
        comment_id = cursor.lastrowid

        # キャリア所有者の情報を取得（直接 users テーブルから取得）
        cursor.execute("""
            SELECT username, email FROM users WHERE id = %s
        """, (career_id,))
        owner_info = cursor.fetchone()
        if not owner_info:
            raise HTTPException(status_code=404, detail="キャリア所有者が見つかりませんでした")

        owner_email = owner_info.get('email')
        owner_username = owner_info.get('username')

        # メールアドレスが取得できない場合の対処
        if not owner_email:
            print("キャリア所有者のメールアドレスが見つかりませんでした。")
            # メール送信をスキップするか、適切な処理を行います。
        else:
            # 返信メール送信をバックグラウンドタスクとして追加
            background_tasks.add_task(
                send_email_notification,
                recipient_email=owner_email,
                recipient_name=owner_username,
                commenter_name=current_user.username,
                content=content,
                career_id=career_id
            )

        return JSONResponse(content={"message": "コメントが投稿されました", "comment_id": comment_id})
    except Exception as e:
        print(f"Error posting comment: {e}")
        raise HTTPException(status_code=500, detail="コメントの投稿に失敗しました")
    finally:
        cursor.close()
        db.close()

# コメントへの「いいね」のトグル
@router.post("/comments/{comment_id}/like")
async def toggle_like(
    comment_id: int,
    current_user = Depends(get_current_user)
):
    db = get_db_connection()
    try:
        cursor = db.cursor()
        # 既にいいねしているか確認
        cursor.execute("""
            SELECT id FROM comment_likes WHERE user_id = %s AND comment_id = %s
        """, (current_user.id, comment_id))
        like = cursor.fetchone()
        if like:
            # いいねを削除
            cursor.execute("""
                DELETE FROM comment_likes WHERE id = %s
            """, (like[0],))
        else:
            # いいねを追加
            cursor.execute("""
                INSERT INTO comment_likes (user_id, comment_id, created_at)
                VALUES (%s, %s, NOW())
            """, (current_user.id, comment_id))
        db.commit()

        # 最新のいいね数を取得
        cursor.execute("""
            SELECT COUNT(*) FROM comment_likes WHERE comment_id = %s
        """, (comment_id,))
        like_count = cursor.fetchone()[0]

        return JSONResponse(content={"message": "いいねがトグルされました", "like_count": like_count})
    except Exception as e:
        print(f"Error toggling like: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle like")
    finally:
        cursor.close()
        db.close()

def send_email_notification(
    recipient_email: str,
    recipient_name: str,
    commenter_name: str,
    content: str,
    career_id: int
):
    email_subject = "あなたのキャリアに新しいコメントがありました"
    email_body = f"""
    <p>{recipient_name}様、</p>
    <p>{commenter_name}さんがあなたのキャリアにコメントしました：</p>
    <p>「{content}」</p>
    <p>詳細を見るには、以下のリンクをクリックしてください：</p>
    <p><a href="https://yourdomain.com/Career_detail.html?id={career_id}">キャリア詳細ページを見る</a></p>
    <hr>
    <p>※このメールは自動送信されています。</p>
    """

    message = MessageSchema(
        subject=email_subject,
        recipients=[recipient_email],  # キャリア所有者のみ
        bcc=["yusuke.ono@imnormal.co.jp"],  # 管理者はBCCで送信
        body=email_body,
        subtype="html"
    )

    try:
        # 非同期関数を同期的に呼び出す
        import asyncio
        asyncio.run(fast_mail.send_message(message))
    except Exception as e:
        print(f"Error sending email: {e}")
        # メール送信に失敗しても、コメント投稿自体は成功させます