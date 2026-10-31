// 전체화면. 데스크톱 앱(Tauri)이면 창을, 브라우저면 문서를 전체화면으로
interface TauriWindow {
  isFullscreen(): Promise<boolean>;
  setFullscreen(v: boolean): Promise<void>;
}

function tauriWindow(): TauriWindow | null {
  const tauri = (window as unknown as { __TAURI__?: { window: { getCurrentWindow(): TauriWindow } } }).__TAURI__;
  return tauri ? tauri.window.getCurrentWindow() : null;
}

export function toggleFullscreen(): void {
  const w = tauriWindow();
  if (w) {
    w.isFullscreen().then((f) => w.setFullscreen(!f)).catch(() => undefined);
    return;
  }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  else document.documentElement.requestFullscreen().catch(() => undefined);
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}
