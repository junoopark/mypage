// 백엔드 API 주소. 정적 사이트는 빌드가 없어 환경변수를 쓸 수 없으므로
// 접속한 주소(hostname)를 보고 로컬/배포를 자동으로 고른다.
const API_BASE_URL = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8000"
  : "https://<Render 서비스명>.onrender.com"; // TODO(Phase 5): Render 배포 후 실제 주소로 교체 (끝에 / 없이)
