# Firebase 설정 가이드

## 📌 개요
O:mind 백엔드가 Firebase와 연동하여 사용자 데이터를 저장하고 관리하기 위한 설정 가이드입니다.

---

## 🔑 Firebase API 키 설정 단계

### 1단계: Firebase Console에서 서비스 계정 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (O:mind 프로젝트: **omind-49f39**)
3. 좌측 메뉴에서 **"프로젝트 설정"** 클릭
4. **"서비스 계정"** 탭 선택

### 2단계: 개인 키 생성

1. "서비스 계정" 탭에서 **"새 개인 키 생성"** 버튼 클릭
2. 선택 팝업에서 **"JSON"** 선택
3. 자동 다운로드된 JSON 파일을 메모장으로 열기

### 3단계: `.env` 파일 생성

`backend/` 디렉토리에 `.env` 파일을 생성하고 다음을 입력:

```env
# 다운로드한 JSON 파일에서 다음 값들을 복사:

FIREBASE_PROJECT_ID=omind-49f39

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@omind-49f39.iam.gserviceaccount.com

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG...\n-----END PRIVATE KEY-----\n"
```

### ⚠️ 개인 키 복사 시 주의사항

- JSON 파일에서 `"private_key"` 필드 값을 그대로 복사
- `\n` 문자는 **그대로 유지** (줄바꿈으로 변환하지 않음)
- 따옴표 안의 전체 내용을 복사

**예시:**
```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIB...\n-----END PRIVATE KEY-----\n"
}
```

---

## ✅ 설정 확인

### 터미널에서 확인

```bash
cd backend
npm start
```

**성공 로그:**
```
✅ Firebase Admin SDK 초기화 성공
   프로젝트 ID: omind-49f39
   클라이언트 이메일: firebase-adminsdk-xxxxx@omind-49f39.iam.gserviceaccount.com
✅ Firestore 연결 성공
✅ 모든 AI 에이전트 초기화 완료
```

### API로 확인

```bash
curl http://localhost:3000/api/status
```

**성공 응답:**
```json
{
  "success": true,
  "server": "running",
  "firebaseReady": true,
  "projectId": "✓ 설정됨",
  "clientEmail": "✓ 설정됨",
  "privateKey": "✓ 설정됨",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## ❌ 트러블슈팅

### 1. "Firebase 환경 변수 누락" 오류

**원인:** `.env` 파일이 없거나 설정이 잘못됨

**해결:**
- `backend/` 디렉토리에 `.env` 파일이 있는지 확인
- 3개의 필수 변수 모두 설정되었는지 확인:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

### 2. "permission-denied" 오류

**원인:** 개인 키가 손상되었거나 잘못된 형식

**해결:**
- 새 개인 키를 생성
- `private_key` 값을 정확히 복사
- `.env` 파일의 따옴표 안에 전체 내용을 포함하는지 확인

### 3. "ENOENT: no such file" 오류

**원인:** 프로젝트 ID가 잘못됨

**해결:**
- Firebase Console에서 프로젝트 ID 재확인
- 정확하게 `FIREBASE_PROJECT_ID=omind-49f39` 입력

---

## 📝 환경 변수 템플릿

`.env.example` 파일에서 템플릿 확인 가능:

```bash
cat backend/.env.example
```

---

## 🔒 보안 주의사항

⚠️ **절대 금지:**
- `.env` 파일을 Git에 커밋하기
- 개인 키를 다른 사람과 공유하기
- Firebase 자격증명을 소스 코드에 하드코딩하기

**권장:**
- `.env` 파일을 `.gitignore`에 추가
- 팀원들과 안전한 채널로 자격증명 공유
- 정기적으로 개인 키 갱신

---

## 📚 참고 자료

- [Firebase Admin SDK 문서](https://firebase.google.com/docs/admin/setup)
- [Firebase 보안 규칙](https://firebase.google.com/docs/rules)
- [Firestore 시작하기](https://firebase.google.com/docs/firestore/quickstart)

---

## 🆘 추가 도움

문제가 해결되지 않으면:

1. 콘솔 로그 전체 메시지 확인
2. `.env` 파일의 각 변수 값 재확인
3. Firebase Console에서 프로젝트 상태 확인
4. 서비스 계정 권한 확인 (Firestore 읽기/쓰기 권한 필요)
