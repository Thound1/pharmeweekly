(() => {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const SEED = window.PHARM_SEED_DATA || { weeks: [], tasks: [], kpis: [], criteria: [], decisions: [] };
  const OWNER_ORDER = ["백인학", "류재환", "허미순", "김환희"];
  const OWNER_INDEX = Object.fromEntries(OWNER_ORDER.map((name, index) => [name, index]));
  const DEMO_STORAGE_KEY = "pharmearth-weekly-serverless-demo-v10";
  const ZOOM_STORAGE_KEY = "pharmearth-weekly-serverless-font-scale-v2";
  const ZOOM_LEVELS = [0.9, 1, 1.1, 1.2, 1.3, 1.45, 1.6, 1.8, 2, 2.25, 2.5];
  const OAUTH_SCOPE = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email";
  const LAST_GOOGLE_EMAIL_KEY = "pharmearth-weekly-google-email-v1";
  const REMEMBER_GOOGLE_ACCOUNT_KEY = "pharmearth-weekly-remember-google-account-v1";
  const GOOGLE_SESSION_TOKEN_KEY = "pharmearth-weekly-google-session-token-v1";
  const GOOGLE_IDENTITY_WAIT_MS = 10000;
  const PRESENCE_SHEET_NAME = "접속현황";
  const PRESENCE_SCHEMA = ["session_id", "user_email", "week_id", "entity_type", "entity_id", "field", "last_seen", "started_at"];
  const PRESENCE_DISPLAY_HEADERS = [
    "세션 ID (자동)", "사용자 이메일", "현재 보고 주차", "편집 대상 유형",
    "편집 대상 ID", "편집 중 필드", "마지막 확인 시각", "접속 시작 시각"
  ];
  const PRESENCE_POLL_MS = 15000;
  const PRESENCE_HEARTBEAT_MS = 45000;
  const PRESENCE_STALE_MS = 120000;
  const REMOTE_SYNC_MS = 20000;
  const SAVE_VERIFY_RETRIES = 3;
  const SAVE_VERIFY_DELAY_MS = 320;
  const KEY_FIELD = { weeks: "week_id", tasks: "task_id", kpis: "kpi_id", criteria: "kpi_code", decisions: "decision_id" };
  const META_FIELDS = new Set(["updated_at", "updated_by", "created_at"]);
  const PLACEHOLDER_CLIENT_ID = "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com";
  const PLACEHOLDER_SHEET_ID = "YOUR_GOOGLE_SPREADSHEET_ID";

  const PAMECON_HIDDEN_KEY = "pharmearth-pamecon-hidden-v1";
  const PAMECON_CLICK_WINDOW_MS = 2200;
  const PAMECON_ASSET_BASE = "assets/pamecon";
  const PAMECON_FRAME_COUNTS = { appear: 8, walk: 6, idle: 8, sit: 8, jump: 8, stretch: 8, sleep: 8, exit: 8 };
  const PAMECON_FRAME_MS = { appear: 105, walk: 118, idle: 165, sit: 150, jump: 105, stretch: 145, sleep: 180, exit: 105 };

  const SCHEMA = {
    weeks: ["week_id", "start_date", "end_date", "created_at", "updated_at", "updated_by"],
    tasks: ["task_id", "week_id", "owner", "project", "project_order", "period", "title", "details", "due_date", "sort_order", "kpi_code", "kpi_qty", "updated_at", "updated_by"],
    kpis: ["kpi_id", "week_id", "kpi_code", "kpi_name", "owner", "actual", "note", "legacy_target", "sort_order", "updated_at", "updated_by"],
    criteria: ["kpi_code", "kpi_name", "category", "owner", "weight", "annual_target", "m1_target", "m2_target", "m3_target", "m4_target", "m5_target", "m6_target", "m7_target", "m8_target", "m9_target", "m10_target", "m11_target", "m12_target", "sort_order", "active"],
    decisions: ["decision_id", "week_id", "item", "summary", "decision", "note", "sort_order", "updated_at", "updated_by"]
  };

  const DISPLAY_HEADERS = {
    weeks: [
      "주차 ID (상단 주차 선택·데이터 연결)", "시작일 (보고 기간 시작)", "종료일 (보고 기간 종료)",
      "생성일시 (자동)", "최종 수정일시 (자동)", "최종 수정자 (자동)"
    ],
    tasks: [
      "작업 ID (내부 저장용)", "주차 ID (해당 보고 주차 연결)", "담당자 (인원별 구분 헤더)",
      "프로젝트명 (담당자 아래 프로젝트 제목)", "프로젝트 순서 (드래그앤드롭)", "금주/차주 구분 (좌우 영역)",
      "작업명 (작업명 입력칸)", "상세 내용 (상세 입력칸)", "완료/예정일 (예: 00/00(월))",
      "프로젝트 내 작업 순서 (드래그앤드롭)", "연결 KPI 코드 (화면 비노출)", "KPI 실적 수량 (자동 합산 대상)",
      "최종 수정일시 (자동)", "최종 수정자 (자동)"
    ],
    kpis: [
      "KPI 실적 ID (내부 저장용)", "주차 ID (해당 주차 실적)", "KPI 코드 (정량지표 연결·화면 비노출)",
      "KPI명 (HTML KPI 표의 정량지표)", "담당자 (KPI 담당자)", "실적 (주차 KPI 실적 입력)",
      "비고 (KPI 표 비고)", "기존 목표값 (과거 자료 보존용·현재 계산 미사용)", "KPI 표시 순서",
      "최종 수정일시 (자동)", "최종 수정자 (자동)"
    ],
    criteria: [
      "KPI 코드 (업무·KPI 실적 연결키)", "KPI명 (HTML KPI 표의 정량지표)", "정량지표 분류/설명",
      "담당자", "가중치 (전체 달성률 반영)", "연간 목표 (참고값)",
      "1월 Target", "2월 Target", "3월 Target", "4월 Target", "5월 Target", "6월 Target",
      "7월 Target", "8월 Target", "9월 Target", "10월 Target", "11월 Target", "12월 Target",
      "KPI 표시 순서", "사용 여부 (Y=표시)"
    ],
    decisions: [
      "의사결정 ID (내부 저장용)", "주차 ID (해당 보고 주차 연결)", "항목명 (의사결정 카드 제목)",
      "주요내용", "의사결정 사항", "비고", "표시 순서",
      "최종 수정일시 (자동)", "최종 수정자 (자동)"
    ]
  };

  const state = {
    token: null,
    tokenClient: null,
    userEmail: "",
    demoMode: true,
    weeks: [],
    tasks: [],
    kpis: [],
    criteria: [],
    decisions: [],
    currentWeekId: null,
    kpiScope: "week",
    dirty: false,
    loading: false,
    drag: null,
    reportZoom: 1,
    autoSaveTimer: null,
    savePromise: null,
    saveQueued: false,
    lastSavedAt: null,
    changeVersion: 0,
    authenticating: false,
    authPromise: null,
    authResolve: null,
    authReject: null,
    authTimer: null,
    tokenExpiresAt: 0,
    googleIdentityReady: false,
    tokenExpiryTimer: null,
    rememberGoogleAccount: loadRememberGoogleAccount(),
    remoteSnapshot: null,
    mutationPromise: null,
    presenceSessionId: loadPresenceSessionId(),
    presenceStartedAt: timestamp(),
    presenceRows: [],
    presenceRowNumber: null,
    presencePollTimer: null,
    presenceHeartbeatTimer: null,
    remoteSyncTimer: null,
    currentEditPresence: null,
    sheetIdMap: null,
    saveVerificationInProgress: false
  };


  const pamecon = {
    triggerClicks: [],
    root: null,
    character: null,
    sprite: null,
    menu: null,
    hideButton: null,
    visible: false,
    action: "",
    sequence: [],
    sequenceIndex: 0,
    frameElapsed: 0,
    actionElapsed: 0,
    walkDuration: 0,
    x: 0,
    direction: 1,
    lastTimestamp: 0,
    rafId: null,
    pendingHide: false
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    state.demoMode = CONFIG.DEMO_MODE !== false;
    if (el.rememberLoginCheckbox) el.rememberLoginCheckbox.checked = state.rememberGoogleAccount;
    state.reportZoom = loadReportZoom();
    applyModeUi();
    applyReportZoom();
    initPameconEasterEgg();
    if (state.demoMode) {
      loadData().catch(handleError);
    } else {
      initializeGoogleMode().catch(handleError);
    }
  }

  async function initializeGoogleMode() {
    if (!validGoogleConfig()) {
      applyModeUi();
      setStatus("config.js의 Google 설정을 확인해 주세요.");
      return;
    }

    state.authenticating = true;
    applyModeUi();
    setLoading(true, "Google 인증 모듈을 준비하는 중입니다.");
    try {
      await waitForGoogleIdentity();
      initializeTokenClient();
      state.googleIdentityReady = true;

      if (restoreGoogleSessionToken()) {
        setLoading(true, "저장된 Google 세션을 확인하는 중입니다.");
        try {
          await fetchUserEmail();
          await loadData();
          setStatus("브라우저 세션의 Google 연결을 복원했습니다.");
        } catch (error) {
          clearGoogleSessionToken();
          state.token = null;
          state.tokenExpiresAt = 0;
          showToast("저장된 Google 연결이 만료되어 다시 연결이 필요합니다.", true);
        }
      }
    } catch (error) {
      state.googleIdentityReady = false;
      handleError(error);
    } finally {
      state.authenticating = false;
      applyModeUi();
      setLoading(false);
      if (state.googleIdentityReady && !state.token) {
        setStatus("Google 연결 버튼을 눌러 주세요 · 연결 후에는 현재 탭 세션에서 유지됩니다.");
      }
    }
  }

  function cacheElements() {
    [
      "modeBadge", "connectButton", "rememberLoginCheckbox", "weekSelect", "prevWeekButton", "nextWeekButton",
      "zoomOutButton", "zoomResetButton", "zoomInButton", "zoomValue", "report",
      "newWeekButton", "monthlyExportButton", "reloadButton", "saveButton", "reportTitle", "reportMeta",
      "ownerSections", "kpiScopeLabel", "kpiSummaryCards", "kpiTableBody", "decisionList", "addDecisionButton",
      "connectionStatus", "activeUsersBadge", "toastContainer", "loadingOverlay", "loadingText",
      "projectDialog", "projectForm", "projectOwner", "projectName",
      "taskDialog", "taskForm", "taskDialogTitle", "taskId", "taskOwner", "taskProject", "taskPeriod", "taskDueDate",
      "taskTitle", "taskDetails", "taskKpiSelect", "taskKpiQty", "deleteTaskButton",
      "decisionDialog", "decisionForm", "decisionId", "decisionItem", "decisionSummary", "decisionRequired", "decisionNote", "deleteDecisionButton",
      "weekDialog", "weekForm", "weekStartDate", "weekEndDate", "weekCarryOver",
      "monthlyExportDialog", "monthlyExportForm", "monthlyExportOwner", "monthlyExportYear", "monthlyExportMonth", "monthlyExportCount"
    ].forEach(id => { el[id] = document.getElementById(id); });
  }

  let inlineEditorGuardTarget = null;

  function isInlineEditorControl(target) {
    return target instanceof HTMLElement && target.matches(
      ".task-field, .project-name-input, .kpi-actual-input, .kpi-note-input"
    );
  }

  function isTextLikeEditor(target) {
    if (target instanceof HTMLTextAreaElement) return true;
    if (!(target instanceof HTMLInputElement)) return false;
    return ["text", "search", "email", "url", "tel", "password"].includes((target.type || "text").toLowerCase());
  }

  function installInlineEditorKeyboardGuard() {
    // 메인 편집칸에 포커스가 있는 동안 키 입력이 페이지/브라우저 액션으로 새는 것을 막습니다.
    document.addEventListener("focusin", event => {
      if (isInlineEditorControl(event.target)) inlineEditorGuardTarget = event.target;
    }, true);

    // 마우스/터치로 편집칸 밖을 명시적으로 누른 경우에는 정상적인 포커스 이탈로 인정합니다.
    document.addEventListener("pointerdown", event => {
      if (!inlineEditorGuardTarget) return;
      if (event.target === inlineEditorGuardTarget || inlineEditorGuardTarget.contains?.(event.target)) return;
      inlineEditorGuardTarget = null;
    }, true);

    document.addEventListener("keydown", event => {
      if (event.isComposing || event.key === "Process") return;

      const target = event.target;
      if (isInlineEditorControl(target)) {
        inlineEditorGuardTarget = target;
        // Tab은 사용자가 다음 입력칸으로 이동하려는 명시적 액션이므로 그대로 둡니다.
        if (event.key === "Tab") return;
        // 입력칸 안에서 발생한 키 이벤트가 업무보드나 상위 화면 단축키로 전파되지 않도록 합니다.
        event.stopPropagation();
        return;
      }

      const editor = inlineEditorGuardTarget;
      if (!editor || !editor.isConnected || editor.disabled || editor.readOnly) return;

      // Tab/Escape는 의도적인 편집 종료/이동으로 취급합니다.
      if (event.key === "Tab" || event.key === "Escape") {
        inlineEditorGuardTarget = null;
        return;
      }

      const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
      const recoverableKey = isPrintable || [
        " ", "Space", "Spacebar", "Enter", "Backspace", "Delete", "PageUp", "PageDown",
        "Home", "End", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
      ].includes(event.key);
      if (!recoverableKey) return;

      // 포커스가 순간적으로 body/버튼 등으로 빠진 상태에서 Space, Backspace 등이
      // 페이지 스크롤/뒤로가기/버튼 실행으로 처리되지 않도록 원래 편집칸으로 회수합니다.
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      event.preventDefault();
      event.stopPropagation();
      window.clearTimeout(state.autoSaveTimer);
      state.autoSaveTimer = null;

      try { editor.focus({ preventScroll: true }); }
      catch (_) { editor.focus(); }

      if (isTextLikeEditor(editor) && !event.ctrlKey && !event.metaKey && !event.altKey) {
        applyRecoveredEditorKey(editor, event);
      }

      requestAnimationFrame(() => {
        if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo(scrollX, scrollY);
      });
    }, true);
  }

  function applyRecoveredEditorKey(editor, event) {
    const start = Number.isInteger(editor.selectionStart) ? editor.selectionStart : String(editor.value || "").length;
    const end = Number.isInteger(editor.selectionEnd) ? editor.selectionEnd : start;
    const value = String(editor.value || "");
    let replacement = null;
    let from = start;
    let to = end;

    if (event.key === "Enter") {
      if (!(editor instanceof HTMLTextAreaElement)) return;
      replacement = "\n";
    } else if (event.key === "Backspace") {
      if (start === end) {
        if (start <= 0) return;
        from = start - 1;
      }
      replacement = "";
    } else if (event.key === "Delete") {
      if (start === end) {
        if (end >= value.length) return;
        to = end + 1;
      }
      replacement = "";
    } else if ([" ", "Space", "Spacebar"].includes(event.key)) {
      replacement = " ";
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      replacement = event.key;
    } else {
      // 방향키/Home/End/PageUp/PageDown은 페이지를 움직이지 않게 하고 편집칸만 복원합니다.
      // 다음 키 입력부터 브라우저의 정상 caret 이동 동작을 그대로 사용합니다.
      return;
    }

    if (typeof editor.setRangeText !== "function") return;
    editor.setRangeText(replacement, from, to, "end");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function bindEvents() {
    installInlineEditorKeyboardGuard();
    el.connectButton.addEventListener("click", connectGoogle);
    el.rememberLoginCheckbox?.addEventListener("change", () => {
      state.rememberGoogleAccount = Boolean(el.rememberLoginCheckbox.checked);
      saveRememberGoogleAccount(state.rememberGoogleAccount);
      if (state.rememberGoogleAccount) {
        if (state.userEmail) localStorage.setItem(LAST_GOOGLE_EMAIL_KEY, state.userEmail);
        persistGoogleSessionToken();
        showToast("유효한 Google 연결을 현재 브라우저 탭 세션에서 유지합니다.");
      } else {
        clearGoogleSessionToken();
        try { localStorage.removeItem(LAST_GOOGLE_EMAIL_KEY); } catch (_) {}
        showToast("브라우저에 보관된 Google 세션 정보를 삭제했습니다.");
      }
    });
    el.weekSelect.addEventListener("change", () => changeWeek(el.weekSelect.value));
    el.prevWeekButton.addEventListener("click", () => moveWeek(1));
    el.nextWeekButton.addEventListener("click", () => moveWeek(-1));
    el.newWeekButton.addEventListener("click", openWeekDialog);
    el.monthlyExportButton.addEventListener("click", openMonthlyExportDialog);
    el.reloadButton.addEventListener("click", goToLatestWeek);
    el.saveButton.addEventListener("click", saveNow);
    el.zoomOutButton.addEventListener("click", () => stepReportZoom(-1));
    el.zoomInButton.addEventListener("click", () => stepReportZoom(1));
    el.zoomResetButton.addEventListener("click", () => setReportZoom(1));
    el.addDecisionButton.addEventListener("click", () => openDecisionDialog());

    document.querySelectorAll("[data-kpi-scope]").forEach(button => {
      button.addEventListener("click", () => {
        state.kpiScope = button.dataset.kpiScope;
        document.querySelectorAll("[data-kpi-scope]").forEach(item => item.classList.toggle("active", item === button));
        document.querySelectorAll("[data-view-target]").forEach(item => {
          const targetScope = item.dataset.viewTarget === "all-kpi" ? "all" : item.dataset.viewTarget === "month-kpi" ? "month" : "work";
          item.classList.toggle("active", targetScope === state.kpiScope);
        });
        renderKpi();
      });
    });

    document.querySelectorAll("[data-view-target]").forEach(button => {
      button.addEventListener("click", () => activateViewTab(button.dataset.viewTarget));
    });

    document.addEventListener("focusin", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.collabKey) {
        const [entityType, entityId, field] = target.dataset.collabKey.split("::");
        setPresenceEditing(entityType, entityId, field).catch(() => {});
      }
    });

    document.addEventListener("focusout", event => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.collabKey) {
        window.setTimeout(() => {
          const active = document.activeElement;
          if (!(active instanceof HTMLElement) || active.dataset.collabKey !== target.dataset.collabKey) {
            clearPresenceEditing().catch(() => {});
          }
        }, 60);
      }
      if (target.matches("dialog input, dialog textarea, dialog select")) return;
      if (target.matches(".task-field, .project-name-input, .kpi-actual-input, .kpi-note-input")) scheduleAutoSave(true);
    });

    document.querySelectorAll("[data-close-dialog]").forEach(button => {
      button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog).close());
    });

    el.projectForm.addEventListener("submit", addProjectFromDialog);
    el.taskForm.addEventListener("submit", saveTaskFromDialog);
    el.deleteTaskButton.addEventListener("click", deleteTaskFromDialog);
    el.decisionForm.addEventListener("submit", saveDecisionFromDialog);
    el.deleteDecisionButton.addEventListener("click", deleteDecisionFromDialog);
    el.weekForm.addEventListener("submit", createWeekFromDialog);
    el.monthlyExportForm.addEventListener("submit", exportMonthlyPerformance);
    [el.monthlyExportOwner, el.monthlyExportYear, el.monthlyExportMonth].forEach(control => control.addEventListener("change", updateMonthlyExportCount));

    window.addEventListener("beforeunload", event => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden" || !state.dirty || state.demoMode || !state.token || state.authenticating) return;
      scheduleAutoSave(true);
    });
  }

  async function loadData() {
    setLoading(true, "주간보고 데이터를 불러오는 중입니다.");
    try {
      const data = state.demoMode ? loadDemoStore() : await loadSheetsData();
      assignData(data);
      setDirty(false);
      state.remoteSnapshot = deepClone(serializableData());
      render();
      setStatus(state.demoMode ? "데모 데이터 로드 완료" : "Google Sheets 연결 완료");
      if (!state.demoMode && state.token) startCollaborationRuntime().catch(handleError);
    } finally {
      setLoading(false);
    }
  }

  function loadDemoStore() {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (!saved) {
        const initial = deepClone(SEED);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(saved);
      return parsed.criteria?.length ? parsed : deepClone(SEED);
    } catch (_) {
      return deepClone(SEED);
    }
  }

  function assignData(data) {
    state.weeks = normalizeRows(data.weeks || [], "weeks");
    state.tasks = normalizeRows(data.tasks || [], "tasks").filter(task => OWNER_ORDER.includes(task.owner));
    ensureLocalStableIds(state.tasks, "tasks", "TASK");
    normalizeTaskTitles();
    state.kpis = normalizeRows(data.kpis || [], "kpis").filter(kpi => OWNER_ORDER.includes(kpi.owner));
    ensureLocalStableIds(state.kpis, "kpis", "KPI");
    state.criteria = normalizeRows(data.criteria || [], "criteria").filter(item => OWNER_ORDER.includes(item.owner) && item.active !== "N");
    state.decisions = normalizeRows(data.decisions || [], "decisions");
    ensureLocalStableIds(state.decisions, "decisions", "DEC");
    const weeks = sortedWeeks();
    if (!state.currentWeekId || !weeks.some(week => week.week_id === state.currentWeekId)) {
      state.currentWeekId = weeks[0]?.week_id || null;
    }
  }

  function normalizeRows(rows, key) {
    return rows
      .filter(row => String(row?.deleted || "N").toUpperCase() !== "Y")
      .map(row => {
        const item = { ...row };
        delete item.deleted;
        if (key === "tasks") {
          item.project_order = num(item.project_order, 1);
          item.sort_order = num(item.sort_order, 1);
          item.kpi_qty = num(item.kpi_qty, 0);
          item.title = stripTaskMarker(item.title);
        } else if (key === "kpis") {
          item.actual = num(item.actual, 0);
          item.legacy_target = num(item.legacy_target, 0);
          item.sort_order = num(item.sort_order, 1);
        } else if (key === "criteria") {
          item.weight = num(item.weight, 0);
          item.annual_target = num(item.annual_target, 0);
          for (let month = 1; month <= 12; month += 1) item[`m${month}_target`] = num(item[`m${month}_target`], 0);
          item.sort_order = num(item.sort_order, 1);
        } else if (key === "decisions") {
          item.sort_order = num(item.sort_order, 1);
        }
        return item;
      });
  }

  function ensureLocalStableIds(rows, key, prefix) {
    const idField = KEY_FIELD[key];
    if (!idField) return;
    const seen = new Set();
    rows.forEach(row => {
      let value = String(row[idField] ?? "").trim();
      if (!value || seen.has(value)) {
        value = makeId(prefix);
        row[idField] = value;
      }
      seen.add(value);
    });
  }

  function render() {
    renderWeekSelector();
    renderHeader();
    renderOwners();
    renderKpi();
    renderDecisions();
    autoResizeAll();
    applyReportZoom();
  }

  function renderWeekSelector() {
    const weeks = sortedWeeks();
    el.weekSelect.innerHTML = "";
    weeks.forEach(week => {
      const option = document.createElement("option");
      option.value = week.week_id;
      option.textContent = `${formatDate(week.start_date)} ~ ${formatDate(week.end_date)}`;
      option.selected = week.week_id === state.currentWeekId;
      el.weekSelect.appendChild(option);
    });
    const index = weeks.findIndex(week => week.week_id === state.currentWeekId);
    el.prevWeekButton.disabled = index >= weeks.length - 1;
    el.nextWeekButton.disabled = index <= 0;
  }

  function renderHeader() {
    const week = currentWeek();
    if (!week) {
      el.reportMeta.textContent = "등록된 주차가 없습니다.";
      return;
    }
    el.reportTitle.textContent = `${CONFIG.TEAM_NAME || "플랫폼기획팀"} 주간보고`;
    el.reportMeta.textContent = `${formatDateLong(week.start_date)} ~ ${formatDateLong(week.end_date)} · ${week.week_id}`;
  }

  function renderOwners() {
    el.ownerSections.innerHTML = "";
    OWNER_ORDER.forEach((owner, ownerPosition) => {
      const section = document.createElement("section");
      section.className = "owner-section";
      section.dataset.owner = owner;

      const ownerTasks = visibleTasks().filter(task => task.owner === owner);
      const projects = getProjects(ownerTasks);

      const header = document.createElement("header");
      header.className = "owner-header";
      const title = document.createElement("div");
      title.className = "owner-title";
      title.innerHTML = `<span class="owner-index">${String(ownerPosition + 1).padStart(2, "0")}</span><span class="owner-name"></span><span class="owner-project-count"></span>`;
      title.querySelector(".owner-name").textContent = owner;
      title.querySelector(".owner-project-count").textContent = `${projects.length}개 프로젝트`;
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "button small add-project-button no-print";
      addButton.textContent = "+ 프로젝트";
      addButton.addEventListener("click", () => openProjectDialog(owner));
      header.append(title, addButton);

      const projectList = document.createElement("div");
      projectList.className = "project-list";
      projectList.dataset.owner = owner;
      if (!projects.length) {
        const empty = document.createElement("div");
        empty.className = "empty-owner";
        empty.textContent = "등록된 프로젝트가 없습니다. 담당자 옆 + 프로젝트 버튼으로 추가하세요.";
        projectList.appendChild(empty);
      } else {
        projects.forEach(project => projectList.appendChild(buildProject(owner, project)));
      }
      section.append(header, projectList);
      el.ownerSections.appendChild(section);
    });
    autoResizeAll();
  }

  function getProjects(ownerTasks) {
    const map = new Map();
    ownerTasks.forEach(task => {
      if (!map.has(task.project)) map.set(task.project, { name: task.project, order: num(task.project_order, 999), first: num(task.sort_order, 999) });
      const project = map.get(task.project);
      project.order = Math.min(project.order, num(task.project_order, 999));
      project.first = Math.min(project.first, num(task.sort_order, 999));
    });
    return [...map.values()].sort((a, b) => a.order - b.order || a.first - b.first || a.name.localeCompare(b.name, "ko"));
  }

  function buildProject(owner, project) {
    const article = document.createElement("article");
    article.className = "project-block";
    article.dataset.owner = owner;
    article.dataset.project = project.name;

    const rail = document.createElement("aside");
    rail.className = "project-rail";

    const handle = dragHandle("프로젝트 순서 변경");
    handle.classList.add("project-drag-handle");
    handle.addEventListener("dragstart", event => startProjectDrag(event, owner, project.name, article));
    handle.addEventListener("dragend", () => finishDrag(article));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "project-delete-button no-print";
    remove.textContent = "삭제";
    remove.title = `${project.name} 프로젝트 삭제`;
    remove.addEventListener("click", () => deleteProject(owner, project.name));

    const projectInput = document.createElement("textarea");
    projectInput.className = "project-name-input auto-grow";
    projectInput.rows = 1;
    projectInput.value = project.name;
    projectInput.title = project.name;
    projectInput.setAttribute("aria-label", `${owner} 프로젝트명`);
    projectInput.dataset.collabKey = `project::${owner}|${project.name}::project`;
    projectInput.addEventListener("focus", () => { projectInput.dataset.editBaseline = project.name; });
    projectInput.addEventListener("change", () => renameProject(owner, project.name, projectInput.value.trim(), projectInput));

    rail.append(handle, projectInput, remove);

    article.addEventListener("dragover", event => dragOverProject(event, article));
    article.addEventListener("dragleave", () => article.classList.remove("drag-over"));
    article.addEventListener("drop", event => dropProject(event, owner, project.name, article));

    const periodGrid = document.createElement("div");
    periodGrid.className = "period-grid";
    periodGrid.append(
      buildPeriodPane(owner, project.name, "금주"),
      Object.assign(document.createElement("div"), { className: "period-divider" }),
      buildPeriodPane(owner, project.name, "차주")
    );
    article.append(rail, periodGrid);
    return article;
  }

  function buildPeriodPane(owner, project, period) {
    const pane = document.createElement("section");
    pane.className = `period-pane ${period === "금주" ? "current" : "next"}`;
    const week = currentWeek();
    const title = document.createElement("div");
    title.className = "period-title";
    const periodRange = period === "금주"
      ? `${formatDate(week?.start_date)} ~ ${formatDate(week?.end_date)}`
      : nextWeekRange(week);
    const titleLeft = document.createElement("div");
    titleLeft.className = "period-title-left";
    const periodName = document.createElement("span");
    periodName.className = "period-name";
    periodName.textContent = period;
    const addTaskButton = document.createElement("button");
    addTaskButton.type = "button";
    addTaskButton.className = "period-add-task no-print";
    addTaskButton.textContent = "+ 작업";
    addTaskButton.title = `${period} 작업 바로 추가`;
    addTaskButton.addEventListener("click", () => addInlineTask(owner, project, period));
    titleLeft.append(periodName, addTaskButton);
    const rangeLabel = document.createElement("span");
    rangeLabel.className = "period-range";
    rangeLabel.textContent = periodRange;
    title.append(titleLeft, rangeLabel);

    const columns = document.createElement("div");
    columns.className = "period-columns";
    columns.innerHTML = `
      <span class="column-spacer" aria-hidden="true"></span>
      <span>작업명</span>
      <span>상세</span>
      <span>완료/예정일</span>
      <span class="column-spacer" aria-hidden="true"></span>
    `;

    const list = document.createElement("div");
    list.className = "task-list";
    list.dataset.owner = owner;
    list.dataset.project = project;
    list.dataset.period = period;
    const tasks = visibleTasks()
      .filter(task => task.owner === owner && task.project === project && task.period === period)
      .sort((a, b) => num(a.sort_order) - num(b.sort_order));
    if (!tasks.length) {
      const empty = document.createElement("div");
      empty.className = "empty-task-list";
      empty.textContent = "등록된 작업 없음";
      list.appendChild(empty);
    } else {
      splitConsecutiveTaskRuns(tasks).forEach(run => {
        list.appendChild(run.length > 1 ? buildMergedTaskGroup(run) : buildTaskCard(run[0]));
      });
    }
    list.addEventListener("dragover", event => dragOverTaskList(event, list));
    list.addEventListener("dragleave", event => { if (!list.contains(event.relatedTarget)) list.classList.remove("drag-over"); });
    list.addEventListener("drop", event => dropTaskAtEnd(event, list));
    pane.append(title, columns, list);
    return pane;
  }

  function splitConsecutiveTaskRuns(tasks) {
    const runs = [];
    tasks.forEach(task => {
      const title = normalizedTaskTitle(task);
      const lastRun = runs[runs.length - 1];
      const lastTitle = lastRun?.length ? normalizedTaskTitle(lastRun[0]) : "";
      if (title && lastRun && title === lastTitle) lastRun.push(task);
      else runs.push([task]);
    });
    return runs;
  }

  function normalizedTaskTitle(task) {
    return stripTaskMarker(task?.title || "").trim();
  }

  function buildMergedTaskGroup(tasks) {
    const group = document.createElement("div");
    group.className = "task-merge-group";
    group.dataset.mergedTitle = normalizedTaskTitle(tasks[0]);
    group.dataset.mergedCount = String(tasks.length);
    group.style.setProperty("--merged-row-count", String(tasks.length));

    const mergedTitle = document.createElement("div");
    mergedTitle.className = "task-title-wrap task-merge-title-cell";
    mergedTitle.style.gridRow = `1 / span ${tasks.length}`;

    const marker = document.createElement("span");
    marker.className = "task-title-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "■";

    const title = document.createElement("textarea");
    title.className = "task-field task-title-field task-merged-title-field auto-grow";
    title.rows = 1;
    title.value = normalizedTaskTitle(tasks[0]);
    title.placeholder = "작업명";
    title.setAttribute("aria-label", `${title.value} 공통 작업명`);
    bindMergedTaskTitle(title, tasks, group);

    mergedTitle.append(marker, title);
    group.appendChild(mergedTitle);

    tasks.forEach((task, index) => {
      group.appendChild(buildTaskCard(task, {
        merged: true,
        mergeIndex: index,
        mergeCount: tasks.length
      }));
    });
    return group;
  }

  function buildTaskCard(task, options = {}) {
    const card = document.createElement("div");
    card.className = `task-card${options.merged ? " task-card-merged" : ""}`;
    card.dataset.taskId = task.task_id;
    if (options.merged) {
      card.dataset.mergedTitle = normalizedTaskTitle(task);
      card.dataset.mergeIndex = String(options.mergeIndex || 0);
      card.style.gridRow = String((options.mergeIndex || 0) + 1);
    }

    const handle = dragHandle("작업 순서 변경");
    handle.classList.add("task-drag");
    handle.addEventListener("dragstart", event => startTaskDrag(event, task, card));
    handle.addEventListener("dragend", () => finishDrag(card));

    const titleWrap = document.createElement("div");
    titleWrap.className = `task-title-wrap${options.merged ? " task-title-slot" : ""}`;
    const marker = document.createElement("span");
    marker.className = "task-title-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "■";
    const title = document.createElement("textarea");
    title.className = "task-field task-title-field auto-grow";
    title.rows = 1;
    title.value = stripTaskMarker(task.title || "");
    title.placeholder = "작업명";
    bindTaskField(title, task, "title");
    titleWrap.append(marker, title);

    const detailsCell = document.createElement("div");
    detailsCell.className = "task-cell task-details-cell";
    const details = document.createElement("textarea");
    details.className = "task-field task-details-field auto-grow";
    details.rows = 1;
    details.value = task.details || "";
    details.placeholder = "상세 내용";
    bindTaskField(details, task, "details");
    detailsCell.appendChild(details);

    const dueCell = document.createElement("div");
    dueCell.className = "task-cell task-date-cell";
    const due = document.createElement("textarea");
    due.className = "task-field task-date-field auto-grow";
    due.rows = 1;
    due.maxLength = 14;
    due.placeholder = "00/00(월)";
    due.value = task.due_date || "";
    bindTaskField(due, task, "due_date");
    dueCell.appendChild(due);

    const menu = document.createElement("button");
    menu.type = "button";
    menu.className = "task-menu-button no-print";
    menu.title = "작업 설정";
    menu.textContent = "⋯";
    menu.addEventListener("click", () => openTaskDialog({ taskId: task.task_id }));

    card.addEventListener("dragover", event => dragOverTask(event, task, card));
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", event => dropTaskOnTask(event, task, card));
    card.append(handle, titleWrap, detailsCell, dueCell, menu);
    return card;
  }

  function bindMergedTaskTitle(control, tasks, group) {
    const baseline = normalizedTaskTitle(tasks[0]);
    control.dataset.collabKey = `task::${tasks.map(task => task.task_id).join(",")}::title`;
    control.addEventListener("focus", () => { control.dataset.editBaseline = normalizedTaskTitle(tasks[0]); });
    control.addEventListener("input", () => {
      const value = stripTaskMarker(control.value);
      if (control.value !== value) control.value = value;
      tasks.forEach(task => { task.title = value; });
      group.dataset.mergedTitle = value.trim();
      group.querySelectorAll(".task-title-slot .task-title-field").forEach(field => {
        field.value = value;
        autoResize(field);
      });
      touch();
      autoResize(control);
    });
    control.addEventListener("blur", () => scheduleAutoSave(true));
  }

  function bindTaskField(control, task, field) {
    const eventName = control.tagName === "TEXTAREA" ? "input" : "change";
    control.dataset.collabKey = `task::${task.task_id}::${field}`;
    control.addEventListener("focus", () => { control.dataset.editBaseline = String(task[field] ?? ""); });
    control.addEventListener(eventName, () => {
      const value = field === "title" ? stripTaskMarker(control.value) : control.value;
      task[field] = value;
      if (field === "title" && control.value !== value) control.value = value;
      touch();
      if (control.tagName === "TEXTAREA") autoResize(control);
    });
    control.addEventListener("blur", () => scheduleAutoSave(true));
  }

  function dragHandle(label) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "drag-handle no-print";
    handle.draggable = true;
    handle.title = label;
    handle.setAttribute("aria-label", label);
    handle.textContent = "⋮⋮";
    return handle;
  }

  function startProjectDrag(event, owner, project, article) {
    state.drag = { type: "project", owner, project };
    article.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `project:${owner}:${project}`);
    setDragPreview(event, article, "project");
  }

  function dragOverProject(event, article) {
    if (state.drag?.type !== "project" || state.drag.owner !== article.dataset.owner || state.drag.project === article.dataset.project) return;
    event.preventDefault();
    article.classList.add("drag-over");
  }

  function dropProject(event, owner, targetProject, article) {
    if (state.drag?.type !== "project" || state.drag.owner !== owner) return;
    event.preventDefault();
    article.classList.remove("drag-over");
    reorderProject(owner, state.drag.project, targetProject);
  }

  function reorderProject(owner, sourceProject, targetProject) {
    const projects = getProjects(visibleTasks().filter(task => task.owner === owner)).map(item => item.name);
    const sourceIndex = projects.indexOf(sourceProject);
    const targetIndex = projects.indexOf(targetProject);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    projects.splice(targetIndex, 0, projects.splice(sourceIndex, 1)[0]);
    visibleTasks().filter(task => task.owner === owner).forEach(task => {
      task.project_order = projects.indexOf(task.project) + 1;
    });
    touch({ immediate: true });
    renderOwners();
  }

  function startTaskDrag(event, task, card) {
    state.drag = { type: "task", taskId: task.task_id, owner: task.owner, project: task.project, period: task.period };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `task:${task.task_id}`);
    setDragPreview(event, card, "task");
  }

  function dragOverTask(event, targetTask, card) {
    if (!sameTaskGroup(targetTask) || state.drag.taskId === targetTask.task_id) return;
    event.preventDefault();
    card.classList.add("drag-over");
  }

  function dropTaskOnTask(event, targetTask, card) {
    if (!sameTaskGroup(targetTask)) return;
    event.preventDefault();
    event.stopPropagation();
    card.classList.remove("drag-over");
    reorderTask(state.drag.taskId, targetTask.task_id);
  }

  function dragOverTaskList(event, list) {
    if (state.drag?.type !== "task") return;
    if (state.drag.owner !== list.dataset.owner || state.drag.project !== list.dataset.project || state.drag.period !== list.dataset.period) return;
    event.preventDefault();
    list.classList.add("drag-over");
  }

  function dropTaskAtEnd(event, list) {
    if (state.drag?.type !== "task") return;
    if (state.drag.owner !== list.dataset.owner || state.drag.project !== list.dataset.project || state.drag.period !== list.dataset.period) return;
    event.preventDefault();
    list.classList.remove("drag-over");
    const group = taskGroup(state.drag.owner, state.drag.project, state.drag.period);
    const source = group.find(task => task.task_id === state.drag.taskId);
    if (!source || group[group.length - 1]?.task_id === source.task_id) return;
    const ordered = group.filter(task => task.task_id !== source.task_id);
    ordered.push(source);
    ordered.forEach((task, index) => { task.sort_order = index + 1; });
    touch({ immediate: true });
    renderOwners();
  }

  function sameTaskGroup(targetTask) {
    return state.drag?.type === "task" && state.drag.owner === targetTask.owner && state.drag.project === targetTask.project && state.drag.period === targetTask.period;
  }

  function reorderTask(sourceId, targetId) {
    const source = state.tasks.find(task => task.task_id === sourceId);
    const target = state.tasks.find(task => task.task_id === targetId);
    if (!source || !target || !sameTaskGroup(target)) return;
    const group = taskGroup(source.owner, source.project, source.period);
    const sourceIndex = group.findIndex(task => task.task_id === sourceId);
    const targetIndex = group.findIndex(task => task.task_id === targetId);
    group.splice(targetIndex, 0, group.splice(sourceIndex, 1)[0]);
    group.forEach((task, index) => { task.sort_order = index + 1; });
    touch({ immediate: true });
    renderOwners();
  }

  function taskGroup(owner, project, period) {
    return visibleTasks().filter(task => task.owner === owner && task.project === project && task.period === period).sort((a, b) => num(a.sort_order) - num(b.sort_order));
  }

  function setDragPreview(event, source, type) {
    if (!event.dataTransfer || !source) return;
    const preview = source.cloneNode(true);
    preview.classList.remove("dragging", "drag-over");
    preview.classList.add("drag-preview", `${type}-drag-preview`);

    if (source.classList.contains("task-card-merged")) {
      const mergedGroup = source.closest(".task-merge-group");
      preview.classList.remove("task-card-merged");
      preview.style.gridRow = "";
      preview.style.gridColumn = "";
      preview.style.gridTemplateColumns = mergedGroup ? getComputedStyle(mergedGroup).gridTemplateColumns : "";
      const titleSlot = preview.querySelector(".task-title-slot");
      titleSlot?.classList.remove("task-title-slot");
    }

    const sourceTextareas = [...source.querySelectorAll("textarea")];
    const previewTextareas = [...preview.querySelectorAll("textarea")];
    previewTextareas.forEach((control, index) => {
      const original = sourceTextareas[index];
      if (!original) return;
      control.value = original.value;
      control.style.height = `${Math.max(38, original.offsetHeight, original.scrollHeight)}px`;
      control.style.overflow = "hidden";
    });
    const sourceInputs = [...source.querySelectorAll("input")];
    const previewInputs = [...preview.querySelectorAll("input")];
    previewInputs.forEach((control, index) => {
      if (sourceInputs[index]) control.value = sourceInputs[index].value;
    });

    const rect = source.getBoundingClientRect();
    const maxWidth = Math.max(320, window.innerWidth * 0.88);
    preview.style.width = `${Math.min(rect.width, maxWidth)}px`;
    preview.style.minHeight = `${Math.min(rect.height, window.innerHeight * 0.72)}px`;
    preview.style.maxHeight = `${Math.max(120, window.innerHeight * 0.72)}px`;
    document.body.appendChild(preview);

    const offsetX = Math.max(12, Math.min(event.clientX - rect.left, Math.min(rect.width, maxWidth) - 12));
    const offsetY = Math.max(12, Math.min(event.clientY - rect.top, Math.min(rect.height, window.innerHeight * 0.72) - 12));
    event.dataTransfer.setDragImage(preview, offsetX, offsetY);
    if (state.drag) state.drag.preview = preview;
  }

  function finishDrag(element) {
    state.drag?.preview?.remove();
    element?.classList.remove("dragging", "drag-over");
    document.querySelectorAll(".drag-over").forEach(item => item.classList.remove("drag-over"));
    state.drag = null;
  }

  function renameProject(owner, oldName, newName, input) {
    if (!newName) {
      input.value = oldName;
      return;
    }
    const duplicate = visibleTasks().some(task => task.owner === owner && task.project === newName && task.project !== oldName);
    if (duplicate) {
      showToast("같은 담당자에게 동일한 프로젝트명이 이미 있습니다.", true);
      input.value = oldName;
      return;
    }
    visibleTasks().filter(task => task.owner === owner && task.project === oldName).forEach(task => { task.project = newName; });
    touch({ immediate: true });
    renderOwners();
  }

  function deleteProject(owner, project) {
    if (!window.confirm(`${owner}의 '${project}' 프로젝트와 포함 작업을 삭제할까요?`)) return;
    state.tasks = state.tasks.filter(task => !(task.week_id === state.currentWeekId && task.owner === owner && task.project === project));
    normalizeProjectOrders(owner);
    touch({ immediate: true });
    renderOwners();
    renderKpi();
  }

  function openProjectDialog(owner) {
    el.projectOwner.value = owner;
    el.projectName.value = "";
    el.projectDialog.showModal();
    setTimeout(() => el.projectName.focus(), 50);
  }

  function addProjectFromDialog(event) {
    event.preventDefault();
    const owner = el.projectOwner.value;
    const project = el.projectName.value.trim();
    if (!project) return;
    if (visibleTasks().some(task => task.owner === owner && task.project === project)) {
      showToast("동일한 프로젝트가 이미 있습니다.", true);
      return;
    }
    const order = getProjects(visibleTasks().filter(task => task.owner === owner)).length + 1;
    state.tasks.push(newTask({ owner, project, project_order: order, period: "금주", title: "", details: "" }));
    touch({ immediate: true });
    el.projectDialog.close();
    renderOwners();
  }

  function addInlineTask(owner, project, period) {
    if (!state.currentWeekId) {
      showToast("먼저 보고 주차를 선택해 주세요.", true);
      return;
    }
    const task = newTask({ owner, project, period, title: "", details: "", due_date: "" });
    state.tasks.push(task);
    touch({ immediate: true });
    renderOwners();
    renderKpi();
    requestAnimationFrame(() => {
      const card = document.querySelector(`.task-card[data-task-id="${task.task_id}"]`);
      const titleField = card?.querySelector(".task-title-field");
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      titleField?.focus();
    });
  }

  function openTaskDialog(prefill = {}) {
    const task = prefill.taskId ? state.tasks.find(item => item.task_id === prefill.taskId) : null;
    el.taskDialogTitle.textContent = task ? "작업 설정" : "작업 추가";
    el.taskId.value = task?.task_id || "";
    el.taskOwner.value = task?.owner || prefill.owner || "";
    el.taskProject.value = task?.project || prefill.project || "";
    el.taskPeriod.value = task?.period || prefill.period || "금주";
    el.taskDueDate.value = task?.due_date || "";
    el.taskTitle.value = stripTaskMarker(task?.title || "");
    el.taskDetails.value = task?.details || "";
    el.taskKpiQty.value = num(task?.kpi_qty, 0);
    populateKpiOptions(el.taskOwner.value, task?.kpi_code || "");
    el.deleteTaskButton.classList.toggle("hidden", !task);
    el.taskDialog.showModal();
  }

  function populateKpiOptions(owner, selected) {
    el.taskKpiSelect.innerHTML = '<option value="">반영 안 함</option>';
    state.criteria.filter(item => item.owner === owner).sort(sortCriteria).forEach(item => {
      const option = document.createElement("option");
      option.value = item.kpi_code;
      option.textContent = item.kpi_name;
      option.selected = item.kpi_code === selected;
      el.taskKpiSelect.appendChild(option);
    });
  }

  function saveTaskFromDialog(event) {
    event.preventDefault();
    const existing = el.taskId.value ? state.tasks.find(item => item.task_id === el.taskId.value) : null;
    if (existing) {
      existing.period = el.taskPeriod.value;
      existing.due_date = el.taskDueDate.value.trim();
      existing.title = stripTaskMarker(el.taskTitle.value);
      existing.details = el.taskDetails.value;
      existing.kpi_code = el.taskKpiSelect.value;
      existing.kpi_qty = num(el.taskKpiQty.value, 0);
    } else {
      state.tasks.push(newTask({
        owner: el.taskOwner.value,
        project: el.taskProject.value,
        period: el.taskPeriod.value,
        due_date: el.taskDueDate.value.trim(),
        title: stripTaskMarker(el.taskTitle.value),
        details: el.taskDetails.value,
        kpi_code: el.taskKpiSelect.value,
        kpi_qty: num(el.taskKpiQty.value, 0)
      }));
    }
    touch({ immediate: true });
    el.taskDialog.close();
    renderOwners();
    renderKpi();
  }

  function newTask(input) {
    const projectOrder = input.project_order || getProjectOrder(input.owner, input.project) || getProjects(visibleTasks().filter(task => task.owner === input.owner)).length + 1;
    const order = taskGroup(input.owner, input.project, input.period || "금주").length + 1;
    return {
      task_id: makeId("TASK"), week_id: state.currentWeekId, owner: input.owner, project: input.project,
      project_order: projectOrder, period: input.period || "금주", title: stripTaskMarker(input.title || ""), details: input.details || "",
      due_date: input.due_date || "", sort_order: order, kpi_code: input.kpi_code || "", kpi_qty: num(input.kpi_qty, 0),
      updated_at: timestamp(), updated_by: state.userEmail || "web"
    };
  }

  function deleteTaskFromDialog() {
    const index = state.tasks.findIndex(item => item.task_id === el.taskId.value);
    const task = index >= 0 ? state.tasks[index] : null;
    if (!task || !window.confirm("이 작업을 삭제할까요?")) return;
    state.tasks.splice(index, 1);
    normalizeTaskOrders(task.owner, task.project, task.period);
    touch({ immediate: true });
    el.taskDialog.close();
    renderOwners();
    renderKpi();
  }

  function getProjectOrder(owner, project) {
    return visibleTasks().filter(task => task.owner === owner && task.project === project).reduce((min, task) => Math.min(min, num(task.project_order, 999)), 999);
  }

  function normalizeTaskOrders(owner, project, period) {
    taskGroup(owner, project, period).forEach((task, index) => { task.sort_order = index + 1; });
  }

  function normalizeProjectOrders(owner) {
    getProjects(visibleTasks().filter(task => task.owner === owner)).forEach((project, index) => {
      visibleTasks().filter(task => task.owner === owner && task.project === project.name).forEach(task => { task.project_order = index + 1; });
    });
  }

  function renderKpi() {
    const week = currentWeek();
    if (!week) return;
    const scopeWeeks = getKpiScopeWeeks();
    el.kpiScopeLabel.textContent = getKpiScopeLabel(scopeWeeks);
    el.kpiTableBody.innerHTML = "";

    const rows = buildKpiRows(scopeWeeks, state.kpiScope);
    const selectedMetrics = summarizeKpiRows(rows);
    const weekMetrics = summarizeKpiRows(buildKpiRows([week], "week"));
    const monthWeeks = state.weeks.filter(item => monthKey(item) === monthKey(week));
    const monthMetrics = summarizeKpiRows(buildKpiRows(monthWeeks, "month"));
    const annualWeeks = getAnnualWeeks(week);
    const allMetrics = summarizeKpiRows(buildKpiRows(annualWeeks, "all"));

    el.kpiSummaryCards.innerHTML = "";
    [
      ["주차 KPI 달성률", formatPercent(weekMetrics.weightedRate), state.kpiScope === "week"],
      ["월 KPI 달성률", formatPercent(monthMetrics.weightedRate), state.kpiScope === "month"],
      ["전체 KPI 달성률 (1~12월)", formatPercent(allMetrics.weightedRate), state.kpiScope === "all"],
      ["선택 범위 목표 달성", `${selectedMetrics.reached} / ${rows.length}`, false]
    ].forEach(([cardLabel, value, accent]) => {
      const card = document.createElement("div");
      card.className = `kpi-card${accent ? " accent" : ""}`;
      card.innerHTML = `<span class="kpi-card-label"></span><strong></strong>`;
      card.querySelector("span").textContent = cardLabel;
      card.querySelector("strong").textContent = value;
      el.kpiSummaryCards.appendChild(card);
    });

    rows.forEach(row => {
      const tr = document.createElement("tr");
      const nameCell = document.createElement("td");
      nameCell.innerHTML = '<span class="kpi-name"></span><span class="kpi-category"></span>';
      nameCell.querySelector(".kpi-name").textContent = row.criterion.kpi_name;
      nameCell.querySelector(".kpi-category").textContent = row.criterion.category || "";
      const ownerCell = textCell(row.criterion.owner);
      const weightCell = textCell(formatPercent(row.criterion.weight));
      const targetCell = textCell(displayNumber(row.target));
      const actualCell = document.createElement("td");
      const noteCell = document.createElement("td");

      if (state.kpiScope === "week") {
        const input = document.createElement("input");
        input.type = "number";
        input.step = "1";
        input.className = "kpi-actual-input";
        input.value = row.actual;
        input.dataset.collabKey = `kpi::${state.currentWeekId}|${row.criterion.owner}|${row.criterion.kpi_code}::actual`;
        input.addEventListener("change", () => setWeekKpi(row.criterion, { actual: num(input.value, 0) }, { immediate: true }));
        input.addEventListener("blur", () => scheduleAutoSave(true));
        actualCell.appendChild(input);
        const note = document.createElement("textarea");
        note.className = "kpi-note-input auto-grow";
        note.dataset.collabKey = `kpi::${state.currentWeekId}|${row.criterion.owner}|${row.criterion.kpi_code}::note`;
        note.rows = 1;
        note.value = getWeekKpiRow(row.criterion)?.note || "";
        note.placeholder = "비고";
        note.addEventListener("input", () => {
          autoResize(note);
          setWeekKpi(row.criterion, { note: note.value }, { render: false });
        });
        note.addEventListener("change", () => setWeekKpi(row.criterion, { note: note.value }, { render: false }));
        note.addEventListener("blur", () => scheduleAutoSave(true));
        noteCell.appendChild(note);
        requestAnimationFrame(() => autoResize(note));
      } else {
        actualCell.textContent = displayNumber(row.actual);
        noteCell.textContent = "—";
      }

      const rateCell = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `rate-pill ${row.rate >= 1 ? "good" : row.rate >= .7 ? "warn" : "low"}`;
      pill.textContent = formatPercent(row.rate);
      rateCell.appendChild(pill);
      tr.append(nameCell, ownerCell, weightCell, targetCell, actualCell, rateCell, noteCell);
      el.kpiTableBody.appendChild(tr);
    });
  }

  function buildKpiRows(scopeWeeks, targetScope = "all") {
    return state.criteria.slice().sort(sortCriteria).map(criterion => {
      const target = getKpiTargetForWeeks(criterion, scopeWeeks, targetScope);
      const actual = scopeWeeks.reduce((sum, item) => sum + getWeekActual(criterion, item.week_id), 0);
      const rate = target > 0 ? actual / target : actual > 0 ? 1 : 0;
      return { criterion, target, actual, rate };
    });
  }

  function summarizeKpiRows(rows) {
    const weightedDenominator = rows.reduce((sum, row) => sum + row.criterion.weight, 0);
    return {
      target: rows.reduce((sum, row) => sum + row.target, 0),
      actual: rows.reduce((sum, row) => sum + row.actual, 0),
      reached: rows.filter(row => row.rate >= 1).length,
      weightedRate: weightedDenominator > 0
        ? rows.reduce((sum, row) => sum + row.rate * row.criterion.weight, 0) / weightedDenominator
        : 0
    };
  }

  function getAnnualWeeks(referenceWeek) {
    const year = parseIso(referenceWeek.end_date).getFullYear();
    return state.weeks
      .filter(item => parseIso(item.end_date).getFullYear() === year)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  function getKpiScopeWeeks() {
    const week = currentWeek();
    if (!week) return [];
    if (state.kpiScope === "week") return [week];
    if (state.kpiScope === "month") {
      const key = monthKey(week);
      return state.weeks.filter(item => monthKey(item) === key).sort((a, b) => a.start_date.localeCompare(b.start_date));
    }
    const year = parseIso(week.end_date).getFullYear();
    return state.weeks
      .filter(item => parseIso(item.end_date).getFullYear() === year)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  function getKpiScopeLabel(scopeWeeks) {
    const week = currentWeek();
    if (!week) return "";
    if (state.kpiScope === "week") return `${formatDate(week.start_date)} ~ ${formatDate(week.end_date)} 주차 · 월 Target 주차 배분`;
    if (state.kpiScope === "month") {
      const end = parseIso(week.end_date);
      return `${end.getFullYear()}년 ${end.getMonth() + 1}월 · 정량지표 월 Target`;
    }
    const year = parseIso(week.end_date).getFullYear();
    return `${year}년 1월 ~ 12월 통합 · 정량지표 연간 Target`;
  }

  function getKpiTargetForWeeks(criterion, scopeWeeks, targetScope) {
    const week = currentWeek();
    if (!week) return 0;
    if (targetScope === "week") {
      const end = parseIso(scopeWeeks[0]?.end_date || week.end_date);
      const monthTarget = num(criterion[`m${end.getMonth() + 1}_target`], 0);
      return monthTarget / countFridays(end.getFullYear(), end.getMonth() + 1);
    }
    if (targetScope === "month") {
      const end = parseIso(week.end_date);
      return num(criterion[`m${end.getMonth() + 1}_target`], 0);
    }
    const monthlyTarget = Array.from({ length: 12 }, (_, index) => num(criterion[`m${index + 1}_target`], 0))
      .reduce((sum, value) => sum + value, 0);
    return monthlyTarget || num(criterion.annual_target, 0);
  }

  function countFridays(year, month) {
    let count = 0;
    const last = new Date(year, month, 0).getDate();
    for (let day = 1; day <= last; day += 1) if (new Date(year, month - 1, day).getDay() === 5) count += 1;
    return Math.max(1, count);
  }

  function getWeekActual(criterion, weekId) {
    const row = state.kpis.find(item => item.week_id === weekId && item.kpi_code === criterion.kpi_code && item.owner === criterion.owner);
    if (row) return num(row.actual, 0);
    return state.tasks
      .filter(task => task.week_id === weekId && task.owner === criterion.owner && task.period === "금주" && task.kpi_code === criterion.kpi_code)
      .reduce((sum, task) => sum + num(task.kpi_qty, 0), 0);
  }

  function getWeekKpiRow(criterion) {
    return state.kpis.find(item => item.week_id === state.currentWeekId && item.kpi_code === criterion.kpi_code && item.owner === criterion.owner);
  }

  function setWeekKpi(criterion, patch, options = {}) {
    let row = getWeekKpiRow(criterion);
    if (!row) {
      row = {
        kpi_id: makeId("KPIROW"), week_id: state.currentWeekId, kpi_code: criterion.kpi_code,
        kpi_name: criterion.kpi_name, owner: criterion.owner, actual: 0, note: "", legacy_target: 0,
        sort_order: criterion.sort_order, updated_at: timestamp(), updated_by: state.userEmail || "web"
      };
      state.kpis.push(row);
    }
    Object.assign(row, patch, { updated_at: timestamp(), updated_by: state.userEmail || "web" });
    touch({ immediate: options.immediate === true });
    if (options.render !== false) renderKpi();
  }

  function renderDecisions() {
    el.decisionList.innerHTML = "";
    const rows = state.decisions.filter(item => item.week_id === state.currentWeekId).sort((a, b) => num(a.sort_order) - num(b.sort_order));
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "empty-decisions";
      empty.textContent = "등록된 의사결정 필요 사항이 없습니다.";
      el.decisionList.appendChild(empty);
      return;
    }
    rows.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "decision-card";
      card.append(
        decisionCell(String(index + 1), "decision-no"),
        decisionCell(item.item, "decision-item"),
        decisionCell(item.summary, "decision-summary"),
        decisionCell(item.decision, "decision-required"),
        decisionCell(item.note, "decision-note")
      );
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "decision-edit no-print";
      edit.textContent = "⋯";
      edit.addEventListener("click", () => openDecisionDialog(item.decision_id));
      card.appendChild(edit);
      el.decisionList.appendChild(card);
    });
  }

  function decisionCell(value, className) {
    const div = document.createElement("div");
    div.className = `decision-cell ${className}`;
    div.textContent = value || "";
    return div;
  }

  function openDecisionDialog(id = "") {
    const item = id ? state.decisions.find(row => row.decision_id === id) : null;
    el.decisionId.value = item?.decision_id || "";
    el.decisionItem.value = item?.item || "";
    el.decisionSummary.value = item?.summary || "";
    el.decisionRequired.value = item?.decision || "";
    el.decisionNote.value = item?.note || "";
    el.deleteDecisionButton.classList.toggle("hidden", !item);
    el.decisionDialog.showModal();
  }

  function saveDecisionFromDialog(event) {
    event.preventDefault();
    let item = el.decisionId.value ? state.decisions.find(row => row.decision_id === el.decisionId.value) : null;
    if (!item) {
      item = {
        decision_id: makeId("DEC"), week_id: state.currentWeekId,
        sort_order: state.decisions.filter(row => row.week_id === state.currentWeekId).length + 1,
        updated_at: timestamp(), updated_by: state.userEmail || "web"
      };
      state.decisions.push(item);
    }
    Object.assign(item, {
      item: el.decisionItem.value, summary: el.decisionSummary.value, decision: el.decisionRequired.value,
      note: el.decisionNote.value, updated_at: timestamp(), updated_by: state.userEmail || "web"
    });
    touch({ immediate: true });
    el.decisionDialog.close();
    renderDecisions();
  }

  function deleteDecisionFromDialog() {
    const index = state.decisions.findIndex(row => row.decision_id === el.decisionId.value);
    const item = index >= 0 ? state.decisions[index] : null;
    if (!item || !window.confirm("이 항목을 삭제할까요?")) return;
    state.decisions.splice(index, 1);
    state.decisions
      .filter(row => row.week_id === state.currentWeekId)
      .sort((a, b) => num(a.sort_order) - num(b.sort_order))
      .forEach((row, order) => { row.sort_order = order + 1; });
    touch({ immediate: true });
    el.decisionDialog.close();
    renderDecisions();
  }

  function openWeekDialog() {
    const latest = sortedWeeks()[0];
    const base = latest ? parseIso(latest.start_date) : new Date();
    if (!latest) {
      const dayNumber = (base.getDay() + 6) % 7;
      base.setDate(base.getDate() - dayNumber);
    }
    do {
      base.setDate(base.getDate() + (latest ? 7 : 0));
    } while (state.weeks.some(week => week.week_id === isoWeekId(isoDate(base))));
    const end = new Date(base);
    end.setDate(end.getDate() + 4);
    el.weekStartDate.value = isoDate(base);
    el.weekEndDate.value = isoDate(end);
    el.weekCarryOver.checked = true;
    el.weekForm.dataset.sourceWeekId = state.currentWeekId || "";
    el.weekDialog.showModal();
  }

  async function createWeekFromDialog(event) {
    event.preventDefault();
    const start = el.weekStartDate.value;
    const end = el.weekEndDate.value;
    if (!start || !end) {
      showToast("시작일과 종료일을 입력해 주세요.", true);
      return;
    }
    if (parseIso(end) < parseIso(start)) {
      showToast("종료일은 시작일보다 빠를 수 없습니다.", true);
      return;
    }

    const id = isoWeekId(start);
    const existing = state.weeks.find(week => week.week_id === id || (week.start_date === start && week.end_date === end));
    if (existing) {
      state.currentWeekId = existing.week_id;
      el.weekDialog.close();
      render();
      showToast("이미 등록된 주차입니다. 해당 주차로 이동했습니다.");
      return;
    }

    const sourceWeekId = el.weekForm.dataset.sourceWeekId || state.currentWeekId;
    const sourceCarryTasks = el.weekCarryOver.checked && sourceWeekId
      ? state.tasks.filter(task => task.week_id === sourceWeekId && task.period === "차주" && OWNER_ORDER.includes(task.owner))
      : [];

    state.weeks.push({
      week_id: id,
      start_date: start,
      end_date: end,
      created_at: timestamp(),
      updated_at: timestamp(),
      updated_by: state.userEmail || "web"
    });

    sourceCarryTasks.forEach(task => {
      state.tasks.push({
        ...task,
        task_id: makeId("TASK"),
        week_id: id,
        period: "금주",
        kpi_code: "",
        kpi_qty: 0,
        updated_at: timestamp(),
        updated_by: state.userEmail || "web"
      });
    });

    state.currentWeekId = id;
    touch({ immediate: true });
    el.weekDialog.close();
    render();

    const message = sourceCarryTasks.length
      ? `새 주차를 생성하고 차주 업무 ${sourceCarryTasks.length}건을 이월했습니다.`
      : "새 주차를 생성했습니다.";
    showToast(message);
  }

  function openMonthlyExportDialog() {
    const week = currentWeek();
    const referenceDate = week ? parseIso(week.end_date) : new Date();
    const previousOwner = el.monthlyExportOwner.value;
    const previousYear = el.monthlyExportYear.value;
    const previousMonth = el.monthlyExportMonth.value;

    el.monthlyExportOwner.innerHTML = "";
    OWNER_ORDER.forEach(owner => {
      const option = document.createElement("option");
      option.value = owner;
      option.textContent = owner;
      el.monthlyExportOwner.appendChild(option);
    });
    el.monthlyExportOwner.value = OWNER_ORDER.includes(previousOwner) ? previousOwner : OWNER_ORDER[0];

    const years = [...new Set(state.weeks.map(item => parseIso(item.end_date).getFullYear()))].sort((a, b) => b - a);
    if (!years.length) years.push(referenceDate.getFullYear());
    el.monthlyExportYear.innerHTML = "";
    years.forEach(year => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = `${year}년`;
      el.monthlyExportYear.appendChild(option);
    });
    const defaultYear = years.includes(Number(previousYear)) ? Number(previousYear) : referenceDate.getFullYear();
    el.monthlyExportYear.value = String(defaultYear);

    el.monthlyExportMonth.innerHTML = "";
    for (let month = 1; month <= 12; month += 1) {
      const option = document.createElement("option");
      option.value = String(month);
      option.textContent = `${month}월`;
      el.monthlyExportMonth.appendChild(option);
    }
    const defaultMonth = Number(previousMonth) >= 1 && Number(previousMonth) <= 12 ? Number(previousMonth) : referenceDate.getMonth() + 1;
    el.monthlyExportMonth.value = String(defaultMonth);

    updateMonthlyExportCount();
    el.monthlyExportDialog.showModal();
  }

  function getMonthlyPerformanceWeeks(year, month) {
    return state.weeks
      .filter(week => {
        const end = parseIso(week.end_date);
        return end.getFullYear() === year && end.getMonth() + 1 === month;
      })
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  }

  function getMonthlyPerformanceTasks(owner, year, month) {
    const weeks = getMonthlyPerformanceWeeks(year, month);
    const weekIndex = new Map(weeks.map((week, index) => [week.week_id, index]));
    return state.tasks
      .filter(task => weekIndex.has(task.week_id) && task.owner === owner && task.period === "금주")
      .filter(task => String(task.title || "").trim() || String(task.details || "").trim() || String(task.due_date || "").trim())
      .sort((a, b) => {
        return (weekIndex.get(a.week_id) - weekIndex.get(b.week_id))
          || num(a.project_order, 999) - num(b.project_order, 999)
          || num(a.sort_order, 999) - num(b.sort_order, 999)
          || String(a.project).localeCompare(String(b.project), "ko");
      })
      .reduce((result, task) => {
        const week = weeks[weekIndex.get(task.week_id)];
        const key = [task.week_id, task.owner, task.project, task.period].join("|");
        const cleanedTitle = stripTaskMarker(task.title || "");
        const previousTitle = result._titles.get(key) || "";
        const resolvedTitle = cleanedTitle || previousTitle;
        if (resolvedTitle) result._titles.set(key, resolvedTitle);
        result.rows.push({
          week: `${formatDate(week.start_date)} ~ ${formatDate(week.end_date)}`,
          project: task.project || "",
          title: resolvedTitle,
          details: task.details || "",
          dueDate: task.due_date || ""
        });
        return result;
      }, { rows: [], _titles: new Map() }).rows;
  }

  function updateMonthlyExportCount() {
    if (!el.monthlyExportOwner || !el.monthlyExportYear || !el.monthlyExportMonth) return;
    const owner = el.monthlyExportOwner.value;
    const year = Number(el.monthlyExportYear.value);
    const month = Number(el.monthlyExportMonth.value);
    const tasks = getMonthlyPerformanceTasks(owner, year, month);
    const weeks = getMonthlyPerformanceWeeks(year, month);
    el.monthlyExportCount.textContent = `${tasks.length}건 · ${weeks.length}개 주차`;
  }

  function exportMonthlyPerformance(event) {
    event.preventDefault();
    const owner = el.monthlyExportOwner.value;
    const year = Number(el.monthlyExportYear.value);
    const month = Number(el.monthlyExportMonth.value);
    const records = getMonthlyPerformanceTasks(owner, year, month);
    if (!records.length) {
      showToast("선택한 조건에 출력할 금주 작업이 없습니다.", true);
      return;
    }
    if (!window.PHARM_XLSX_EXPORTER?.downloadMonthlyPerformance) {
      showToast("엑셀 생성 모듈을 불러오지 못했습니다.", true);
      return;
    }
    window.PHARM_XLSX_EXPORTER.downloadMonthlyPerformance({ owner, year, month }, records);
    el.monthlyExportDialog.close();
    showToast(`${owner} ${year}년 ${month}월 성과 ${records.length}건을 엑셀로 만들었습니다.`);
  }

  async function changeWeek(weekId) {
    await flushAutoSave();
    state.currentWeekId = weekId;
    render();
  }

  function moveWeek(offset) {
    const weeks = sortedWeeks();
    const index = weeks.findIndex(week => week.week_id === state.currentWeekId);
    const target = weeks[index + offset];
    if (target) changeWeek(target.week_id);
  }

  async function refreshData() {
    await flushAutoSave();
    await loadData();
    showToast("최신 데이터를 불러왔습니다.");
  }

  async function goToLatestWeek() {
    await flushAutoSave();
    await loadData();
    const latest = sortedWeeks()[0];
    if (!latest) {
      showToast("이동할 보고 주차가 없습니다.", true);
      return;
    }
    state.currentWeekId = latest.week_id;
    render();
    showToast(`${formatDate(latest.start_date)} ~ ${formatDate(latest.end_date)} 최근 주차로 이동했습니다.`);
  }

  function scheduleAutoSave(immediate = false) {
    if (!state.dirty || immediate !== true) return;
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = window.setTimeout(() => runAutoSave(), 0);
  }

  async function saveNow() {
    window.clearTimeout(state.autoSaveTimer);
    if (state.savePromise) await state.savePromise;
    return saveData({ force: true, showLoading: true });
  }

  async function runAutoSave() {
    if (!state.dirty) return true;
    if (state.savePromise) {
      state.saveQueued = true;
      return state.savePromise;
    }
    state.savePromise = saveData({ auto: true, showLoading: false });
    const result = await state.savePromise;
    state.savePromise = null;
    if (result && (state.saveQueued || state.dirty)) {
      state.saveQueued = false;
      scheduleAutoSave(true);
    } else if (!result) {
      state.saveQueued = false;
    }
    return result;
  }

  async function flushAutoSave() {
    window.clearTimeout(state.autoSaveTimer);
    if (state.savePromise) await state.savePromise;
    if (state.dirty) return runAutoSave();
    return true;
  }

  async function saveData(options = {}) {
    if (typeof options === "string") options = { message: options };
    const saveVersion = state.changeVersion;
    const showLoading = options.showLoading === true;
    if (showLoading) setLoading(true, "변경사항을 저장하고 실제 반영 여부를 확인하는 중입니다.");
    document.body.classList.add("is-saving");
    try {
      const data = serializableData();
      let saveResult = { snapshot: deepClone(data), changedKeys: [] };
      if (state.demoMode) {
        try {
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
          saveResult.snapshot = deepClone(data);
        } catch (_) {
          throw new Error("현재 환경에서는 브라우저 저장소를 사용할 수 없습니다. 웹서버 또는 GitHub Pages에서 실행하세요.");
        }
      } else {
        saveResult = await saveSheetsDataIncremental(data);
      }

      state.remoteSnapshot = deepClone(saveResult.snapshot || data);
      const hasNewerLocalChanges = state.changeVersion !== saveVersion;
      setDirty(hasNewerLocalChanges);

      if (!state.demoMode && !hasNewerLocalChanges && saveResult.changedKeys?.length) {
        reconcileVerifiedCollections(saveResult.snapshot, saveResult.changedKeys);
        render();
        applyPresenceIndicators();
      }

      state.lastSavedAt = new Date();
      showToast(options.message || formatSaveToast(state.lastSavedAt));
      setStatus(state.demoMode ? "자동 저장 완료" : "Google Sheets 저장·검증 완료");
      return true;
    } catch (error) {
      setDirty(true);
      handleError(error);
      return false;
    } finally {
      document.body.classList.remove("is-saving");
      if (showLoading) setLoading(false);
    }
  }

  function stampUpdatedRecords() {
    // v1.4부터는 변경된 행만 저장하며, 행별 updated_at / updated_by는 증분 저장 엔진이 갱신합니다.
  }

  function serializableData() {
    return {
      weeks: state.weeks.map(row => pick(row, SCHEMA.weeks)),
      tasks: state.tasks.map(row => pick(row, SCHEMA.tasks)),
      kpis: state.kpis.map(row => pick(row, SCHEMA.kpis)),
      criteria: state.criteria.map(row => pick(row, SCHEMA.criteria)),
      decisions: state.decisions.map(row => pick(row, SCHEMA.decisions))
    };
  }

  function connectGoogle() {
    if (state.demoMode) {
      showToast("현재 데모 모드입니다. config.js에서 DEMO_MODE를 false로 변경하세요.");
      return;
    }
    if (!validGoogleConfig()) {
      showToast("config.js의 Google Client ID와 Spreadsheet ID를 입력하세요.", true);
      return;
    }
    if (state.token) {
      showToast(`${state.userEmail || "Google 계정"}으로 이미 연결되어 있습니다.`);
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      showToast("Google 인증 모듈을 아직 불러오는 중입니다. 잠시 후 다시 눌러 주세요.", true);
      return;
    }

    state.googleIdentityReady = true;
    state.authenticating = true;
    applyModeUi();
    setLoading(true, "Google 계정을 연결하는 중입니다.");

    let tokenPromise;
    try {
      initializeTokenClient();
      // 팝업 차단을 피하려면 requestAccessToken()을 클릭 이벤트 안에서 즉시 호출해야 합니다.
      tokenPromise = requestGoogleToken({ silent: false });
    } catch (error) {
      finishGoogleConnection(null, error);
      return;
    }
    finishGoogleConnection(tokenPromise);
  }

  async function finishGoogleConnection(tokenPromise, immediateError = null) {
    try {
      if (immediateError) throw immediateError;
      await tokenPromise;
      await fetchUserEmail();
      applyModeUi();
      if (state.dirty && state.weeks.length) await saveNow();
      else await loadData();
    } catch (error) {
      if (error?.code !== "popup_closed") handleError(error);
    } finally {
      state.authenticating = false;
      applyModeUi();
      setLoading(false);
    }
  }

  async function waitForGoogleIdentity(timeoutMs = GOOGLE_IDENTITY_WAIT_MS) {
    const startedAt = Date.now();
    while (!window.google?.accounts?.oauth2) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Google 인증 모듈을 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.");
      }
      await delay(100);
    }
  }

  function initializeTokenClient() {
    if (state.tokenClient) return state.tokenClient;
    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: OAUTH_SCOPE,
      include_granted_scopes: true,
      callback: handleGoogleTokenResponse,
      error_callback: error => {
        const type = error?.type || "oauth_popup_error";
        let message = "Google 인증 중 알 수 없는 오류가 발생했습니다.";
        if (type === "popup_closed") message = "Google 로그인 창이 닫혔습니다.";
        if (type === "popup_failed_to_open") {
          message = "브라우저가 Google 인증 팝업을 차단했습니다. 주소창의 팝업 차단 아이콘에서 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.";
        }
        const authError = new Error(message);
        authError.code = type;
        settleAuthRequest(authError);
      }
    });
    return state.tokenClient;
  }

  function requestGoogleToken({ silent = false } = {}) {
    if (state.authPromise) return state.authPromise;
    initializeTokenClient();
    const loginHint = loadLastGoogleEmail();
    state.authPromise = new Promise((resolve, reject) => {
      state.authResolve = resolve;
      state.authReject = reject;
      window.clearTimeout(state.authTimer);
      state.authTimer = window.setTimeout(() => {
        const error = new Error(silent ? "저장된 Google 연결을 확인하지 못했습니다." : "Google 인증 응답 시간이 초과되었습니다.");
        error.code = silent ? "silent_timeout" : "oauth_timeout";
        settleAuthRequest(error);
      }, silent ? 9000 : 120000);

      const options = { prompt: silent ? "none" : "" };
      if (loginHint) options.login_hint = loginHint;
      try {
        state.tokenClient.requestAccessToken(options);
      } catch (error) {
        settleAuthRequest(error);
      }
    });
    return state.authPromise;
  }

  function handleGoogleTokenResponse(response) {
    if (!response || response.error) {
      const error = new Error(response?.error_description || response?.error || "Google 인증에 실패했습니다.");
      error.code = response?.error || "oauth_error";
      settleAuthRequest(error);
      return;
    }
    state.token = response.access_token;
    state.tokenExpiresAt = Date.now() + Math.max(0, num(response.expires_in, 3600) - 60) * 1000;
    armTokenExpiryTimer();
    persistGoogleSessionToken();
    settleAuthRequest(null, response);
  }

  function settleAuthRequest(error, response) {
    window.clearTimeout(state.authTimer);
    const resolve = state.authResolve;
    const reject = state.authReject;
    state.authPromise = null;
    state.authResolve = null;
    state.authReject = null;
    state.authTimer = null;
    if (error) reject?.(error);
    else resolve?.(response);
  }

  async function refreshGoogleTokenSilently() {
    // Google Identity Services의 토큰 팝업은 사용자 클릭에서 실행해야 안정적으로 열립니다.
    // 정적 GitHub Pages에서는 백그라운드 무소음 재발급을 시도하지 않습니다.
    clearGoogleSessionToken();
    state.token = null;
    state.tokenExpiresAt = 0;
    applyModeUi();
    return false;
  }

  async function fetchUserEmail() {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${state.token}` } });
      if (response.ok) {
        state.userEmail = (await response.json()).email || "";
        if (state.userEmail && state.rememberGoogleAccount) localStorage.setItem(LAST_GOOGLE_EMAIL_KEY, state.userEmail);
        if (state.rememberGoogleAccount) persistGoogleSessionToken();
        if (!state.rememberGoogleAccount) {
          try { localStorage.removeItem(LAST_GOOGLE_EMAIL_KEY); } catch (_) {}
        }
      }
    } catch (_) { /* optional */ }
  }

  function loadLastGoogleEmail() {
    if (!state.rememberGoogleAccount) return "";
    try { return localStorage.getItem(LAST_GOOGLE_EMAIL_KEY) || ""; }
    catch (_) { return ""; }
  }

  function loadRememberGoogleAccount() {
    try {
      const saved = localStorage.getItem(REMEMBER_GOOGLE_ACCOUNT_KEY);
      return saved === null ? true : saved === "Y";
    } catch (_) { return true; }
  }

  function saveRememberGoogleAccount(value) {
    try { localStorage.setItem(REMEMBER_GOOGLE_ACCOUNT_KEY, value ? "Y" : "N"); }
    catch (_) {}
  }

  function persistGoogleSessionToken() {
    if (!state.rememberGoogleAccount || !state.token || state.tokenExpiresAt <= Date.now()) {
      if (!state.rememberGoogleAccount || state.tokenExpiresAt <= Date.now()) clearGoogleSessionToken();
      return;
    }
    try {
      sessionStorage.setItem(GOOGLE_SESSION_TOKEN_KEY, JSON.stringify({
        access_token: state.token,
        expires_at: state.tokenExpiresAt,
        email: state.userEmail || loadLastGoogleEmail() || ""
      }));
    } catch (_) { /* sessionStorage unavailable */ }
  }

  function restoreGoogleSessionToken() {
    if (!state.rememberGoogleAccount) return false;
    try {
      const saved = JSON.parse(sessionStorage.getItem(GOOGLE_SESSION_TOKEN_KEY) || "null");
      if (!saved?.access_token || num(saved.expires_at) <= Date.now() + 15000) {
        clearGoogleSessionToken();
        return false;
      }
      state.token = saved.access_token;
      state.tokenExpiresAt = num(saved.expires_at);
      state.userEmail = saved.email || "";
      armTokenExpiryTimer();
      return true;
    } catch (_) {
      clearGoogleSessionToken();
      return false;
    }
  }

  function clearGoogleSessionToken() {
    window.clearTimeout(state.tokenExpiryTimer);
    state.tokenExpiryTimer = null;
    try { sessionStorage.removeItem(GOOGLE_SESSION_TOKEN_KEY); } catch (_) {}
  }

  function armTokenExpiryTimer() {
    window.clearTimeout(state.tokenExpiryTimer);
    const delayMs = Math.max(0, state.tokenExpiresAt - Date.now());
    if (!delayMs) return;
    state.tokenExpiryTimer = window.setTimeout(() => {
      clearGoogleSessionToken();
      state.token = null;
      state.tokenExpiresAt = 0;
      applyModeUi();
      setStatus("Google 연결이 만료되었습니다. 연결 버튼을 다시 눌러 주세요.");
      showToast("Google 연결 세션이 만료되었습니다.", true);
    }, Math.min(delayMs, 2147483647));
  }

  function validGoogleConfig() {
    return CONFIG.GOOGLE_CLIENT_ID && CONFIG.GOOGLE_CLIENT_ID !== PLACEHOLDER_CLIENT_ID && CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID !== PLACEHOLDER_SHEET_ID;
  }

  async function loadSheetsData() {
    if (!state.token && !(await refreshGoogleTokenSilently())) throw new Error("Google 연결 후 데이터를 불러올 수 있습니다.");
    const keys = Object.keys(SCHEMA);
    const params = new URLSearchParams();
    keys.forEach(key => params.append("ranges", `${quotedSheet(key)}!A:AZ`));
    params.set("majorDimension", "ROWS");
    const result = await sheetsFetch(`values:batchGet?${params}`);
    const ranges = result.valueRanges || [];
    const data = {};
    keys.forEach((key, index) => { data[key] = parseSheetRows(ranges[index]?.values || [], key); });
    return data;
  }

  function parseSheetRows(values, key) {
    if (!values.length) return [];
    const headerRowIndex = values.slice(0, 5).findIndex(row => {
      const candidate = row.map(value => String(value ?? ""));
      return SCHEMA[key].every(header => candidate.includes(header));
    });
    if (headerRowIndex < 0) throw new Error(`${sheetName(key)} 시트에서 연동용 영문 헤더 행을 찾을 수 없습니다.`);
    const headers = values[headerRowIndex].map(String);
    const missing = SCHEMA[key].filter(header => !headers.includes(header));
    if (missing.length) throw new Error(`${sheetName(key)} 시트에 필수 열이 없습니다: ${missing.join(", ")}`);
    return values.slice(headerRowIndex + 1).filter(row => row.some(value => String(value ?? "").trim() !== "")).map(row => {
      const item = {};
      headers.forEach((header, index) => { item[header] = row[index] ?? ""; });
      return item;
    });
  }

  async function saveSheetsDataIncremental(data) {
    if (!state.token && !(await refreshGoogleTokenSilently())) {
      throw new Error("Google 연결이 만료되었습니다. 상단의 Google 연결 버튼을 한 번 눌러 주세요.");
    }

    const baseline = state.remoteSnapshot || { weeks: [], tasks: [], kpis: [], criteria: [], decisions: [] };
    const diffs = {};
    for (const key of ["weeks", "tasks", "kpis", "decisions"]) {
      const diff = diffCollection(key, baseline[key] || [], data[key] || []);
      if (diff.added.length || diff.deleted.length || diff.changed.length) diffs[key] = diff;
    }
    const changedKeys = Object.keys(diffs);
    if (!changedKeys.length) return { snapshot: deepClone(baseline), changedKeys: [] };

    const sheetIds = await ensureSheetIdMap();
    const expected = { fields: [], added: [], deleted: [] };

    for (const key of changedKeys) {
      const diff = diffs[key];
      if (!diff.deleted.length) continue;
      for (const deleted of diff.deleted) {
        let remote = (await fetchRemoteSheets([key]))[key];
        let remoteRow = remote.byId.get(String(deleted.id)) || findFallbackRemoteRow(key, deleted.baseline, deleted.baseline, remote);
        if (!remoteRow) {
          expected.deleted.push({ key, id: String(deleted.id), baseline: deleted.baseline, alreadyMissing: true });
          continue;
        }

        const changedByOther = meaningfulFields(key).some(field => !sameValue(remoteRow.item[field], deleted.baseline[field]));
        if (changedByOther) {
          const editor = remoteRow.item.updated_by || "다른 사용자";
          const ok = window.confirm(`${editor}님이 삭제 대상 항목을 최근 수정했습니다.

그래도 이 항목을 삭제할까요?`);
          if (!ok) {
            restoreLocalRow(key, remoteRow.item);
            continue;
          }
        }

        const idField = KEY_FIELD[key];
        const deleteExpectation = {
          key,
          id: String(remoteRow.item[idField] || deleted.id || ""),
          baseline: remoteRow.item,
          alreadyMissing: false
        };
        expected.deleted.push(deleteExpectation);

        await sheetsRootFetch(":batchUpdate", {
          method: "POST",
          body: JSON.stringify({ requests: [{
            deleteDimension: {
              range: { sheetId: sheetIds[key], dimension: "ROWS", startIndex: remoteRow.rowNumber - 1, endIndex: remoteRow.rowNumber }
            }
          }] })
        });

        remote = (await fetchRemoteSheets([key]))[key];
        const stillThere = deleteExpectation.id
          ? remote.byId.get(deleteExpectation.id)
          : findFallbackRemoteRow(key, deleted.baseline, deleted.baseline, remote);
        if (stillThere) throw new Error(`${sheetName(key)}에서 삭제 결과를 확인하지 못했습니다. 저장을 중단했습니다.`);
      }
    }

    let remoteSheets = await fetchRemoteSheets(changedKeys);
    const idRepairs = [];
    const recoveryAdds = {};
    const resolvedChanges = new Map();
    const unresolvedChanges = [];

    for (const key of changedKeys) {
      const diff = diffs[key];
      const remote = remoteSheets[key];
      recoveryAdds[key] = [];
      for (const change of diff.changed) {
        const currentRow = findLocalRow(key, change.id);
        if (!currentRow) continue;
        let remoteRow = remote.byId.get(String(change.id));
        if (!remoteRow) {
          remoteRow = findFallbackRemoteRow(key, change.baseline, currentRow, remote);
          if (remoteRow) {
            const idField = KEY_FIELD[key];
            const remoteId = String(remoteRow.item[idField] ?? "").trim();
            const localId = String(change.id ?? "").trim();
            if (!remoteId && localId) {
              remoteRow.item[idField] = localId;
              remote.byId.set(localId, remoteRow);
              idRepairs.push({ key, rowNumber: remoteRow.rowNumber, field: idField, value: localId, id: localId });
            } else if (remoteId && remoteId !== localId) {
              const duplicateRemoteId = (state[key] || []).some(row => row !== currentRow && String(row[idField] ?? "").trim() === remoteId);
              if (duplicateRemoteId && localId) {
                remoteRow.item[idField] = localId;
                remote.byId.set(localId, remoteRow);
                idRepairs.push({ key, rowNumber: remoteRow.rowNumber, field: idField, value: localId, id: localId });
              } else {
                currentRow[idField] = remoteId;
              }
            }
          }
        }

        if (!remoteRow) {
          const label = key === "tasks"
            ? `${currentRow.owner || ""} / ${currentRow.project || ""} / ${currentRow.title || "작업"}`
            : key === "kpis"
              ? `${currentRow.owner || ""} / ${currentRow.kpi_name || currentRow.kpi_code || "KPI"}`
              : key === "decisions" ? (currentRow.item || "의사결정") : sheetName(key);
          const restore = window.confirm(`Google Sheets에서 '${label}' 행을 찾지 못했습니다.

현재 화면에 작성된 내용을 새 행으로 복구할까요?`);
          if (restore) {
            recoveryAdds[key].push(currentRow);
            continue;
          }
          unresolvedChanges.push({ key, change, currentRow });
          continue;
        }
        resolvedChanges.set(`${key}::${change.id}`, remoteRow);
      }
    }

    if (unresolvedChanges.length) {
      const labels = unresolvedChanges.slice(0, 3).map(item => {
        const row = item.currentRow || {};
        if (item.key === "tasks") return `${row.owner || ""} / ${row.project || ""} / ${row.title || "작업"}`.replace(/^\s*\/\s*/, "");
        if (item.key === "kpis") return `${row.owner || ""} / ${row.kpi_name || row.kpi_code || "KPI"}`;
        if (item.key === "decisions") return row.item || "의사결정";
        return sheetName(item.key);
      });
      const more = unresolvedChanges.length > 3 ? ` 외 ${unresolvedChanges.length - 3}건` : "";
      throw new Error(`저장 대상 행을 확인하지 못했습니다: ${labels.join(", ")}${more}. 저장하지 않은 내용은 화면에 유지됩니다.`);
    }

    const updates = [];
    idRepairs.forEach(repair => {
      updates.push({ range: `${quotedSheet(repair.key)}!${columnLetter(SCHEMA[repair.key].indexOf(repair.field) + 1)}${repair.rowNumber}`, values: [[repair.value]] });
      expected.fields.push({ key: repair.key, id: repair.id, field: repair.field, value: repair.value });
    });

    const now = timestamp();
    const by = state.userEmail || "web";
    for (const key of changedKeys) {
      const diff = diffs[key];
      const remote = remoteSheets[key];
      for (const change of diff.changed) {
        if (recoveryAdds[key].some(row => String(row[KEY_FIELD[key]]) === String(change.id))) continue;
        const remoteRow = resolvedChanges.get(`${key}::${change.id}`) || remote.byId.get(String(change.id));
        const currentRow = findLocalRow(key, change.id) || (remoteRow ? findLocalRow(key, remoteRow.item[KEY_FIELD[key]]) : null);
        if (!remoteRow || !currentRow) continue;
        const idField = KEY_FIELD[key];
        const canonicalId = String(remoteRow.item[idField] || currentRow[idField] || change.id);
        let rowChanged = false;
        for (const field of change.fields) {
          const baselineValue = change.baseline[field];
          const remoteValue = remoteRow.item[field] ?? "";
          const localValue = currentRow[field] ?? "";
          if (!sameValue(remoteValue, baselineValue) && !sameValue(remoteValue, localValue)) {
            const editor = remoteRow.item.updated_by || "다른 사용자";
            const label = fieldLabel(key, field);
            const ok = window.confirm(`${editor}님이 '${label}'을 먼저 수정했습니다.

현재 값: ${shortValue(remoteValue)}
내 값: ${shortValue(localValue)}

내 값으로 덮어쓸까요?`);
            if (!ok) {
              currentRow[field] = normalizeRemoteField(key, field, remoteValue);
              continue;
            }
          }
          updates.push({ range: `${quotedSheet(key)}!${columnLetter(SCHEMA[key].indexOf(field) + 1)}${remoteRow.rowNumber}`, values: [[localValue]] });
          expected.fields.push({ key, id: canonicalId, field, value: localValue });
          rowChanged = true;
        }
        if (rowChanged) {
          currentRow.updated_at = now;
          currentRow.updated_by = by;
          const updatedAtCol = SCHEMA[key].indexOf("updated_at") + 1;
          const updatedByCol = SCHEMA[key].indexOf("updated_by") + 1;
          if (updatedAtCol > 0) {
            updates.push({ range: `${quotedSheet(key)}!${columnLetter(updatedAtCol)}${remoteRow.rowNumber}`, values: [[now]] });
            expected.fields.push({ key, id: canonicalId, field: "updated_at", value: now });
          }
          if (updatedByCol > 0) {
            updates.push({ range: `${quotedSheet(key)}!${columnLetter(updatedByCol)}${remoteRow.rowNumber}`, values: [[by]] });
            expected.fields.push({ key, id: canonicalId, field: "updated_by", value: by });
          }
        }
      }
    }

    if (updates.length) {
      await sheetsFetch("values:batchUpdate", {
        method: "POST",
        body: JSON.stringify({ valueInputOption: "RAW", data: updates })
      });
    }

    for (const key of changedKeys) {
      const idField = KEY_FIELD[key];
      const candidates = [
        ...diffs[key].added.map(item => findLocalRow(key, item.id) || item.current),
        ...(recoveryAdds[key] || [])
      ].filter(Boolean);
      if (!candidates.length) continue;

      let remote = (await fetchRemoteSheets([key]))[key];
      for (const local of candidates) {
        const id = String(local[idField] || "");
        const existing = id ? remote.byId.get(id) : null;
        if (existing) {
          const repairUpdates = [];
          meaningfulFields(key).forEach(field => {
            if (sameValue(existing.item[field], local[field])) return;
            repairUpdates.push({ range: `${quotedSheet(key)}!${columnLetter(SCHEMA[key].indexOf(field) + 1)}${existing.rowNumber}`, values: [[local[field] ?? ""]] });
            expected.fields.push({ key, id, field, value: local[field] ?? "" });
          });
          if (repairUpdates.length) {
            await sheetsFetch("values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data: repairUpdates }) });
          }
          continue;
        }

        if ("updated_at" in local) local.updated_at = now;
        if ("updated_by" in local) local.updated_by = by;
        const range = `${quotedSheet(key)}!A:${columnLetter(SCHEMA[key].length)}`;
        await sheetsFetch(`values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
          method: "POST",
          body: JSON.stringify({ majorDimension: "ROWS", values: [SCHEMA[key].map(field => local[field] ?? "")] })
        });
        expected.added.push({ key, id: String(local[idField] || ""), row: pick(local, SCHEMA[key]) });
        remote = (await fetchRemoteSheets([key]))[key];
      }
    }

    const verification = await verifyIncrementalSave(expected, changedKeys);
    return { snapshot: buildVerifiedSnapshot(baseline, verification.remoteSheets, changedKeys), changedKeys };
  }

  async function verifyIncrementalSave(expected, changedKeys) {
    let lastProblems = [];
    let remoteSheets = null;
    for (let attempt = 0; attempt < SAVE_VERIFY_RETRIES; attempt += 1) {
      if (attempt) await delay(SAVE_VERIFY_DELAY_MS * attempt);
      remoteSheets = await fetchRemoteSheets(changedKeys);
      const problems = [];

      expected.fields.forEach(item => {
        const remoteRow = remoteSheets[item.key]?.byId.get(String(item.id));
        if (!remoteRow) {
          problems.push(`${sheetName(item.key)}:${item.id} 행 없음`);
          return;
        }
        if (!sameValue(remoteRow.item[item.field], item.value)) problems.push(`${sheetName(item.key)}:${item.id}.${item.field} 값 불일치`);
      });

      expected.added.forEach(item => {
        const remoteRow = remoteSheets[item.key]?.byId.get(String(item.id));
        if (!remoteRow) {
          problems.push(`${sheetName(item.key)}:${item.id} 신규 행 미확인`);
          return;
        }
        meaningfulFields(item.key).forEach(field => {
          if (!sameValue(remoteRow.item[field], item.row[field])) problems.push(`${sheetName(item.key)}:${item.id}.${field} 신규값 불일치`);
        });
      });

      expected.deleted.forEach(item => {
        if (item.alreadyMissing) return;
        const remote = remoteSheets[item.key];
        if (!remote) return;
        const byId = item.id ? remote.byId.get(String(item.id)) : null;
        const byFallback = !item.id ? findFallbackRemoteRow(item.key, item.baseline, item.baseline, remote) : null;
        if (byId || byFallback) problems.push(`${sheetName(item.key)}:${item.id || "삭제행"} 삭제 미반영`);
      });

      if (!problems.length) return { remoteSheets };
      lastProblems = problems;
    }
    throw new Error(`Google Sheets 저장 후 재확인에 실패했습니다. 저장 완료로 처리하지 않았습니다. (${lastProblems.slice(0, 3).join(", ")}${lastProblems.length > 3 ? " 외" : ""})`);
  }

  function buildVerifiedSnapshot(baseline, remoteSheets, changedKeys) {
    const snapshot = deepClone(baseline || { weeks: [], tasks: [], kpis: [], criteria: [], decisions: [] });
    changedKeys.forEach(key => {
      const rows = remoteSheets[key]?.rows || [];
      snapshot[key] = rows.map(entry => pick(entry.item, SCHEMA[key]));
    });
    return snapshot;
  }

  function reconcileVerifiedCollections(snapshot, changedKeys) {
    changedKeys.forEach(key => {
      const rows = snapshot[key] || [];
      if (key === "tasks") {
        state.tasks = normalizeRows(rows, key).filter(task => OWNER_ORDER.includes(task.owner));
        ensureLocalStableIds(state.tasks, "tasks", "TASK");
        normalizeTaskTitles();
      } else if (key === "kpis") {
        state.kpis = normalizeRows(rows, key).filter(kpi => OWNER_ORDER.includes(kpi.owner));
        ensureLocalStableIds(state.kpis, "kpis", "KPI");
      } else if (key === "decisions") {
        state.decisions = normalizeRows(rows, key);
        ensureLocalStableIds(state.decisions, "decisions", "DEC");
      } else if (key === "weeks") {
        state.weeks = normalizeRows(rows, key);
      }
    });
  }

  function diffCollection(key, baselineRows, currentRows) {
    const idField = KEY_FIELD[key];
    const baselineMap = new Map(baselineRows.map(row => [String(row[idField]), row]));
    const currentMap = new Map(currentRows.map(row => [String(row[idField]), row]));
    const added = [];
    const deleted = [];
    const changed = [];
    currentMap.forEach((row, id) => {
      if (!baselineMap.has(id)) {
        added.push({ id, current: row });
        return;
      }
      const base = baselineMap.get(id);
      const fields = meaningfulFields(key).filter(field => !sameValue(base[field], row[field]));
      if (fields.length) changed.push({ id, baseline: base, current: row, fields });
    });
    baselineMap.forEach((row, id) => {
      if (!currentMap.has(id)) deleted.push({ id, baseline: row });
    });
    return { added, deleted, changed };
  }

  function meaningfulFields(key) {
    const idField = KEY_FIELD[key];
    return SCHEMA[key].filter(field => field !== idField && !META_FIELDS.has(field));
  }

  async function fetchRemoteSheets(keys) {
    if (!keys.length) return {};
    const params = new URLSearchParams();
    keys.forEach(key => params.append("ranges", `${quotedSheet(key)}!A:AZ`));
    params.set("majorDimension", "ROWS");
    const result = await sheetsFetch(`values:batchGet?${params}`);
    const out = {};
    (result.valueRanges || []).forEach((range, index) => {
      out[keys[index]] = parseSheetRowsWithMeta(range.values || [], keys[index]);
    });
    return out;
  }

  function parseSheetRowsWithMeta(values, key) {
    const headerRowIndex = values.slice(0, 5).findIndex(row => {
      const candidate = row.map(value => String(value ?? ""));
      return SCHEMA[key].every(header => candidate.includes(header));
    });
    if (headerRowIndex < 0) throw new Error(`${sheetName(key)} 시트에서 연동용 영문 헤더 행을 찾을 수 없습니다.`);
    const headers = values[headerRowIndex].map(String);
    const byId = new Map();
    const rows = [];
    const idField = KEY_FIELD[key];
    values.slice(headerRowIndex + 1).forEach((row, offset) => {
      if (!row.some(value => String(value ?? "").trim() !== "")) return;
      const item = {};
      headers.forEach((header, index) => { item[header] = row[index] ?? ""; });
      const normalized = normalizeRows([item], key)[0] || item;
      const rowNumber = headerRowIndex + 2 + offset;
      rows.push({ rowNumber, item: normalized });
      if (normalized[idField] !== undefined && normalized[idField] !== "") byId.set(String(normalized[idField]), { rowNumber, item: normalized });
    });
    return { rows, byId, headerRowIndex };
  }

  async function ensureSheetIdMap() {
    if (state.sheetIdMap) return state.sheetIdMap;
    const meta = await sheetsRootFetch("?fields=sheets.properties(sheetId,title)");
    state.sheetIdMap = {};
    (meta.sheets || []).forEach(sheet => {
      const title = sheet.properties?.title;
      const key = Object.keys(SCHEMA).find(item => sheetName(item) === title);
      if (key) state.sheetIdMap[key] = sheet.properties.sheetId;
      if (title === PRESENCE_SHEET_NAME) state.sheetIdMap.presence = sheet.properties.sheetId;
    });
    return state.sheetIdMap;
  }

  function fallbackIdentityFields(key) {
    if (key === "tasks") return ["week_id", "owner", "period", "project_order", "sort_order"];
    if (key === "kpis") return ["week_id", "kpi_code", "owner", "sort_order"];
    if (key === "decisions") return ["week_id", "sort_order"];
    if (key === "weeks") return ["start_date", "end_date"];
    return [];
  }

  function fallbackSecondaryFields(key) {
    if (key === "tasks") return ["project", "title", "details", "due_date"];
    if (key === "kpis") return ["kpi_name", "actual", "note"];
    if (key === "decisions") return ["item", "summary", "decision", "note"];
    return [];
  }

  function findFallbackRemoteRow(key, baselineRow, currentRow, remote) {
    if (!remote?.rows?.length) return null;
    const reference = baselineRow || currentRow || {};
    const primaryFields = fallbackIdentityFields(key);
    if (!primaryFields.length) return null;

    let candidates = remote.rows.filter(entry =>
      primaryFields.every(field => sameValue(entry.item[field], reference[field]))
    );

    if (candidates.length === 1) return candidates[0];
    if (!candidates.length) {
      // 정렬값 하나가 구버전에서 비어 있던 경우를 위해 핵심 식별값만으로 한 번 더 좁힙니다.
      const relaxedFields = key === "tasks"
        ? ["week_id", "owner", "period"]
        : key === "kpis"
          ? ["week_id", "kpi_code", "owner"]
          : key === "decisions"
            ? ["week_id"]
            : primaryFields;
      candidates = remote.rows.filter(entry =>
        relaxedFields.every(field => sameValue(entry.item[field], reference[field]))
      );
    }
    if (candidates.length === 1) return candidates[0];
    if (!candidates.length) return null;

    const secondaryFields = fallbackSecondaryFields(key);
    const scored = candidates.map(entry => ({
      entry,
      score: secondaryFields.reduce((score, field) => score + (sameValue(entry.item[field], reference[field]) ? 1 : 0), 0)
    })).sort((a, b) => b.score - a.score);

    if (!scored.length || scored[0].score <= 0) return null;
    if (scored.length > 1 && scored[0].score === scored[1].score) return null;
    return scored[0].entry;
  }

  function findLocalRow(key, id) {
    const idField = KEY_FIELD[key];
    const collection = state[key] || [];
    return collection.find(row => String(row[idField]) === String(id));
  }

  function removeLocalRowById(key, id) {
    const idField = KEY_FIELD[key];
    state[key] = (state[key] || []).filter(row => String(row[idField]) !== String(id));
  }

  function restoreLocalRow(key, remoteRow) {
    const idField = KEY_FIELD[key];
    const collection = state[key] || [];
    const index = collection.findIndex(row => String(row[idField]) === String(remoteRow[idField]));
    const normalized = normalizeRows([remoteRow], key)[0] || remoteRow;
    if (index >= 0) collection[index] = normalized;
    else collection.push(normalized);
  }

  function normalizeRemoteField(key, field, value) {
    const row = normalizeRows([{ [field]: value }], key)[0] || { [field]: value };
    return row[field] ?? value;
  }

  function sameValue(a, b) { return String(a ?? "") === String(b ?? ""); }
  function shortValue(value) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.length > 80 ? `${text.slice(0, 77)}...` : text || "(빈 값)";
  }
  function fieldLabel(key, field) {
    const index = SCHEMA[key].indexOf(field);
    const display = DISPLAY_HEADERS[key]?.[index] || field;
    return String(display).replace(/\s*\(.+\)$/, "");
  }
  function columnLetter(number) {
    let n = number;
    let out = "";
    while (n > 0) { n -= 1; out = String.fromCharCode(65 + (n % 26)) + out; n = Math.floor(n / 26); }
    return out;
  }

  async function sheetsRootFetch(suffix, options = {}, allowAuthRetry = true, retryCount = 0) {
    if (!state.token) throw new Error("Google 연결이 필요합니다.");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(CONFIG.SPREADSHEET_ID)}${suffix}`;
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${state.token}`, "Content-Type": "application/json", ...(options.headers || {}) }
      });
    } catch (error) {
      const method = String(options.method || "GET").toUpperCase();
      if (method === "GET" && retryCount < 2) {
        await delay(350 * (retryCount + 1));
        return sheetsRootFetch(suffix, options, allowAuthRetry, retryCount + 1);
      }
      throw error;
    }
    if (response.status === 401) {
      clearGoogleSessionToken();
      state.token = null;
      state.tokenExpiresAt = 0;
      applyModeUi();
      if (allowAuthRetry && await refreshGoogleTokenSilently()) return sheetsRootFetch(suffix, options, false, retryCount);
      throw new Error("Google 인증이 만료되었습니다. 상단의 Google 연결 버튼을 한 번 눌러 주세요.");
    }
    const method = String(options.method || "GET").toUpperCase();
    if (!response.ok && method === "GET" && retryCount < 2 && [408, 429, 500, 502, 503, 504].includes(response.status)) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 350 * (retryCount + 1));
      return sheetsRootFetch(suffix, options, allowAuthRetry, retryCount + 1);
    }
    if (!response.ok) {
      let message = `Google Sheets API 오류 (${response.status})`;
      try { message = (await response.json()).error?.message || message; } catch (_) {}
      throw new Error(message);
    }
    return response.status === 204 ? {} : response.json();
  }

  async function ensurePresenceSheet() {
    const map = await ensureSheetIdMap();
    if (!map.presence) {
      await sheetsRootFetch(":batchUpdate", {
        method: "POST",
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: PRESENCE_SHEET_NAME, hidden: true } } }] })
      });
      state.sheetIdMap = null;
      await ensureSheetIdMap();
      await sheetsFetch("values:batchUpdate", {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: [{ range: `'${PRESENCE_SHEET_NAME}'!A1`, majorDimension: "ROWS", values: [PRESENCE_DISPLAY_HEADERS, PRESENCE_SCHEMA] }]
        })
      });
    }
  }

  async function startCollaborationRuntime() {
    if (state.demoMode || !state.token) return;
    await ensurePresenceSheet();
    await upsertPresence();
    await refreshPresence();
    window.clearInterval(state.presencePollTimer);
    window.clearInterval(state.presenceHeartbeatTimer);
    window.clearInterval(state.remoteSyncTimer);
    state.presencePollTimer = window.setInterval(() => refreshPresence().catch(() => {}), PRESENCE_POLL_MS);
    state.presenceHeartbeatTimer = window.setInterval(() => upsertPresence().catch(() => {}), PRESENCE_HEARTBEAT_MS);
    state.remoteSyncTimer = window.setInterval(() => syncRemoteDataIfIdle().catch(() => {}), REMOTE_SYNC_MS);
  }

  function loadPresenceSessionId() {
    const key = "pharmearth-weekly-presence-session-v1";
    try {
      let value = sessionStorage.getItem(key);
      if (!value) { value = `SES-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; sessionStorage.setItem(key, value); }
      return value;
    } catch (_) { return `SES-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
  }

  async function upsertPresence(edit = state.currentEditPresence) {
    if (state.demoMode || !state.token || !state.userEmail) return;
    await ensurePresenceSheet();
    const values = [[
      state.presenceSessionId,
      state.userEmail,
      state.currentWeekId || "",
      edit?.entityType || "",
      edit?.entityId || "",
      edit?.field || "",
      timestamp(),
      state.presenceStartedAt
    ]];

    if (!state.presenceRowNumber) {
      const rows = await fetchPresenceRows();
      const now = Date.now();
      const exact = rows.find(row => row.item.session_id === state.presenceSessionId);
      const reusable = rows.find(row => row.item.user_email === state.userEmail && (!Date.parse(row.item.last_seen || "") || now - Date.parse(row.item.last_seen || "") > PRESENCE_STALE_MS));
      state.presenceRowNumber = (exact || reusable)?.rowNumber || null;
    }

    if (state.presenceRowNumber) {
      await sheetsFetch("values:batchUpdate", {
        method: "POST",
        body: JSON.stringify({ valueInputOption: "RAW", data: [{ range: `'${PRESENCE_SHEET_NAME}'!A${state.presenceRowNumber}:H${state.presenceRowNumber}`, values }] })
      });
    } else {
      const range = `'${PRESENCE_SHEET_NAME}'!A:H`;
      const result = await sheetsFetch(`values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: "POST",
        body: JSON.stringify({ majorDimension: "ROWS", values })
      });
      const updatedRange = result?.updates?.updatedRange || "";
      const match = updatedRange.match(/!A(\d+):/);
      if (match) state.presenceRowNumber = Number(match[1]);
    }
  }

  async function fetchPresenceRows() {
    const params = new URLSearchParams();
    params.append("ranges", `'${PRESENCE_SHEET_NAME}'!A:H`);
    params.set("majorDimension", "ROWS");
    const result = await sheetsFetch(`values:batchGet?${params}`);
    const values = result.valueRanges?.[0]?.values || [];
    const headerIndex = values.slice(0, 5).findIndex(row => PRESENCE_SCHEMA.every(header => row.map(String).includes(header)));
    if (headerIndex < 0) return [];
    const headers = values[headerIndex].map(String);
    return values.slice(headerIndex + 1).map((row, offset) => {
      const item = {};
      headers.forEach((header, index) => { item[header] = row[index] ?? ""; });
      return { rowNumber: headerIndex + 2 + offset, item };
    }).filter(row => row.item.session_id);
  }

  async function refreshPresence() {
    if (state.demoMode || !state.token) return;
    const now = Date.now();
    const rows = await fetchPresenceRows();
    state.presenceRows = rows.map(row => row.item).filter(item => {
      const t = Date.parse(item.last_seen || "");
      return Number.isFinite(t) && now - t <= PRESENCE_STALE_MS;
    });
    renderPresenceStatus();
    applyPresenceIndicators();
  }

  function renderPresenceStatus() {
    if (!el.activeUsersBadge) return;
    const unique = [...new Set(state.presenceRows.map(row => row.user_email).filter(Boolean))];
    const nextText = `접속 ${unique.length || (state.userEmail ? 1 : 0)}명`;
    if (el.activeUsersBadge.textContent !== nextText) {
      el.activeUsersBadge.textContent = nextText;
      el.activeUsersBadge.classList.remove("presence-pulse");
      requestAnimationFrame(() => el.activeUsersBadge.classList.add("presence-pulse"));
      window.setTimeout(() => el.activeUsersBadge.classList.remove("presence-pulse"), 420);
    }
    el.activeUsersBadge.title = unique.length ? unique.join("\n") : "현재 접속자";
  }

  function applyPresenceIndicators() {
    document.querySelectorAll("[data-collab-key].remote-editing").forEach(node => {
      node.classList.remove("remote-editing");
      node.style.removeProperty("--remote-color");
      node.removeAttribute("data-remote-editor");
      if (node.dataset.originalTitle !== undefined) {
        node.title = node.dataset.originalTitle;
        delete node.dataset.originalTitle;
      }
    });
    document.querySelectorAll(".remote-editor-chip").forEach(node => node.remove());
    document.querySelectorAll(".remote-editor-host").forEach(node => node.classList.remove("remote-editor-host"));

    const activeRows = state.presenceRows.filter(row => row.session_id !== state.presenceSessionId && row.entity_type && row.entity_id && row.field);
    activeRows.forEach(row => {
      const key = `${row.entity_type}::${row.entity_id}::${row.field}`;
      document.querySelectorAll("[data-collab-key]").forEach(node => {
        const nodeKey = node.dataset.collabKey || "";
        const match = nodeKey === key || (row.entity_type === "task" && nodeKey.startsWith("task::") && nodeKey.endsWith(`::${row.field}`) && nodeKey.split("::")[1].split(",").includes(row.entity_id));
        if (!match) return;
        const color = collaboratorColor(row.user_email);
        node.classList.add("remote-editing");
        node.style.setProperty("--remote-color", color);
        node.dataset.remoteEditor = row.user_email;
        if (node.dataset.originalTitle === undefined) node.dataset.originalTitle = node.title || "";
        node.title = `${row.user_email} 작성 중`;

        const host = collaboratorBadgeHost(node);
        if (!host) return;
        host.classList.add("remote-editor-host");
        if ([...host.querySelectorAll(".remote-editor-chip")].some(chip => chip.dataset.sessionId === row.session_id)) return;
        const chip = document.createElement("span");
        chip.className = "remote-editor-chip";
        chip.dataset.sessionId = row.session_id;
        chip.style.setProperty("--remote-color", color);
        chip.title = `${row.user_email} 작성 중`;
        chip.innerHTML = `<span class="remote-editor-dot" aria-hidden="true"></span><span class="remote-editor-name"></span>`;
        chip.querySelector(".remote-editor-name").textContent = collaboratorLabel(row.user_email);
        host.appendChild(chip);
      });
    });
  }

  function collaboratorBadgeHost(node) {
    return node.closest(".task-title-wrap, .task-cell, td, .project-rail, .period-pane") || node.parentElement;
  }

  function collaboratorLabel(email) {
    const text = String(email || "다른 사용자").trim();
    const local = text.includes("@") ? text.split("@")[0] : text;
    return `${local || "다른 사용자"} 작성 중`;
  }

  function collaboratorColor(email) {
    const palette = ["#44599C", "#0095FF", "#8B6FA8", "#B56A4B", "#2F7D6B", "#B08A3E"];
    let hash = 0;
    for (const char of String(email || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }

  async function setPresenceEditing(entityType, entityId, field) {
    state.currentEditPresence = { entityType, entityId, field };
    await upsertPresence(state.currentEditPresence);
  }
  async function clearPresenceEditing() {
    if (!state.currentEditPresence) return;
    state.currentEditPresence = null;
    await upsertPresence(null);
  }

  async function syncRemoteDataIfIdle() {
    if (state.demoMode || !state.token || state.loading || state.savePromise || state.dirty) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.matches("input, textarea, select, [contenteditable='true']")) return;
    const currentWeekId = state.currentWeekId;
    const data = await loadSheetsData();
    assignData(data);
    if (currentWeekId && state.weeks.some(week => week.week_id === currentWeekId)) state.currentWeekId = currentWeekId;
    state.remoteSnapshot = deepClone(serializableData());
    render();
    applyPresenceIndicators();
  }

  async function sheetsFetch(path, options = {}, allowAuthRetry = true, retryCount = 0) {
    if (!state.token) throw new Error("Google 연결이 필요합니다.");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(CONFIG.SPREADSHEET_ID)}/${path}`;
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${state.token}`, "Content-Type": "application/json", ...(options.headers || {}) }
      });
    } catch (error) {
      const method = String(options.method || "GET").toUpperCase();
      if (method === "GET" && retryCount < 2) {
        await delay(350 * (retryCount + 1));
        return sheetsFetch(path, options, allowAuthRetry, retryCount + 1);
      }
      throw error;
    }
    if (response.status === 401) {
      clearGoogleSessionToken();
      state.token = null;
      state.tokenExpiresAt = 0;
      applyModeUi();
      if (allowAuthRetry && await refreshGoogleTokenSilently()) {
        return sheetsFetch(path, options, false, retryCount);
      }
      throw new Error("Google 인증이 만료되었습니다. 상단의 Google 연결 버튼을 한 번 눌러 주세요.");
    }
    const method = String(options.method || "GET").toUpperCase();
    if (!response.ok && method === "GET" && retryCount < 2 && [408, 429, 500, 502, 503, 504].includes(response.status)) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 350 * (retryCount + 1));
      return sheetsFetch(path, options, allowAuthRetry, retryCount + 1);
    }
    if (!response.ok) {
      let message = `Google Sheets API 오류 (${response.status})`;
      try { message = (await response.json()).error?.message || message; } catch (_) { /* noop */ }
      throw new Error(message);
    }
    return response.status === 204 ? {} : response.json();
  }

  function applyModeUi() {
    el.connectButton.disabled = false;
    if (el.rememberLoginCheckbox) {
      el.rememberLoginCheckbox.checked = state.rememberGoogleAccount;
      el.rememberLoginCheckbox.disabled = state.demoMode || state.authenticating;
    }
    if (state.demoMode) {
      el.modeBadge.textContent = "DEMO";
      el.connectButton.textContent = "Google 설정 필요";
      setStatus("데모 모드 · 브라우저 저장");
    } else if (state.authenticating) {
      el.modeBadge.textContent = "GOOGLE";
      el.connectButton.textContent = "연결 확인 중…";
      el.connectButton.disabled = true;
      setStatus("Google 인증을 준비하는 중입니다.");
    } else if (state.token) {
      el.modeBadge.textContent = state.userEmail || "CONNECTED";
      el.connectButton.textContent = "연결됨";
      setStatus("Google Sheets 연결됨");
    } else {
      el.modeBadge.textContent = "GOOGLE";
      el.connectButton.textContent = "Google 연결";
      setStatus("Google 연결 대기");
    }
  }

  function visibleTasks() {
    return state.tasks.filter(task => task.week_id === state.currentWeekId && OWNER_ORDER.includes(task.owner));
  }

  function sortedWeeks() {
    return state.weeks.slice().sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
  }

  function currentWeek() { return state.weeks.find(week => week.week_id === state.currentWeekId); }
  function sortCriteria(a, b) { return (OWNER_INDEX[a.owner] ?? 99) - (OWNER_INDEX[b.owner] ?? 99) || num(a.sort_order) - num(b.sort_order); }
  function monthKey(week) { const end = parseIso(week.end_date); return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`; }

  function nextWeekRange(week) {
    if (!week) return "";
    const start = parseIso(week.start_date); start.setDate(start.getDate() + 7);
    const end = parseIso(week.end_date); end.setDate(end.getDate() + 7);
    return `${formatDate(isoDate(start))} ~ ${formatDate(isoDate(end))}`;
  }

  function loadReportZoom() {
    const raw = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (raw === null || raw === "") return 1;
    const saved = num(raw, 1);
    return ZOOM_LEVELS.reduce((best, level) => Math.abs(level - saved) < Math.abs(best - saved) ? level : best, 1);
  }

  function stepReportZoom(direction) {
    const index = ZOOM_LEVELS.findIndex(level => level === state.reportZoom);
    const nextIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, (index < 0 ? 2 : index) + direction));
    setReportZoom(ZOOM_LEVELS[nextIndex]);
  }

  function setReportZoom(value) {
    state.reportZoom = ZOOM_LEVELS.reduce((best, level) => Math.abs(level - value) < Math.abs(best - value) ? level : best, 1);
    localStorage.setItem(ZOOM_STORAGE_KEY, String(state.reportZoom));
    applyReportZoom();
  }

  function applyReportZoom() {
    if (!el.report) return;
    const scale = state.reportZoom || 1;
    el.zoomValue.textContent = `글자 ${Math.round(scale * 100)}%`;
    el.zoomOutButton.disabled = scale <= ZOOM_LEVELS[0];
    el.zoomInButton.disabled = scale >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

    // 레이아웃 폭은 그대로 유지하고 보고서 안의 글자와 입력 영역만 확대합니다.
    el.report.style.zoom = "";
    el.report.style.width = "";
    el.report.style.transform = "";
    el.report.style.transformOrigin = "";
    el.report.style.marginBottom = "";
    el.report.style.setProperty("--text-scale", String(scale));

    requestAnimationFrame(() => {
      autoResizeAll();
      requestAnimationFrame(autoResizeAll);
    });
  }

  function autoResizeAll() { requestAnimationFrame(() => document.querySelectorAll("textarea.auto-grow").forEach(autoResize)); }
  function autoResize(textarea) {
    const scale = state.reportZoom || 1;
    const style = window.getComputedStyle(textarea);
    const fontSize = parseFloat(style.fontSize) || 12 * scale;
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.4;
    const paddingY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const borderY = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    const singleLineHeight = Math.ceil(lineHeight + paddingY + borderY);
    const base = textarea.classList.contains("kpi-note-input")
      ? Math.round(42 * scale)
      : textarea.classList.contains("task-field")
        ? Math.round(27 * scale)
        : Math.round(34 * scale);

    textarea.style.height = "1px";
    const requiredHeight = Math.ceil(textarea.scrollHeight + borderY);
    const hasLineBreak = String(textarea.value || "").includes("\n");
    const isSingleLine = !hasLineBreak && requiredHeight <= Math.ceil(singleLineHeight + lineHeight * 0.35);
    const targetHeight = isSingleLine
      ? Math.max(base, singleLineHeight)
      : Math.max(base, requiredHeight);

    textarea.classList.toggle("is-single-line", isSingleLine);
    textarea.style.setProperty(
      "height",
      `${targetHeight}px`,
      textarea.classList.contains("project-name-input") ? "important" : ""
    );
  }

  function touch(options = {}) {
    state.changeVersion += 1;
    setDirty(true);
    // 텍스트 입력 중에는 API를 호출하지 않습니다.
    // 입력칸을 벗어나는 focusout/blur 또는 명확한 구조 변경 액션에서만 저장합니다.
    if (options.immediate === true) scheduleAutoSave(true);
  }
  function setDirty(value) { state.dirty = value; }
  function setStatus(message) { el.connectionStatus.textContent = message; }
  function setLoading(value, message = "처리 중입니다.") { state.loading = value; el.loadingOverlay.classList.toggle("hidden", !value); el.loadingText.textContent = message; }

  function initPameconEasterEgg() {
    const trigger = document.querySelector(".brand-mark");
    if (!trigger || trigger.dataset.pameconBound === "1") return;
    trigger.dataset.pameconBound = "1";
    trigger.classList.add("pamecon-trigger");
    trigger.setAttribute("aria-label", "PHARMEARTH");

    trigger.addEventListener("click", () => {
      const now = Date.now();
      pamecon.triggerClicks = pamecon.triggerClicks.filter(time => now - time <= PAMECON_CLICK_WINDOW_MS);
      pamecon.triggerClicks.push(now);
      if (pamecon.triggerClicks.length < 5) return;
      pamecon.triggerClicks = [];
      trigger.classList.remove("pamecon-secret-pulse");
      void trigger.offsetWidth;
      trigger.classList.add("pamecon-secret-pulse");
      window.setTimeout(() => trigger.classList.remove("pamecon-secret-pulse"), 460);

      if (pamecon.visible) {
        setPameconAction("jump");
        return;
      }
      try { localStorage.removeItem(PAMECON_HIDDEN_KEY); } catch (_) {}
      activatePamecon().catch(error => console.warn("PAMECON activation failed", error));
    });

    document.addEventListener("contextmenu", event => {
      if (!pamecon.visible || !pamecon.character) return;
      const rect = pamecon.character.getBoundingClientRect();
      const hit = event.clientX >= rect.left && event.clientX <= rect.right
        && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!hit) return;
      event.preventDefault();
      event.stopPropagation();
      openPameconMenu(event.clientX, event.clientY);
    }, true);

    document.addEventListener("pointerdown", event => {
      if (!pamecon.menu || pamecon.menu.hidden) return;
      if (pamecon.menu.contains(event.target)) return;
      closePameconMenu();
    }, true);

    window.addEventListener("resize", () => {
      if (!pamecon.visible) return;
      clampPameconPosition();
      renderPameconPosition();
      closePameconMenu();
    }, { passive: true });

    const warmup = () => preloadPameconActions(["appear", "walk", "idle"]).catch(() => {});
    if ("requestIdleCallback" in window) window.requestIdleCallback(warmup, { timeout: 5000 });
    else window.setTimeout(warmup, 2400);
  }

  function pameconAsset(action, frameIndex) {
    return `${PAMECON_ASSET_BASE}/${action}/${String(frameIndex + 1).padStart(2, "0")}.png?v=1.5.0`;
  }

  function preloadPameconActions(actions) {
    const jobs = [];
    actions.filter(name => PAMECON_FRAME_COUNTS[name]).forEach(action => {
      for (let index = 0; index < PAMECON_FRAME_COUNTS[action]; index += 1) {
        jobs.push(new Promise(resolve => {
          const image = new Image();
          image.onload = image.onerror = () => resolve();
          image.src = pameconAsset(action, index);
        }));
      }
    });
    return Promise.all(jobs);
  }

  function ensurePameconDom() {
    if (pamecon.root?.isConnected) return;

    const rootNode = document.createElement("div");
    rootNode.id = "pameconLayer";
    rootNode.className = "pamecon-layer";
    rootNode.setAttribute("aria-hidden", "true");

    const character = document.createElement("div");
    character.className = "pamecon-character";
    const sprite = document.createElement("img");
    sprite.className = "pamecon-sprite";
    sprite.alt = "";
    sprite.draggable = false;
    character.appendChild(sprite);
    rootNode.appendChild(character);

    const menu = document.createElement("div");
    menu.className = "pamecon-context-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <div class="pamecon-menu-title">PAMECON</div>
      <button type="button" class="pamecon-menu-item" role="menuitem">파메콘 숨기기</button>
    `;

    document.body.appendChild(rootNode);
    document.body.appendChild(menu);

    const hideButton = menu.querySelector(".pamecon-menu-item");
    hideButton.addEventListener("click", () => {
      closePameconMenu();
      requestPameconHide();
    });

    pamecon.root = rootNode;
    pamecon.character = character;
    pamecon.sprite = sprite;
    pamecon.menu = menu;
    pamecon.hideButton = hideButton;
  }

  async function activatePamecon() {
    ensurePameconDom();
    await preloadPameconActions(["appear", "walk", "idle"]);
    if (pamecon.visible) return;

    pamecon.pendingHide = false;
    pamecon.visible = true;
    pamecon.root.classList.add("visible");
    pamecon.direction = Math.random() < .5 ? -1 : 1;
    const width = getPameconVisualWidth();
    pamecon.x = Math.max(8, Math.min(window.innerWidth - width - 8, Math.round(window.innerWidth * (.64 + Math.random() * .2))));
    clampPameconPosition();
    renderPameconPosition();
    setPameconAction("appear");
    startPameconAnimation();
    preloadPameconActions(["sit", "jump", "stretch", "sleep", "exit"]).catch(() => {});
  }

  function startPameconAnimation() {
    if (pamecon.rafId) return;
    pamecon.lastTimestamp = 0;
    pamecon.rafId = window.requestAnimationFrame(tickPamecon);
  }

  function stopPameconAnimation() {
    if (pamecon.rafId) window.cancelAnimationFrame(pamecon.rafId);
    pamecon.rafId = null;
    pamecon.lastTimestamp = 0;
  }

  function pameconSequence(action) {
    const frames = Array.from({ length: PAMECON_FRAME_COUNTS[action] || 1 }, (_, index) => index);
    if (action === "idle") return [...frames, 6, 5, 4, 3, 2, 1, 0];
    if (action === "sit") return [0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 6, 5, 4, 3, 2, 1, 0];
    if (action === "stretch") return [...frames, 7, 6, 5, 4, 3, 2, 1, 0];
    if (action === "sleep") return [...frames, 7, 7, 7, 7, 7, 6, 5, 4, 3, 2, 1, 0];
    return frames;
  }

  function setPameconAction(action) {
    if (!pamecon.visible || !PAMECON_FRAME_COUNTS[action]) return;
    pamecon.action = action;
    pamecon.sequence = pameconSequence(action);
    pamecon.sequenceIndex = 0;
    pamecon.frameElapsed = 0;
    pamecon.actionElapsed = 0;
    pamecon.walkDuration = action === "walk" ? 2600 + Math.random() * 3900 : 0;
    renderPameconFrame(pamecon.sequence[0] || 0);
  }

  function tickPamecon(timestampValue) {
    pamecon.rafId = null;
    if (!pamecon.visible) return;

    if (!pamecon.lastTimestamp) pamecon.lastTimestamp = timestampValue;
    const delta = Math.min(80, Math.max(0, timestampValue - pamecon.lastTimestamp));
    pamecon.lastTimestamp = timestampValue;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      if (pamecon.action === "exit" || pamecon.pendingHide) {
        finalizePameconHide();
        return;
      }
      if (pamecon.action === "appear") setPameconAction("idle");
      renderPameconFrame(0);
      pamecon.rafId = window.requestAnimationFrame(tickPamecon);
      return;
    }

    const editing = isPameconEditingLocked();
    if (editing && pamecon.action === "walk") setPameconAction("idle");

    pamecon.frameElapsed += delta;
    pamecon.actionElapsed += delta;
    const interval = PAMECON_FRAME_MS[pamecon.action] || 150;

    if (pamecon.action === "walk") {
      if (!editing) {
        const speed = 42;
        pamecon.x += pamecon.direction * speed * (delta / 1000);
        const maxX = Math.max(8, window.innerWidth - getPameconVisualWidth() - 8);
        if (pamecon.x <= 8) {
          pamecon.x = 8;
          pamecon.direction = 1;
        } else if (pamecon.x >= maxX) {
          pamecon.x = maxX;
          pamecon.direction = -1;
        }
        renderPameconPosition();
      }

      if (pamecon.frameElapsed >= interval) {
        pamecon.frameElapsed %= interval;
        pamecon.sequenceIndex = (pamecon.sequenceIndex + 1) % PAMECON_FRAME_COUNTS.walk;
        renderPameconFrame(pamecon.sequenceIndex);
      }

      if (pamecon.actionElapsed >= pamecon.walkDuration) chooseNextPameconAction();
    } else if (pamecon.frameElapsed >= interval) {
      pamecon.frameElapsed %= interval;
      pamecon.sequenceIndex += 1;
      if (pamecon.sequenceIndex >= pamecon.sequence.length) {
        if (pamecon.action === "exit") {
          finalizePameconHide();
          return;
        }
        chooseNextPameconAction();
      } else {
        renderPameconFrame(pamecon.sequence[pamecon.sequenceIndex]);
      }
    }

    if (pamecon.visible) pamecon.rafId = window.requestAnimationFrame(tickPamecon);
  }

  function chooseNextPameconAction() {
    if (!pamecon.visible || pamecon.pendingHide) return;
    if (isPameconEditingLocked()) {
      setPameconAction("idle");
      return;
    }

    const roll = Math.random();
    if (roll < .47) setPameconAction("walk");
    else if (roll < .69) setPameconAction("idle");
    else if (roll < .79) setPameconAction("sit");
    else if (roll < .88) setPameconAction("jump");
    else if (roll < .95) setPameconAction("stretch");
    else setPameconAction("sleep");
  }

  function isPameconEditingLocked() {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return false;
    if (pamecon.menu?.contains(active)) return false;
    return active.matches("input, textarea, select, [contenteditable='true']");
  }

  function renderPameconFrame(frameIndex) {
    if (!pamecon.sprite || !pamecon.action) return;
    const safeIndex = Math.max(0, Math.min((PAMECON_FRAME_COUNTS[pamecon.action] || 1) - 1, frameIndex));
    pamecon.sprite.src = pameconAsset(pamecon.action, safeIndex);
    pamecon.sprite.style.transform = `scaleX(${pamecon.direction})`;
    pamecon.character.dataset.action = pamecon.action;
  }

  function getPameconVisualWidth() {
    if (!pamecon.character) return 108;
    return pamecon.character.getBoundingClientRect().width || 108;
  }

  function clampPameconPosition() {
    const maxX = Math.max(8, window.innerWidth - getPameconVisualWidth() - 8);
    pamecon.x = Math.max(8, Math.min(maxX, Number.isFinite(pamecon.x) ? pamecon.x : maxX * .7));
  }

  function renderPameconPosition() {
    if (!pamecon.character) return;
    pamecon.character.style.transform = `translate3d(${Math.round(pamecon.x)}px, 0, 0)`;
  }

  function openPameconMenu(clientX, clientY) {
    if (!pamecon.menu) return;
    pamecon.menu.hidden = false;
    pamecon.menu.style.left = `${Math.max(8, clientX)}px`;
    pamecon.menu.style.top = `${Math.max(8, clientY)}px`;
    const rect = pamecon.menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) pamecon.menu.style.left = `${Math.max(8, window.innerWidth - rect.width - 8)}px`;
    if (rect.bottom > window.innerHeight - 8) pamecon.menu.style.top = `${Math.max(8, window.innerHeight - rect.height - 8)}px`;
    pamecon.hideButton?.focus({ preventScroll: true });
  }

  function closePameconMenu() {
    if (pamecon.menu) pamecon.menu.hidden = true;
  }

  function requestPameconHide() {
    if (!pamecon.visible || pamecon.pendingHide) return;
    pamecon.pendingHide = true;
    try { localStorage.setItem(PAMECON_HIDDEN_KEY, "1"); } catch (_) {}
    setPameconAction("exit");
  }

  function finalizePameconHide() {
    closePameconMenu();
    pamecon.visible = false;
    pamecon.pendingHide = false;
    pamecon.action = "";
    if (pamecon.root) pamecon.root.classList.remove("visible");
    if (pamecon.sprite) pamecon.sprite.removeAttribute("src");
    stopPameconAnimation();
  }

  function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " error" : ""}`;
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    window.setTimeout(() => {
      toast.classList.add("closing");
      window.setTimeout(() => toast.remove(), 220);
    }, 3400);
  }
  function handleError(error) { console.error(error); showToast(error?.message || String(error), true); setStatus("오류 발생"); }

  function activateViewTab(target) {
    document.querySelectorAll("[data-view-target]").forEach(button => button.classList.toggle("active", button.dataset.viewTarget === target));
    if (target === "work") {
      document.getElementById("workSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    state.kpiScope = target === "all-kpi" ? "all" : "month";
    document.querySelectorAll("[data-kpi-scope]").forEach(button => button.classList.toggle("active", button.dataset.kpiScope === state.kpiScope));
    renderKpi();
    document.getElementById("kpiSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stripTaskMarker(value) {
    return String(value ?? "").replace(/^\s*[■▪●◆▶▣]+\s*/, "").trimStart();
  }

  function normalizeTaskTitles() {
    const groups = new Map();
    state.tasks
      .filter(task => OWNER_ORDER.includes(task.owner))
      .sort((a, b) => String(a.week_id).localeCompare(String(b.week_id))
        || (OWNER_INDEX[a.owner] ?? 99) - (OWNER_INDEX[b.owner] ?? 99)
        || num(a.project_order, 999) - num(b.project_order, 999)
        || String(a.project).localeCompare(String(b.project), "ko")
        || String(a.period).localeCompare(String(b.period), "ko")
        || num(a.sort_order, 999) - num(b.sort_order, 999))
      .forEach(task => {
        const key = [task.week_id, task.owner, task.project, task.period].join("|");
        const title = stripTaskMarker(task.title);
        if (title) groups.set(key, title);
        else if (groups.has(key)) task.title = groups.get(key);
        else task.title = "";
      });
  }

  function formatSaveToast(dateValue = new Date()) {
    const yy = String(dateValue.getFullYear()).slice(-2);
    const mm = String(dateValue.getMonth() + 1).padStart(2, "0");
    const dd = String(dateValue.getDate()).padStart(2, "0");
    const hh = String(dateValue.getHours()).padStart(2, "0");
    const mi = String(dateValue.getMinutes()).padStart(2, "0");
    const ss = String(dateValue.getSeconds()).padStart(2, "0");
    return `[${yy}-${mm}-${dd} ${hh}:${mi}:${ss} 저장되었습니다.]`;
  }

  function textCell(value) { const td = document.createElement("td"); td.textContent = value ?? ""; return td; }
  function num(value, fallback = 0) { const result = Number(value); return Number.isFinite(result) ? result : fallback; }
  function displayNumber(value) { return Number.isInteger(Number(value)) ? Number(value).toLocaleString("ko-KR") : Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 }); }
  function formatPercent(value) { return `${(num(value) * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`; }
  function parseIso(value) { const [y, m, d] = String(value).split("-").map(Number); return new Date(y, m - 1, d); }
  function isoDate(dateValue) { return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`; }
  function formatDate(value) { if (!value) return ""; const dateValue = parseIso(value); return `${String(dateValue.getMonth() + 1).padStart(2, "0")}.${String(dateValue.getDate()).padStart(2, "0")}`; }
  function formatDateLong(value) { if (!value) return ""; const dateValue = parseIso(value); const day = ["일", "월", "화", "수", "목", "금", "토"][dateValue.getDay()]; return `${dateValue.getFullYear()}.${String(dateValue.getMonth() + 1).padStart(2, "0")}.${String(dateValue.getDate()).padStart(2, "0")}(${day})`; }
  function timestamp() { const now = new Date(); return `${isoDate(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`; }
  function makeId(prefix) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; }
  function delay(ms) { return new Promise(resolve => window.setTimeout(resolve, ms)); }
  function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
  function pick(row, headers) { return Object.fromEntries(headers.map(header => [header, row[header] ?? ""])); }
  function sheetName(key) { return CONFIG.SHEET_NAMES?.[key] || key; }
  function quotedSheet(key) { return `'${String(sheetName(key)).replaceAll("'", "''")}'`; }

  function isoWeekId(value) {
    const dateValue = parseIso(value);
    const target = new Date(dateValue.valueOf());
    const dayNumber = (dateValue.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDayNumber = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3);
    const week = 1 + Math.round((target - firstThursday) / 604800000);
    return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
})();
