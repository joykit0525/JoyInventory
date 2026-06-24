# JoyInventory 클라우드 배포 방법

이 방식은 서버 PC가 꺼져 있어도 회사 컴퓨터, 모바일, 노트북에서 같은 재고 DB를 사용하는 방법입니다.

## 권장 방식: Render Web Service

Render 공식 문서 기준으로 Node Express 앱은 Web Service로 배포하고, 빌드는 `npm ci`, 실행은 `npm start`를 사용합니다. 이 프로젝트에는 `render.yaml`을 추가해두었습니다.

## 1. GitHub에 프로젝트 올리기

`.env` 파일은 `.gitignore`에 들어 있으므로 업로드하지 마세요. DB 비밀번호가 들어 있습니다.

```bash
git add .
git commit -m "Prepare cloud deployment"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 2. Render에서 배포

1. Render Dashboard에서 `New` > `Blueprint`를 선택합니다.
2. GitHub 저장소를 연결합니다.
3. `render.yaml`을 감지하면 `joy-inventory` Web Service를 생성합니다.
4. 환경변수 입력 화면에서 아래 값을 넣습니다.

```text
DATABASE_URL=Supabase PostgreSQL 연결 문자열
BASIC_AUTH_USER=원하는 로그인 아이디
BASIC_AUTH_PASSWORD=원하는 로그인 비밀번호
```

이미 로컬 `.env`에 있는 `DATABASE_URL` 값을 Render의 환경변수에 복사하면 됩니다.

## 3. 접속

배포가 끝나면 Render가 아래 같은 주소를 만듭니다.

```text
https://joy-inventory.onrender.com
```

회사 컴퓨터, 모바일, 노트북에서 이 주소로 접속하면 됩니다. 처음 접속할 때 `BASIC_AUTH_USER`와 `BASIC_AUTH_PASSWORD`로 로그인합니다.

## 주의

- 클라우드 주소에서는 `file:///.../index.html`을 열지 않습니다.
- Render 주소 자체가 앱 주소입니다.
- Supabase DB 비밀번호를 Render 환경변수 외의 공개 파일에 저장하지 마세요.
- 무료/저가 플랜은 일정 시간 사용하지 않으면 첫 접속이 느릴 수 있습니다.
