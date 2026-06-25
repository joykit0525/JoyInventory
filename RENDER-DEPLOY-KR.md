# JoyInventory Render 클라우드 배포

이 프로젝트는 Render Web Service로 배포하면 인터넷 어디서든 URL만 입력해서 사용할 수 있습니다.

## 준비된 설정

- `render.yaml`: Render Blueprint 설정
- `package.json`: Node/Express 서버 실행 설정
- `schema.sql`: 서버 시작 시 PostgreSQL 테이블 자동 준비
- `.env`: 로컬 전용 비밀 설정 파일이며 GitHub에는 올리지 않습니다.

## 필요한 계정

1. GitHub 계정
2. Render 계정
3. Supabase PostgreSQL 연결 문자열

## GitHub에 올릴 때 주의

`.env` 파일은 `.gitignore`에 들어 있으므로 업로드되지 않습니다. DB 비밀번호가 들어 있으니 GitHub에 직접 올리면 안 됩니다.

## Render 설정값

Render에서 Blueprint 또는 Web Service를 만들 때 아래 환경변수를 넣어야 합니다.

```text
DATABASE_URL=Supabase PostgreSQL 연결 문자열
DATABASE_SSL=true
HOST=0.0.0.0
CORS_ORIGIN=*
```

로그인을 걸고 싶으면 아래 두 값도 추가합니다.

```text
BASIC_AUTH_USER=원하는아이디
BASIC_AUTH_PASSWORD=원하는비밀번호
```

## 배포 후 접속 주소

배포가 끝나면 Render가 아래와 비슷한 주소를 제공합니다.

```text
https://joy-inventory.onrender.com
```

이 주소를 휴대폰, 다른 PC, 외부 인터넷에서 그대로 입력해서 사용할 수 있습니다.
