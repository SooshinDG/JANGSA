/**
 * 브라우저 파일 다운로드 유틸.
 * Blob + URL.createObjectURL 기반. 클라이언트 전용.
 */

export function downloadTextFile(
  filename: string,
  text: string,
  mimeType: string = "text/plain;charset=utf-8",
): void {
  if (typeof window === "undefined") {
    throw new Error("downloadTextFile 은 브라우저 환경에서만 사용할 수 있습니다.");
  }

  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // 다운로드 시작 후 URL 해제
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(filename: string, data: unknown): void {
  const text = JSON.stringify(data, null, 2);
  downloadTextFile(filename, text, "application/json;charset=utf-8");
}

/** UTF-8 BOM 을 포함시켜 엑셀에서 한글 깨짐 방지 */
export function downloadCsv(filename: string, csvText: string): void {
  const BOM = "\uFEFF";
  downloadTextFile(filename, BOM + csvText, "text/csv;charset=utf-8");
}
