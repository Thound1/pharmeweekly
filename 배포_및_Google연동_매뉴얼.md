# 파메어스 주간보고 v1.3.1 배포 및 Google Sheets 연동 매뉴얼

## 1. 구성 개요

이 프로그램은 별도 서버 없이 다음 구성으로 동작합니다.

- GitHub Pages: HTML·CSS·JavaScript 화면 배포
- Google Identity Services: 사용자 Google 계정 인증
- Google Sheets API: 브라우저에서 Google Sheets 직접 조회·저장
- Google 스프레드시트: 업무·KPI·의사결정 원본 데이터 보관

페이지 주소는 공개될 수 있지만, 실제 시트 데이터는 Google 로그인과 해당 스프레드시트의 공유 권한을 모두 통과해야 조회·수정할 수 있습니다.

---

## 2. 준비 파일

압축을 해제한 뒤 아래 파일을 같은 폴더에 유지합니다.

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `seed-data.js`
- `xlsx-export.js`
- `.nojekyll`
- `파메어스_주간보고_GoogleSheets_원본양식_v1.3.1.xlsx`
- 본 매뉴얼 파일

월간 성과 엑셀 출력은 공식 SheetJS CDN의 `xlsx.full.min.js`를 페이지에서 불러옵니다. 회사 방화벽에서 `cdn.sheetjs.com`을 차단하면 월간 엑셀 다운로드만 동작하지 않을 수 있습니다.

---

## 3. Google 스프레드시트 만들기

1. Google Drive에 `파메어스_주간보고_GoogleSheets_원본양식_v1.3.1.xlsx`를 업로드합니다.
2. 업로드된 파일을 Google Sheets로 엽니다.
3. `파일 → Google 스프레드시트로 저장`을 선택합니다.
4. 생성된 Google 스프레드시트 주소에서 `/d/`와 `/edit` 사이 값을 복사합니다.

예시:

```text
https://docs.google.com/spreadsheets/d/여기가_SPREADSHEET_ID/edit
```

5. 주간보고를 사용할 사람에게 스프레드시트 **편집자 권한**을 공유합니다.
6. 시트 이름은 아래와 같이 유지합니다.

```text
주차 / 업무 / KPI / 정량지표 / 의사결정
```

`사용안내`, `HTML 필드 매핑` 시트는 사람이 내용을 이해하기 위한 안내용이며 프로그램 저장 대상은 아닙니다.

---

## 4. Google Cloud 프로젝트 설정

### 4-1. 프로젝트 생성

1. Google Cloud Console에 접속합니다.
2. 신규 프로젝트를 생성합니다.
3. 회사에서 관리할 수 있는 계정으로 프로젝트를 소유하는 것을 권장합니다.

### 4-2. Google Sheets API 사용 설정

1. `API 및 서비스 → 라이브러리`로 이동합니다.
2. `Google Sheets API`를 검색합니다.
3. `사용`을 선택합니다.

### 4-3. Google 인증 플랫폼 설정

1. `Google 인증 플랫폼 → 브랜딩`으로 이동합니다.
2. 앱 이름을 `파메어스 주간보고`로 입력합니다.
3. 사용자 지원 이메일과 개발자 연락처를 입력합니다.
4. Google Workspace 조직 내부에서만 사용할 경우 대상 유형을 `내부`로 설정합니다.
5. 일반 Google 계정을 사용하는 경우 `외부`로 설정하고 테스트 단계에서는 실제 사용자를 테스트 사용자로 등록합니다.

### 4-4. OAuth 웹 클라이언트 생성

1. `Google 인증 플랫폼 → 클라이언트`로 이동합니다.
2. `클라이언트 만들기`를 선택합니다.
3. 애플리케이션 유형은 `웹 애플리케이션`을 선택합니다.
4. 승인된 JavaScript 원본에 GitHub Pages의 **출처(origin)** 를 등록합니다.

예시:

```text
https://회사계정.github.io
```

사용자 사이트가 아니라 프로젝트 사이트여도 `/저장소명` 경로는 넣지 않고 origin만 등록합니다.

5. 생성된 `클라이언트 ID`를 복사합니다.
6. 이 프로그램은 브라우저 팝업 토큰 방식이므로 클라이언트 보안 비밀번호를 HTML이나 `config.js`에 넣지 않습니다.

---

## 5. config.js 설정

`config.js`를 메모장 또는 코드 편집기로 열어 다음 값을 수정합니다.

```javascript
window.APP_CONFIG = {
  DEMO_MODE: false,
  GOOGLE_CLIENT_ID: "발급받은_클라이언트_ID.apps.googleusercontent.com",
  SPREADSHEET_ID: "Google_스프레드시트_ID",
  TEAM_NAME: "플랫폼기획팀",
  SHEET_NAMES: {
    weeks: "주차",
    tasks: "업무",
    kpis: "KPI",
    criteria: "정량지표",
    decisions: "의사결정"
  }
};
```

주의:

- `DEMO_MODE`는 실제 연동 시 반드시 `false`입니다.
- OAuth 클라이언트 ID와 스프레드시트 ID는 브라우저에서 보이는 값입니다.
- 계정 비밀번호, 클라이언트 시크릿, 서비스 계정 JSON 키는 절대 넣지 않습니다.

---

## 6. GitHub Pages에 올리기

### 6-1. 저장소 생성

1. GitHub에서 새 저장소를 생성합니다.
2. 저장소 이름 예시: `pharmearth-weekly-report`
3. 압축을 푼 폴더 안의 파일을 저장소 최상위에 모두 업로드합니다.
4. `index.html`이 저장소 최상위에 있어야 합니다.

### 6-2. GitHub Pages 활성화

1. 저장소의 `Settings`로 이동합니다.
2. 왼쪽 메뉴에서 `Pages`를 선택합니다.
3. `Build and deployment → Source`를 `Deploy from a branch`로 선택합니다.
4. Branch는 `main`, Folder는 `/(root)`를 선택합니다.
5. `Save`를 누릅니다.
6. 배포가 끝나면 다음 형식의 주소가 생성됩니다.

```text
https://회사계정.github.io/pharmearth-weekly-report/
```

### 6-3. OAuth 원본 재확인

GitHub Pages 주소가 확정되면 Google Cloud의 OAuth 웹 클라이언트에서 승인된 JavaScript 원본이 다음처럼 등록되어 있는지 확인합니다.

```text
https://회사계정.github.io
```

`http`가 아니라 `https`를 사용합니다.

---

## 7. 최초 접속 및 확인

1. GitHub Pages 주소를 엽니다.
2. `Google 연결`을 누릅니다.
3. 대상 Google 계정을 선택하고 시트 접근 권한을 승인합니다.
4. 주차 데이터가 화면에 나타나는지 확인합니다.
5. 작업 상세에 테스트 문구를 입력하고 입력창 밖을 클릭합니다.
6. 우측 하단에 다음 형식의 토스트가 표시되는지 확인합니다.

```text
[26-08-04 09:41:00 저장되었습니다.]
```

7. Google Sheets의 `업무` 시트에서도 값이 바뀌었는지 확인합니다.
8. `월별 성과 취합`에서 담당자·연도·월을 선택하고 `.xlsx` 파일이 정상적으로 열리는지 확인합니다.

---

## 7-1. Google 연결 세션 유지

- 상단의 `세션 연결 유지`는 기본적으로 켜져 있습니다.
- Google 연결이 완료되면 액세스 토큰과 만료 시각을 현재 브라우저 탭의 `sessionStorage`에 저장합니다.
- 같은 탭에서 페이지를 새로고침하면 유효기간이 남은 토큰을 복원하여 Google Sheets 데이터를 바로 불러옵니다.
- 토큰이 만료되었거나 Google API가 401을 반환하면 저장된 토큰을 즉시 삭제하고 다시 연결하도록 안내합니다.
- 체크를 해제하면 현재 브라우저 세션에 저장된 토큰도 즉시 삭제됩니다.
- 브라우저 탭을 닫거나 시크릿 창을 종료하면 `sessionStorage`도 함께 종료됩니다.
- Google 비밀번호와 OAuth 클라이언트 시크릿은 저장하지 않습니다.
- 토큰 자체의 유효기간이 끝난 후 새 토큰을 받으려면 보안 정책상 `Google 연결` 버튼을 다시 눌러야 합니다.

## 8. v1.3.1 자동저장 동작

- 텍스트 입력 중에는 Google Sheets 저장 요청을 보내지 않습니다.
- 입력창에서 벗어날 때 해당 변경분을 한 번 저장합니다.
- 프로젝트 추가·삭제, 작업 추가·삭제, 드래그앤드롭, KPI 수정도 자동저장됩니다.
- 저장이 진행되는 동안 다시 수정하면 첫 저장이 끝난 뒤 최신 변경분을 한 번 더 저장합니다.
- `지금 저장` 버튼은 즉시 저장이 필요할 때만 사용합니다.

Google 연동 모드의 저장은 여러 시트를 한 번에 다시 쓰므로, 동시에 여러 명이 같은 화면을 수정하면 나중에 저장한 값이 우선될 수 있습니다.

---

## 9. 업데이트 배포 방법

1. 새 버전 ZIP을 풉니다.
2. 기존 GitHub 저장소의 프로그램 파일을 새 파일로 교체합니다.
3. `config.js`의 Client ID와 Spreadsheet ID는 기존 운영값으로 유지합니다.
4. 커밋 후 GitHub Pages 배포가 완료될 때까지 기다립니다.
5. 사용자는 브라우저에서 `Ctrl + F5`로 강력 새로고침합니다.

Google Sheets 데이터는 별도 파일이므로 HTML 프로그램을 교체해도 기존 데이터는 유지됩니다. 다만 새 버전에서 열 구조가 바뀐 경우 동봉된 원본 양식과 `HTML 필드 매핑` 시트를 먼저 확인합니다.

---

## 10. 문제 해결

### Google 연결 버튼이 동작하지 않음

- `DEMO_MODE: false`인지 확인
- Client ID 오타 확인
- 승인된 JavaScript 원본에 `https://계정.github.io`가 등록됐는지 확인
- 외부 앱 테스트 모드라면 사용자가 테스트 사용자에 등록됐는지 확인

### 시트 데이터를 읽지 못함

- Spreadsheet ID 확인
- 로그인한 Google 계정에 해당 시트 편집 권한이 있는지 확인
- 시트 이름이 `주차`, `업무`, `KPI`, `정량지표`, `의사결정`인지 확인
- 각 데이터 시트 2행의 영문 연동 키를 변경하지 않았는지 확인

### 월간 성과 엑셀이 내려받아지지 않음

- 개발자 도구에서 `cdn.sheetjs.com` 차단 여부 확인
- 회사 방화벽 또는 보안 프로그램에서 SheetJS CDN 허용
- 페이지 강력 새로고침 후 재시도

### 이전 화면이 계속 보임

- `Ctrl + F5` 강력 새로고침
- GitHub Pages의 Actions/배포 상태 확인
- 배포된 `index.html`의 스크립트 버전이 `v=1.3.1`인지 확인

---

## 공식 참고 문서

- GitHub Pages publishing source: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Google Sheets JavaScript quickstart: https://developers.google.com/workspace/sheets/api/quickstart/js
- Google OAuth JavaScript API reference: https://developers.google.com/identity/oauth2/web/reference/js-reference
- SheetJS standalone browser scripts: https://docs.sheetjs.com/docs/getting-started/installation/standalone/


## v1.3 데이터 삭제 방식

웹에서 삭제한 작업·프로젝트·의사결정은 `deleted` 상태로 남기지 않고 다음 저장 시 Google Sheets 행에서도 제거됩니다. v1.3 원본 양식에는 `deleted` 열이 없습니다.

## 세션 연결 유지

상단의 `세션 연결 유지`는 유효한 Google 액세스 토큰을 현재 탭의 `sessionStorage`에만 저장합니다. 토큰이 만료되거나 API 인증이 거절되면 즉시 삭제됩니다. 비밀번호와 클라이언트 시크릿은 저장하지 않습니다.
