(() => {
  "use strict";

  const EXPORTER_VERSION = "1.0.0-sheetjs";

  function cleanText(value) {
    return String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }

  function buildWorkbook(meta, records) {
    if (!globalThis.XLSX) throw new Error("엑셀 생성 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 페이지를 새로고침해 주세요.");

    const owner = cleanText(meta.owner);
    const year = Number(meta.year);
    const month = Number(meta.month);
    const safeRecords = (records || []).map(record => ({
      week: cleanText(record.week),
      project: cleanText(record.project),
      title: cleanText(record.title),
      details: cleanText(record.details),
      dueDate: cleanText(record.dueDate)
    }));

    const rows = [
      [`${owner} ${year}년 ${month}월 월간 성과`, "", "", "", ""],
      ["담당자", owner, "대상 월", `${year}년 ${String(month).padStart(2, "0")}월`, ""],
      ["집계 기준", "주차 종료일이 선택 월에 포함되는 주차의 금주 작업", "", "", ""],
      ["총 작업 건수", `${safeRecords.length}건`, "", "", ""],
      ["", "", "", "", ""],
      ["주차", "프로젝트", "작업명", "상세", "완료/예정일"],
      ...safeRecords.map(record => [record.week, record.project, record.title, record.details, record.dueDate])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!merges"] = [
      XLSX.utils.decode_range("A1:E1"),
      XLSX.utils.decode_range("B3:E3"),
      XLSX.utils.decode_range("B4:E4")
    ];
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 24 },
      { wch: 34 },
      { wch: 72 },
      { wch: 16 }
    ];
    worksheet["!rows"] = rows.map((row, index) => {
      if (index === 0) return { hpt: 28 };
      if (index === 5) return { hpt: 24 };
      if (index < 6) return { hpt: 21 };
      const text = `${row[2] || ""}\n${row[3] || ""}`;
      const lineCount = Math.max(1, text.split("\n").length, Math.ceil(text.length / 85));
      return { hpt: Math.min(130, 20 + lineCount * 13) };
    });
    worksheet["!autofilter"] = { ref: `A6:E${Math.max(6, rows.length)}` };
    worksheet["!freeze"] = { xSplit: 0, ySplit: 6, topLeftCell: "A7", activePane: "bottomLeft", state: "frozen" };

    // 모든 텍스트 셀은 줄바꿈 표시를 우선합니다. SheetJS CE에서 지원되는 범위 내 속성입니다.
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:E6");
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell) continue;
        cell.s = {
          alignment: { vertical: "top", wrapText: true },
          font: { name: "맑은 고딕", sz: row === 0 ? 16 : 10, bold: row === 0 || row === 5 },
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "월간성과");
    workbook.Props = {
      Title: `${owner} ${year}년 ${month}월 월간 성과`,
      Subject: "플랫폼기획팀 월별 성과 취합",
      Author: "파메어스 플랫폼기획팀",
      Company: "파메어스",
      CreatedDate: new Date()
    };
    return workbook;
  }

  function createWorkbookBytes(meta, records) {
    const workbook = buildWorkbook(meta, records);
    return XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true, compression: true });
  }

  function downloadMonthlyPerformance(meta, records) {
    if (!records?.length) throw new Error("출력할 월간 성과 데이터가 없습니다.");
    const workbook = buildWorkbook(meta, records);
    const fileName = `${cleanText(meta.owner)}_${Number(meta.year)}년_${String(Number(meta.month)).padStart(2, "0")}월_월간성과.xlsx`;
    XLSX.writeFile(workbook, fileName, { bookType: "xlsx", cellStyles: true, compression: true });
  }

  globalThis.PHARM_XLSX_EXPORTER = { createWorkbookBytes, downloadMonthlyPerformance, version: EXPORTER_VERSION };
})();
