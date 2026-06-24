# JoyInventory PostgreSQL 실행 방법

JoyInventory는 여러 PC, 노트북, 모바일에서 같은 재고를 보기 위해 PostgreSQL을 중앙 DB로 사용합니다. `server.js`가 웹페이지와 API를 함께 제공하므로, 각 기기는 같은 서버 주소로 접속하면 됩니다.

## 1. PostgreSQL 준비

PostgreSQL에 DB를 하나 만듭니다.

```sql
CREATE DATABASE joy_inventory;
```

서버가 시작될 때 `schema.sql`을 자동 실행해 아래 테이블을 만듭니다.

- `inventory_items`: 품목 재고
- `inventory_movements`: 입고/출고/조정 이력

## 2. 서버 설정

`.env.example`을 `.env`로 복사한 뒤 PostgreSQL 주소를 입력합니다.

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/joy_inventory
CORS_ORIGIN=*
```

외부 호스팅 DB가 SSL을 요구하면 아래 값도 추가합니다.

```env
DATABASE_SSL=true
```

## 3. 실행

```bash
npm install
npm start
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

같은 와이파이의 다른 기기에서는 서버 PC의 내부 IP로 접속합니다.

```text
http://서버PC-IP:3000
```

집, 회사, 모바일 데이터망까지 모두 쓰려면 서버를 클라우드/VPS/NAS에 배포하고 HTTPS 도메인을 연결하는 것을 권장합니다.

## 4. 앱 설정

서버에서 `index.html`을 열면 API 주소는 자동으로 `/api`를 사용합니다.

만약 HTML 파일을 직접 열거나, 웹페이지와 API 서버 주소가 다르면 앱의 `설정 > API 서버 주소`에 아래처럼 입력합니다.

```text
https://inventory.example.com/api
```

## 5. CSV

CSV 가져오기는 다음 컬럼을 인식합니다.

- `SKU`, `상품코드`, `상품코드/SKU`
- `상품명`
- `상품이미지`
- `카테고리`
- `보관 위치`, `위치`, `재고위치`
- `현재 재고`, `재고`, `재고수량`
- `안전 재고`, `안전재고`
- `매입금액`
- `입고단가`, `원가`
- `마진율`
- `쇼핑몰 수수료율`, `수수료율`
- `일반과세율`, `과세율`
- `단위`
- `거래처`
- `메모`

## 운영 권장 방식

- 가족/직원 여러 명이 쓰면 서버는 항상 켜져 있는 PC, NAS, 또는 클라우드에 둡니다.
- 외부 접속은 공유기 포트포워딩보다 HTTPS가 가능한 클라우드 배포를 권장합니다.
- `DATABASE_URL`은 Git이나 공유 문서에 올리지 마세요.
- 모바일에서 사진 이미지를 많이 저장하면 DB가 커질 수 있으니, 장기적으로는 S3 같은 이미지 저장소를 붙이는 방식이 좋습니다.
