from datetime import date, datetime


CONSULTING_INDUSTRIES = frozenset({
    "コンサルティング・専門事務所",
})


def _is_empty_date(value):
    if value is None:
        return True

    text = str(value).strip()
    return not text or text.startswith("0000-00-00")


def _to_date(value):
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value).strip()[:10])
    except (TypeError, ValueError):
        return None


def get_consulting_status(jobs, *, today=None):
    """優先度（2:現職、1:経験あり、0:その他）と実際の現職を返す。"""

    today = today or date.today()
    active_jobs = []
    has_consulting_experience = False

    for job in jobs:
        raw_start = job.get("work_start_period")
        raw_end = job.get("work_end_period")
        start = _to_date(raw_start)

        # 開始日未入力は許容。不正な日付・入社予定は経験に含めない。
        if not _is_empty_date(raw_start) and start is None:
            continue

        if start is not None and start > today:
            continue

        end = None

        if not _is_empty_date(raw_end):
            end = _to_date(raw_end)

            if end is None:
                continue

            if start is not None and end < start:
                continue

        industry = str(job.get("industry") or "").strip()

        if industry in CONSULTING_INDUSTRIES:
            has_consulting_experience = True

        # 退職済みの職歴は経験には含めるが、現職にはしない。
        if end is not None and end < today:
            continue

        active_jobs.append((
            start or date.min,
            job.get("id") or 0,
            job,
        ))

    # 現職が複数なら、開始日が新しいものを採用。同日はIDで決める。
    current_job = (
        max(active_jobs, key=lambda item: (item[0], item[1]))[2]
        if active_jobs else None
    )

    current_industry = str(
        (current_job or {}).get("industry") or ""
    ).strip()

    if current_industry in CONSULTING_INDUSTRIES:
        priority = 2
    elif has_consulting_experience:
        priority = 1
    else:
        priority = 0

    return {
        "priority": priority,
        "current_job": current_job,
    }