/**
 * 1) 화면 확인: DEMO_MODE를 true로 유지
 * 2) Google Sheets 실연동: CLIENT_ID/SPREADSHEET_ID 입력 후 DEMO_MODE를 false로 변경
 */
window.APP_CONFIG = {
  APP_NAME: "파메어스 플랫폼기획팀 주간보고",
  TEAM_NAME: "플랫폼기획팀",
  DEMO_MODE: false,

  GOOGLE_CLIENT_ID: "473271688404-k4u2952s2mbngbg9rp05f1psnss4sh6n.apps.googleusercontent.com",
  SPREADSHEET_ID: "1Tm94F-27tOoZV2mVsT05hgIJP5gw6jq4NeIRbWRI2Cs",

  SHEET_NAMES: {
    weeks: "주차",
    tasks: "업무",
    kpis: "KPI",
    criteria: "정량지표",
    decisions: "의사결정"
  }
};
