import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import guestbook, profile

app = FastAPI(title="Junoo Park's Page API")

# CORS: 허용 출처는 환경변수로 받는다 (배포 시 Vercel 주소를 넣는다)
origins = os.getenv(
    "ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(guestbook.router)


@app.get("/")
def read_root():
    return {"message": "Junoo Park's Page API 에 오신 것을 환영합니다"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
