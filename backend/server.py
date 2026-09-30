"""Optional API boundary for Claude guidance and Google Sheets record storage."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
app = FastAPI(title="Finwise optional services", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


class Profile(BaseModel):
    income: float = Field(gt=0, le=1_000_000_000)
    expenses: float = Field(ge=0, le=1_000_000_000)
    debt: float = Field(ge=0, le=1_000_000_000)
    score: int | None = Field(default=None, ge=300, le=900)
    savings: float = Field(ge=0, le=1_000_000_000_000)
    goal: str = Field(pattern="^(home|debt|emergency|vehicle|general)$")


class Record(BaseModel):
    kind: str = Field(pattern="^(loan|credit|tips)$")
    payload: dict[str, Any]


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "ai_configured": bool(os.getenv("ANTHROPIC_API_KEY")), "sheets_configured": bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE") and os.getenv("GOOGLE_SHEET_ID"))}


@app.post("/api/tips")
def tips(profile: Profile) -> dict[str, Any]:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="AI guidance is not configured")
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key, timeout=15.0, max_retries=0)
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"), max_tokens=700,
            system=("You provide cautious educational personal-finance guidance for an Indian user. "
                    "This is not financial advice. Never claim lending approval, guaranteed outcomes, or request identifiers. "
                    "Return only valid JSON with keys summary (string), observations (array of strings), actions (array), "
                    "cautions (array), nextSteps (array). Keep specific, practical and nonjudgmental."),
            messages=[{"role": "user", "content": json.dumps(profile.model_dump(), ensure_ascii=False)}],
        )
        raw = "".join(block.text for block in response.content if getattr(block, "type", "") == "text").strip()
        data = json.loads(raw)
        if not isinstance(data.get("summary"), str) or not isinstance(data.get("actions"), list):
            raise ValueError("Unexpected guidance structure")
        return data
    except Exception as exc:
        # Provider details stay in server logs; clients switch to the local guide.
        print(f"Claude guidance unavailable: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="AI guidance is temporarily unavailable") from None


def sheets_service():
    credentials_path, sheet_id = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE"), os.getenv("GOOGLE_SHEET_ID")
    if not credentials_path or not sheet_id:
        return None, None
    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
        creds = Credentials.from_service_account_file(credentials_path, scopes=["https://www.googleapis.com/auth/spreadsheets"])
        return build("sheets", "v4", credentials=creds, cache_discovery=False).spreadsheets().values(), sheet_id
    except Exception as exc:
        print(f"Sheets setup unavailable: {type(exc).__name__}")
        return None, None


@app.post("/api/records")
def add_record(record: Record) -> dict[str, Any]:
    service, sheet_id = sheets_service()
    if not service:
        raise HTTPException(status_code=503, detail="Record storage is not configured")
    row = [datetime.now(timezone.utc).isoformat(), record.kind, json.dumps(record.payload, ensure_ascii=False, separators=(",", ":"))]
    try:
        service.append(spreadsheetId=sheet_id, range="Records!A:C", valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": [row]}).execute()
        return {"saved": True, "message": "Saved"}
    except Exception as exc:
        print(f"Sheets append unavailable: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="Record storage is temporarily unavailable") from None


@app.get("/api/records")
def get_records(limit: int = 50) -> dict[str, Any]:
    service, sheet_id = sheets_service()
    if not service:
        raise HTTPException(status_code=503, detail="Record storage is not configured")
    try:
        data = service.get(spreadsheetId=sheet_id, range=f"Records!A1:C{max(1, min(limit, 500)) + 1}").execute()
        values = data.get("values", [])
        return {"records": values[1:] if values and values[0] and values[0][0] == "timestamp" else values}
    except Exception as exc:
        print(f"Sheets read unavailable: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="Record storage is temporarily unavailable") from None


@app.get("/")
def index():
    return FileResponse(ROOT / "index.html")


app.mount("/frontend", StaticFiles(directory=ROOT / "frontend"), name="frontend")


@app.get("/app.js")
def app_script():
    return FileResponse(ROOT / "app.js", media_type="text/javascript")


@app.get("/styles.css")
def styles():
    return FileResponse(ROOT / "styles.css", media_type="text/css")


@app.get("/README.md")
def readme():
    return FileResponse(ROOT / "README.md", media_type="text/markdown")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=int(os.getenv("PORT", "8000")), reload=False)
