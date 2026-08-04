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
  const GOOGLE_IDENTITY_WAIT_MS = 10000;
  const PLACEHOLDER_CLIENT_ID = "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com";
  const PLACEHOLDER_SHEET_ID = "YOUR_GOOGLE_SPREADSHEET_ID";

  const SCHEMA = {
    weeks: ["week_id", "start_date", "end_date", "created_at", "updated_at", "updated_by"],
    tasks: ["task_id", "week_id", "owner", "project", "project_order", "period", "title", "details", "due_date", "sort_order", "kpi_code", "kpi_qty", "deleted", "updated_at", "updated_by"],
    kpis: ["kpi_id", "week_id", "kpi_code", "kpi_name", "owner", "actual", "note", "legacy_target", "sort_order", "deleted", "updated_at", "updated_by"],
    criteria: ["kpi_code", "kpi_name", "category", "owner", "weight", "annual_target", "m1_target", "m2_target", "m3_target", "m4_target", "m5_target", "m6_target", "m7_target", "m8_target", "m9_target", "m10_target", "m11_target", "m12_target", "sort_order", "active"],
    decisions: ["decision_id", "week_id", "item", "summary", "decision", "note", "sort_order", "deleted", "updated_at", "updated_by"]
  };

  const DISPLAY_HEADERS = {
    weeks: [
      "주차 ID (상단 주차 선택·데이터 연결)", "시작일 (보고 기간 시작)", "종료일 (보고 기간 종료)",
      "생성일시 (자동)", "최종 수정일시 (자동)", "최종 수정자 (자동)"
    ],
    tasks: [
      "작업 ID (내부 저장용)", "주차 ID (해당 보고 주차 연결)", "담당자 (인원별 구분 헤더)",
      "프로젝트명 (담당자 아래 프로젝트 제목)", "프로젝트 순서 (드래그앤드롭)", "금주/차주 구분 (좌우 영역)",
      "작업명 (작업명 입력칸)", "상세 내용 (상세 입력칸)", "완료/예정일 (예: 07/01(수))",
      "프로젝트 내 작업 순서 (드래그앤드롭)", "연결 KPI 코드 (화면 비노출)", "KPI 실적 수량 (자동 합산 대상)",
      "삭제 여부 (Y=화면 제외)", "최종 수정일시 (자동)", "최종 수정자 (자동)"
    ],
    kpis: [
      "KPI 실적 ID (내부 저장용)", "주차 ID (해당 주차 실적)", "KPI 코드 (정량지표 연결·화면 비노출)",
      "KPI명 (HTML KPI 표의 정량지표)", "담당자 (KPI 담당자)", "실적 (주차 KPI 실적 입력)",
      "비고 (KPI 표 비고)", "기존 목표값 (과거 자료 보존용·현재 계산 미사용)", "KPI 표시 순서",
      "삭제 여부 (Y=화면 제외)", "최종 수정일시 (자동)", "최종 수정자 (자동)"
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
      "주요내용", "의사결정 사항", "비고", "표시 순서", "삭제 여부 (Y=화면 제외)",
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
    googleIdentityReady: false
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    state.demoMode = CONFIG.DEMO_MODE !== false;
    state.reportZoom = loadReportZoom();
    applyModeUi();
    applyReportZoom();
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
    } catch (error) {
      state.googleIdentityReady = false;
      handleError(error);
    } finally {
      state.authenticating = false;
      applyModeUi();
      setLoading(false);
      if (state.googleIdentityReady && !state.token) {
        setStatus("Google 연결 버튼을 눌러 주세요 · 승인 이력이 있으면 계정 선택 없이 연결됩니다.");
      }
    }
  }

  function cacheElements() {
    [
      "modeBadge", "connectButton", "weekSelect", "prevWeekButton", "nextWeekButton",
      "zoomOutButton", "zoomResetButton", "zoomInButton", "zoomValue", "report",
      "newWeekButton", "monthlyExportButton", "reloadButton", "saveButton", "reportTitle", "reportMeta",
      "ownerSections", "kpiScopeLabel", "kpiSummaryCards", "kpiTableBody", "decisionList", "addDecisionButton",
      "connectionStatus", "toastContainer", "loadingOverlay", "loadingText",
      "projectDialog", "projectForm", "projectOwner", "projectName",
      "taskDialog", "taskForm", "taskDialogTitle", "taskId", "taskOwner", "taskProject", "taskPeriod", "taskDueDate",
      "taskTitle", "taskDetails", "taskKpiSelect", "taskKpiQty", "deleteTaskButton",
      "decisionDialog", "decisionForm", "decisionId", "decisionItem", "decisionSummary", "decisionRequired", "decisionNote", "deleteDecisionButton",
      "weekDialog", "weekForm", "weekStartDate", "weekEndDate", "weekCarryOver",
      "monthlyExportDialog", "monthlyExportForm", "monthlyExportOwner", "monthlyExportYear", "monthlyExportMonth", "monthlyExportCount"
    ].forEach(id => { el[id] = document.getElementById(id); });
  }

  function bindEvents() {
    el.connectButton.addEventListener("click", connectGoogle);
    el.weekSelect.addEventListener("change", () => changeWeek(el.weekSelect.value));
    el.prevWeekButton.addEventListener("click", () => moveWeek(1));
    el.nextWeekButton.addEventListener("click", () => moveWeek(-1));
    el.newWeekButton.addEventListener("click", openWeekDialog);
    el.monthlyExportButton.addEventListener("click", openMonthlyExportDialog);
    el.reloadButton.addEventListener("click", refreshData);
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

    document.addEventListener("focusout", event => {
      if (event.target.matches(".task-field, .project-name-input, .kpi-actual-input, .kpi-note-input, dialog input, dialog textarea, dialog select")) {
        scheduleAutoSave(true);
      }
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
  }

  async function loadData() {
    setLoading(true, "주간보고 데이터를 불러오는 중입니다.");
    try {
      const data = state.demoMode ? loadDemoStore() : await loadSheetsData();
      assignData(data);
      setDirty(false);
      render();
      setStatus(state.demoMode ? "데모 데이터 로드 완료" : "Google Sheets 연결 완료");
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
    normalizeTaskTitles();
    state.kpis = normalizeRows(data.kpis || [], "kpis").filter(kpi => OWNER_ORDER.includes(kpi.owner));
    state.criteria = normalizeRows(data.criteria || [], "criteria").filter(item => OWNER_ORDER.includes(item.owner) && item.active !== "N");
    state.decisions = normalizeRows(data.decisions || [], "decisions");
    const weeks = sortedWeeks();
    if (!state.currentWeekId || !weeks.some(week => week.week_id === state.currentWeekId)) {
      state.currentWeekId = weeks[0]?.week_id || null;
    }
  }

  function normalizeRows(rows, key) {
    return rows.map(row => {
      const item = { ...row };
      if (key === "tasks") {
        item.project_order = num(item.project_order, 1);
        item.sort_order = num(item.sort_order, 1);
        item.kpi_qty = num(item.kpi_qty, 0);
        item.title = stripTaskMarker(item.title);
        item.deleted = item.deleted || "N";
      } else if (key === "kpis") {
        item.actual = num(item.actual, 0);
        item.legacy_target = num(item.legacy_target, 0);
        item.sort_order = num(item.sort_order, 1);
        item.deleted = item.deleted || "N";
      } else if (key === "criteria") {
        item.weight = num(item.weight, 0);
        item.annual_target = num(item.annual_target, 0);
        for (let month = 1; month <= 12; month += 1) item[`m${month}_target`] = num(item[`m${month}_target`], 0);
        item.sort_order = num(item.sort_order, 1);
      } else if (key === "decisions") {
        item.sort_order = num(item.sort_order, 1);
        item.deleted = item.deleted || "N";
      }
      return item;
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

    const header = document.createElement("header");
    header.className = "project-header";
    const handle = dragHandle("프로젝트 순서 변경");
    handle.addEventListener("dragstart", event => startProjectDrag(event, owner, project.name, article));
    handle.addEventListener("dragend", () => finishDrag(article));

    const projectInput = document.createElement("input");
    projectInput.className = "project-name-input";
    projectInput.value = project.name;
    projectInput.setAttribute("aria-label", `${owner} 프로젝트명`);
    projectInput.addEventListener("change", () => renameProject(owner, project.name, projectInput.value.trim(), projectInput));

    const actions = document.createElement("div");
    actions.className = "project-actions no-print";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button small danger-text";
    remove.textContent = "삭제";
    remove.addEventListener("click", () => deleteProject(owner, project.name));
    actions.append(remove);
    header.append(handle, projectInput, actions);

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
    article.append(header, periodGrid);
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
    columns.innerHTML = `<span>작업명</span><span>상세</span><span>완료/예정일</span>`;

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
      tasks.forEach(task => list.appendChild(buildTaskCard(task)));
    }
    list.addEventListener("dragover", event => dragOverTaskList(event, list));
    list.addEventListener("dragleave", event => { if (!list.contains(event.relatedTarget)) list.classList.remove("drag-over"); });
    list.addEventListener("drop", event => dropTaskAtEnd(event, list));
    pane.append(title, columns, list);
    return pane;
  }

  function buildTaskCard(task) {
    const card = document.createElement("div");
    card.className = "task-card";
    card.dataset.taskId = task.task_id;

    const handle = dragHandle("작업 순서 변경");
    handle.classList.add("task-drag");
    handle.addEventListener("dragstart", event => startTaskDrag(event, task, card));
    handle.addEventListener("dragend", () => finishDrag(card));

    const titleWrap = document.createElement("div");
    titleWrap.className = "task-title-wrap";
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

    const details = document.createElement("textarea");
    details.className = "task-field task-details-field auto-grow";
    details.rows = 1;
    details.value = task.details || "";
    details.placeholder = "상세 내용";
    bindTaskField(details, task, "details");

    const due = document.createElement("textarea");
    due.className = "task-field task-date-field auto-grow";
    due.rows = 1;
    due.maxLength = 14;
    due.placeholder = "07/01(수)";
    due.value = task.due_date || "";
    bindTaskField(due, task, "due_date");

    const menu = document.createElement("button");
    menu.type = "button";
    menu.className = "task-menu-button no-print";
    menu.title = "작업 설정";
    menu.textContent = "⋯";
    menu.addEventListener("click", () => openTaskDialog({ taskId: task.task_id }));

    card.addEventListener("dragover", event => dragOverTask(event, task, card));
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", event => dropTaskOnTask(event, task, card));
    card.append(handle, titleWrap, details, due, menu);
    return card;
  }

  function bindTaskField(control, task, field) {
    const eventName = control.tagName === "TEXTAREA" ? "input" : "change";
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
    touch();
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
    touch();
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
    touch();
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
    touch();
    renderOwners();
  }

  function deleteProject(owner, project) {
    if (!window.confirm(`${owner}의 '${project}' 프로젝트와 포함 작업을 삭제할까요?`)) return;
    visibleTasks().filter(task => task.owner === owner && task.project === project).forEach(task => { task.deleted = "Y"; });
    normalizeProjectOrders(owner);
    touch();
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
    touch();
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
    touch();
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
    touch();
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
      deleted: "N", updated_at: timestamp(), updated_by: state.userEmail || "web"
    };
  }

  function deleteTaskFromDialog() {
    const task = state.tasks.find(item => item.task_id === el.taskId.value);
    if (!task || !window.confirm("이 작업을 삭제할까요?")) return;
    task.deleted = "Y";
    normalizeTaskOrders(task.owner, task.project, task.period);
    touch();
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
        input.addEventListener("change", () => setWeekKpi(row.criterion, { actual: num(input.value, 0) }));
        input.addEventListener("blur", () => scheduleAutoSave(true));
        actualCell.appendChild(input);
        const note = document.createElement("textarea");
        note.className = "kpi-note-input auto-grow";
        note.rows = 1;
        note.value = getWeekKpiRow(row.criterion)?.note || "";
        note.placeholder = "비고";
        note.addEventListener("input", () => {
          autoResize(note);
          setWeekKpi(row.criterion, { note: note.value });
        });
        note.addEventListener("change", () => setWeekKpi(row.criterion, { note: note.value }));
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
    const row = state.kpis.find(item => item.week_id === weekId && item.kpi_code === criterion.kpi_code && item.owner === criterion.owner && !isDeleted(item));
    if (row) return num(row.actual, 0);
    return state.tasks
      .filter(task => task.week_id === weekId && task.owner === criterion.owner && task.period === "금주" && task.kpi_code === criterion.kpi_code && !isDeleted(task))
      .reduce((sum, task) => sum + num(task.kpi_qty, 0), 0);
  }

  function getWeekKpiRow(criterion) {
    return state.kpis.find(item => item.week_id === state.currentWeekId && item.kpi_code === criterion.kpi_code && item.owner === criterion.owner && !isDeleted(item));
  }

  function setWeekKpi(criterion, patch) {
    let row = getWeekKpiRow(criterion);
    if (!row) {
      row = {
        kpi_id: makeId("KPIROW"), week_id: state.currentWeekId, kpi_code: criterion.kpi_code,
        kpi_name: criterion.kpi_name, owner: criterion.owner, actual: 0, note: "", legacy_target: 0,
        sort_order: criterion.sort_order, deleted: "N", updated_at: timestamp(), updated_by: state.userEmail || "web"
      };
      state.kpis.push(row);
    }
    Object.assign(row, patch, { updated_at: timestamp(), updated_by: state.userEmail || "web" });
    touch();
    renderKpi();
  }

  function renderDecisions() {
    el.decisionList.innerHTML = "";
    const rows = state.decisions.filter(item => item.week_id === state.currentWeekId && !isDeleted(item)).sort((a, b) => num(a.sort_order) - num(b.sort_order));
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
        sort_order: state.decisions.filter(row => row.week_id === state.currentWeekId && !isDeleted(row)).length + 1,
        deleted: "N", updated_at: timestamp(), updated_by: state.userEmail || "web"
      };
      state.decisions.push(item);
    }
    Object.assign(item, {
      item: el.decisionItem.value, summary: el.decisionSummary.value, decision: el.decisionRequired.value,
      note: el.decisionNote.value, updated_at: timestamp(), updated_by: state.userEmail || "web"
    });
    touch();
    el.decisionDialog.close();
    renderDecisions();
  }

  function deleteDecisionFromDialog() {
    const item = state.decisions.find(row => row.decision_id === el.decisionId.value);
    if (!item || !window.confirm("이 항목을 삭제할까요?")) return;
    item.deleted = "Y";
    touch();
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
      ? state.tasks.filter(task => task.week_id === sourceWeekId && task.period === "차주" && !isDeleted(task) && OWNER_ORDER.includes(task.owner))
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
        deleted: "N",
        updated_at: timestamp(),
        updated_by: state.userEmail || "web"
      });
    });

    state.currentWeekId = id;
    touch();
    el.weekDialog.close();
    render();

    const message = sourceCarryTasks.length
      ? `새 주차를 생성하고 차주 업무 ${sourceCarryTasks.length}건을 이월했습니다.`
      : "새 주차를 생성했습니다.";
    showToast(message);
    scheduleAutoSave(true);
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
      .filter(task => weekIndex.has(task.week_id) && task.owner === owner && task.period === "금주" && !isDeleted(task))
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

  function scheduleAutoSave(immediate = false) {
    if (!state.dirty) return;
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = window.setTimeout(() => runAutoSave(), immediate ? 0 : 900);
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
    if (showLoading) setLoading(true, "변경사항을 저장하는 중입니다.");
    try {
      stampUpdatedRecords();
      const data = serializableData();
      if (state.demoMode) {
        try {
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
        } catch (_) {
          throw new Error("현재 환경에서는 브라우저 저장소를 사용할 수 없습니다. 웹서버 또는 GitHub Pages에서 실행하세요.");
        }
      } else {
        await saveSheetsData(data);
      }
      setDirty(state.changeVersion !== saveVersion);
      state.lastSavedAt = new Date();
      showToast(options.message || formatSaveToast(state.lastSavedAt));
      setStatus(state.demoMode ? "자동 저장 완료" : "Google Sheets 자동 저장 완료");
      return true;
    } catch (error) {
      handleError(error);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  function stampUpdatedRecords() {
    const now = timestamp();
    const by = state.userEmail || "web";
    const week = currentWeek();
    if (week) Object.assign(week, { updated_at: now, updated_by: by });
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
        if (state.userEmail) localStorage.setItem(LAST_GOOGLE_EMAIL_KEY, state.userEmail);
      }
    } catch (_) { /* optional */ }
  }

  function loadLastGoogleEmail() {
    try { return localStorage.getItem(LAST_GOOGLE_EMAIL_KEY) || ""; }
    catch (_) { return ""; }
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

  async function saveSheetsData(data) {
    if (!state.token && !(await refreshGoogleTokenSilently())) {
      throw new Error("Google 연결이 만료되었습니다. 상단의 Google 연결 버튼을 한 번 눌러 주세요.");
    }
    const keys = Object.keys(SCHEMA);
    await sheetsFetch("values:batchClear", {
      method: "POST",
      body: JSON.stringify({ ranges: keys.map(key => `${quotedSheet(key)}!A:AZ`) })
    });
    await sheetsFetch("values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: keys.map(key => ({
          range: `${quotedSheet(key)}!A1`,
          majorDimension: "ROWS",
          values: [DISPLAY_HEADERS[key], SCHEMA[key], ...data[key].map(row => SCHEMA[key].map(header => row[header] ?? ""))]
        }))
      })
    });
  }

  async function sheetsFetch(path, options = {}, allowAuthRetry = true) {
    if (!state.token) throw new Error("Google 연결이 필요합니다.");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(CONFIG.SPREADSHEET_ID)}/${path}`;
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${state.token}`, "Content-Type": "application/json", ...(options.headers || {}) }
    });
    if (response.status === 401) {
      state.token = null;
      state.tokenExpiresAt = 0;
      applyModeUi();
      if (allowAuthRetry && await refreshGoogleTokenSilently()) {
        return sheetsFetch(path, options, false);
      }
      throw new Error("Google 인증이 만료되었습니다. 상단의 Google 연결 버튼을 한 번 눌러 주세요.");
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
    return state.tasks.filter(task => task.week_id === state.currentWeekId && !isDeleted(task) && OWNER_ORDER.includes(task.owner));
  }

  function sortedWeeks() {
    return state.weeks.slice().sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
  }

  function currentWeek() { return state.weeks.find(week => week.week_id === state.currentWeekId); }
  function sortCriteria(a, b) { return (OWNER_INDEX[a.owner] ?? 99) - (OWNER_INDEX[b.owner] ?? 99) || num(a.sort_order) - num(b.sort_order); }
  function isDeleted(row) { return String(row.deleted || "N").toUpperCase() === "Y"; }
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
    const base = textarea.classList.contains("kpi-note-input") ? 42 : 38;
    const minHeight = Math.round(base * (state.reportZoom || 1));
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(minHeight, textarea.scrollHeight)}px`;
  }

  function touch(options = {}) {
    state.changeVersion += 1;
    setDirty(true);
    scheduleAutoSave(options.immediate === true);
  }
  function setDirty(value) { state.dirty = value; }
  function setStatus(message) { el.connectionStatus.textContent = message; }
  function setLoading(value, message = "처리 중입니다.") { state.loading = value; el.loadingOverlay.classList.toggle("hidden", !value); el.loadingText.textContent = message; }
  function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " error" : ""}`;
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
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
      .filter(task => OWNER_ORDER.includes(task.owner) && !isDeleted(task))
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
