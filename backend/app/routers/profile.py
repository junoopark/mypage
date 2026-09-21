from fastapi import APIRouter

from app.schemas import Profile

router = APIRouter(prefix="/profile", tags=["profile"])

# TODO(Phase 3): 소개 페이지에 쓸 실제 내용으로 교체
PROFILE = Profile(
    name="박준우",
    role="Fixed Income Strategist",
    intro="채권 시장을 분석하고 전략을 세우는 일을 합니다.",
    interests=["채권", "금리", "클라우드 컴퓨팅"],
    links={"github": "https://github.com/junoopark"},
)


@router.get("", response_model=Profile)
def get_profile():
    return PROFILE
