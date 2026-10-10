/**
 * @file mermaid-diagram.ts
 * @author liunannan
 * @date 2026-10-10
 * @description 已绘制 Mermaid 图的文件名、SVG 尺寸与导出；调用方须传入消毒后的 SVG
 */

const VIEWBOX =
  /viewBox=["']\s*([-\d.eE]+)(?:[,\s]+)([-\d.eE]+)(?:[,\s]+)([-\d.eE]+)(?:[,\s]+)([-\d.eE]+)\s*["']/;

/** 下载名：会话标题加序号，去掉路径和 Windows 非法字符。 */
export function diagramFileBase(title: string, index: number) {
  const cleaned = [...String(title || '')]
    .map((ch) => (ch.charCodeAt(0) <= 31 || '\\/:*?"<>|'.includes(ch) ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 80);
  const name = cleaned || '图表';
  const n = Number.isFinite(index) && index > 0 ? Math.floor(index) : 1;
  return `${name}-${n}`;
}

/** 以 viewBox 为像素尺寸；没有有效尺寸时用 800×600。 */
export function svgPixelSize(svg: string) {
  const source = String(svg || '');
  const box = source.match(VIEWBOX);
  let width = box ? Number(box[3]) : 0;
  let height = box ? Number(box[4]) : 0;
  if (!(width > 0 && height > 0)) {
    const w = source.match(/\bwidth=["']\s*([\d.]+)(?:px)?\s*["']/i);
    const h = source.match(/\bheight=["']\s*([\d.]+)(?:px)?\s*["']/i);
    width = Number(w?.[1] || 0);
    height = Number(h?.[1] || 0);
  }
  if (!(width > 0 && height > 0)) {
    width = 800;
    height = 600;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

/** 补上 SVG 命名空间，便于单独打开或光栅化。非 SVG 返回空串。 */
export function prepareSvgMarkup(svg: string) {
  const text = String(svg || '').trim();
  if (!text.includes('<svg')) return '';
  if (/xmlns=/.test(text)) return text;
  return text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

/**
 * 给灯箱副本换一套 id，避免和气泡里的图争用 url(#id)。
 * 长 id 先替换，避免短 id 截断长 id。
 */
export function namespaceSvgIds(svg: string, prefix: string) {
  const ids = new Set<string>();
  const re = /\sid=(["'])([^"']+)\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(svg))) ids.add(match[2]);
  const ordered = [...ids].sort((a, b) => b.length - a.length);
  let out = svg;
  for (const id of ordered) {
    const next = `${prefix}${id}`;
    out = out.split(`id="${id}"`).join(`id="${next}"`);
    out = out.split(`id='${id}'`).join(`id='${next}'`);
    out = out.split(`url(#${id})`).join(`url(#${next})`);
    out = out.split(`href="#${id}"`).join(`href="#${next}"`);
    out = out.split(`href='#${id}'`).join(`href='#${next}'`);
    out = out.split(`xlink:href="#${id}"`).join(`xlink:href="#${next}"`);
  }
  return out;
}

/** 触发本机下载。文件名里的斜杠会先换成空格。 */
export function downloadBlob(blob: Blob, filename: string) {
  const safeName = filename.replace(/[\\/]/g, ' ').replace(/\s+/g, ' ').trim() || '图表';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** 写成明确像素宽高，避免 width="100%" 在画布上被按默认 300×150 光栅化。 */
export function svgAtPixelSize(svg: string, width: number, height: number) {
  const markup = prepareSvgMarkup(svg);
  if (!markup) return '';
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  return markup.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    const next = attrs
      .replace(/\swidth\s*=\s*["'][^"']*["']/i, '')
      .replace(/\sheight\s*=\s*["'][^"']*["']/i, '');
    return `<svg${next} width="${w}" height="${h}">`;
  });
}

/** 按 2 倍把消毒后的 SVG 画到铺了阅读面底色的画布上。 */
export async function svgToPngBlob(svg: string, background: string) {
  const markup = prepareSvgMarkup(svg);
  if (!markup) throw new Error('svg');
  const { width, height } = svgPixelSize(markup);
  const scale = 2;
  const maxPx = 8192;
  const edge = Math.max(width, height) * scale;
  const factor = edge > maxPx ? maxPx / edge : 1;
  const canvasW = Math.max(1, Math.round(width * scale * factor));
  const canvasH = Math.max(1, Math.round(height * scale * factor));
  const sized = svgAtPixelSize(markup, canvasW, canvasH);
  const blob = new Blob([sized || markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = background || '#eef1f8';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, 0, 0, canvasW, canvasH);
    const png = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), 'image/png');
    });
    if (!png) throw new Error('png');
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 优先把 PNG 写入剪贴板。浏览器拒绝图片剪贴板时改为下载。
 * ClipboardItem 接受 Promise，便于还在用户点击的激活期内发起写入。
 */
export async function copyOrDownloadPng(svg: string, background: string, filename: string) {
  const pngPromise = svgToPngBlob(svg, background);
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await clipboard.write([new ClipboardItem({ 'image/png': pngPromise })]);
      return 'copied' as const;
    } catch {
      /* 无图片剪贴板权限时改为下载 */
    }
  }
  const png = await pngPromise;
  downloadBlob(png, filename);
  return 'downloaded' as const;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg image'));
    img.src = url;
  });
}
