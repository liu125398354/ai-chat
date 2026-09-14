/**
 * @file clipboard.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 复制到剪贴板；Clipboard API 失败时回退 execCommand
 */

export async function copyText(text: string) {
  const value = text ?? '';
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* 无权限或非安全上下文时走回退 */
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
