<!--
  @file MarkdownView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-10-10
  @description 助手 Markdown：KaTeX、代码复制、已闭合 mermaid 的放大、复制与下载；流式跳过 KaTeX
-->

<template>
  <div class="md-wrap">
    <div ref="bodyRef" class="md-body markdown-body" v-html="html" @click="onBodyClick" />
    <Teleport to="body">
      <div v-if="viewer" class="mmd-viewer" @pointerdown.self="closeViewer" @wheel.prevent>
        <div
          ref="dialogRef"
          class="mmd-panel"
          role="dialog"
          aria-modal="true"
          aria-label="图表预览"
          tabindex="-1"
        >
          <div class="mmd-bar">
            <button type="button" class="mmd-btn" :aria-pressed="viewMode === 'fit'" @click="applyFit">
              适应窗口
            </button>
            <button
              type="button"
              class="mmd-btn"
              :aria-pressed="viewMode === 'manual' && scale === 1"
              @click="applyActual"
            >
              100%
            </button>
            <button type="button" class="mmd-btn" :disabled="zoomInDisabled" @click="zoomCenter(1.25)">
              放大
            </button>
            <button type="button" class="mmd-btn" :disabled="zoomOutDisabled" @click="zoomCenter(1 / 1.25)">
              缩小
            </button>
            <button ref="closeBtnRef" type="button" class="mmd-btn mmd-close" @click="closeViewer">关闭</button>
          </div>
          <div
            ref="stageRef"
            class="mmd-stage"
            @pointerdown="onPanDown"
            @pointermove="onPanMove"
            @pointerup="onPanEnd"
            @pointercancel="onPanEnd"
            @wheel.prevent="onStageWheel"
          >
            <div v-show="fitted" class="mmd-canvas" :style="canvasStyle" v-html="viewer.svg" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { message as antdMessage } from 'ant-design-vue';
import DOMPurify from 'dompurify';
import { markdown as md, markdownLive } from '@/utils/markdown';
import { closedMermaidBodies } from '@/utils/mermaid-fence';
import { copyText } from '@/utils/clipboard';
import {
  copyOrDownloadPng,
  diagramFileBase,
  downloadBlob,
  namespaceSvgIds,
  prepareSvgMarkup,
  svgPixelSize,
  svgToPngBlob,
} from '@/utils/mermaid-diagram';
import 'katex/dist/katex.min.css';
import 'github-markdown-css/github-markdown-light.css';
import 'highlight.js/styles/github.min.css';

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const FIT_PAD = 24;

let katexHooked = false;

function ensureKatexPurifyHook() {
  if (katexHooked) return;
  katexHooked = true;
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName !== 'style') return;
    const el = node as Element;
    const inKatex =
      el.classList?.contains('katex') ||
      (typeof el.closest === 'function' && el.closest('.katex'));
    if (inKatex) {
      data.forceKeepAttr = true;
    }
  });
}

const props = defineProps({
  source: { type: String, default: '' },
  live: { type: Boolean, default: false },
  exportTitle: { type: String, default: '' },
});
const displaySource = ref(props.source);
const bodyRef = ref<HTMLElement | null>(null);
const svgCache = new Map<string, string>();
const svgByBlock = new WeakMap<HTMLElement, string>();
const sourceShown = new Set<string>();
const viewer = ref<{ svg: string; width: number; height: number } | null>(null);
const dialogRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const closeBtnRef = ref<HTMLButtonElement | null>(null);
const panX = ref(0);
const panY = ref(0);
const scale = ref(1);
const viewMode = ref<'fit' | 'manual'>('fit');
const fitted = ref(false);
const zoomInDisabled = computed(() => scale.value >= MAX_SCALE - 1e-6);
const zoomOutDisabled = computed(() => scale.value <= MIN_SCALE + 1e-6);
const canvasStyle = computed(() => {
  const box = viewer.value;
  if (!box) return {};
  return {
    width: `${box.width}px`,
    height: `${box.height}px`,
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  };
});
let paintTicket = 0;
let mermaidSeq = 0;
let stageObserver: ResizeObserver | null = null;
let returnFocus: HTMLElement | null = null;
let diagramCopyTimer = 0;
let diagramCopyBtn: HTMLButtonElement | null = null;
let panSession: { id: number; x: number; y: number; panX: number; panY: number; moved: boolean } | null = null;
let mermaidApi: typeof import('mermaid').default | null = null;

/** 按需加载 mermaid，避免没有图表的会话把库打进首屏。 */
async function loadMermaid() {
  if (!mermaidApi) {
    const mod = await import('mermaid');
    mermaidApi = mod.default;
    mermaidApi.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      suppressErrorRendering: true,
      logLevel: 'fatal',
    });
  }
  return mermaidApi;
}

function sanitizeSvg(svg: string) {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

function markMermaid(block: HTMLElement, state: 'pending' | 'error' | 'ready') {
  block.classList.toggle('is-pending', state === 'pending');
  block.classList.toggle('is-error', state === 'error');
  block.classList.toggle('is-ready', state === 'ready');
}

/**
 * 把已闭合的 mermaid 围栏画成 SVG。流式中未闭合的围栏保持源码，避免半截语法反复报错。
 */
async function paintDiagrams() {
  const ticket = ++paintTicket;
  const root = bodyRef.value;
  if (!root) return;
  const blocks = [...root.querySelectorAll<HTMLElement>('.mermaid-block')];
  if (!blocks.length) return;
  const closed = new Set(closedMermaidBodies(displaySource.value || ''));
  const api = await loadMermaid();
  if (ticket !== paintTicket || !bodyRef.value) return;

  for (const block of blocks) {
    if (ticket !== paintTicket) return;
    const raw = block.querySelector('.mermaid-src code')?.textContent ?? '';
    const view = block.querySelector<HTMLElement>('.mermaid-view');
    if (!view) continue;
    const ready = !props.live || closed.has(raw);
    if (!ready) {
      markDiagram(block, 'pending', view);
      continue;
    }
    let svg = svgCache.get(raw);
    if (!svg) {
      try {
        const parsed = await api.parse(raw, { suppressErrors: true });
        if (ticket !== paintTicket) return;
        if (!parsed) {
          markDiagram(block, props.live ? 'pending' : 'error', view);
          continue;
        }
        const rendered = await api.render(`mmd-${Date.now().toString(36)}-${++mermaidSeq}`, raw);
        if (ticket !== paintTicket) return;
        svg = sanitizeSvg(rendered.svg);
        if (!svg.includes('<svg')) {
          markDiagram(block, props.live ? 'pending' : 'error', view);
          continue;
        }
        svgCache.set(raw, svg);
        if (svgCache.size > 32) {
          const oldest = svgCache.keys().next().value;
          if (oldest) svgCache.delete(oldest);
        }
      } catch {
        markDiagram(block, props.live ? 'pending' : 'error', view);
        continue;
      }
    }
    view.innerHTML = svg;
    svgByBlock.set(block, svg);
    markMermaid(block, 'ready');
    block.classList.toggle('is-source', sourceShown.has(raw));
    ensureToolbar(block);
    syncSourceLabel(block);
  }
}

/** 未绘制成功时收起工具条，避免对半成品或失败图导出。 */
function markDiagram(block: HTMLElement, state: 'pending' | 'error', view: HTMLElement) {
  markMermaid(block, state);
  view.replaceChildren();
  svgByBlock.delete(block);
  block.classList.remove('is-source');
  block.querySelector('.mermaid-toolbar')?.remove();
}

function ensureToolbar(block: HTMLElement) {
  if (block.querySelector('.mermaid-toolbar')) return;
  const bar = buildToolbar();
  const head = block.querySelector('.mermaid-head');
  if (head) head.append(bar);
  else block.prepend(bar);
}

function syncSourceLabel(block: HTMLElement) {
  const btn = block.querySelector<HTMLButtonElement>('[data-act="toggle-src"]');
  if (!btn || btn === diagramCopyBtn) return;
  btn.textContent = block.classList.contains('is-source') ? '查看图表' : '查看源码';
}

function buildToolbar() {
  const bar = document.createElement('div');
  bar.className = 'mermaid-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', '图表操作');
  bar.append(
    toolbarButton('zoom', '放大'),
    toolbarButton('copy-src', '复制源码'),
    toolbarMenu('toggle-download', '下载', [
      ['download-svg', 'SVG'],
      ['download-png', 'PNG'],
    ]),
    toolbarMenu('toggle-more', '更多', [
      ['copy-png', '复制图片'],
      ['toggle-src', '查看源码'],
    ]),
  );
  return bar;
}

function toolbarButton(act: string, label: string) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mermaid-act';
  btn.dataset.act = act;
  btn.textContent = label;
  return btn;
}

function toolbarMenu(act: string, label: string, items: Array<[string, string]>) {
  const wrap = document.createElement('div');
  wrap.className = 'mermaid-menu';
  const trigger = toolbarButton(act, label);
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  const pop = document.createElement('div');
  pop.className = 'mermaid-pop';
  pop.setAttribute('role', 'menu');
  pop.hidden = true;
  for (const [itemAct, itemLabel] of items) {
    const btn = toolbarButton(itemAct, itemLabel);
    btn.className = 'mermaid-item';
    btn.setAttribute('role', 'menuitem');
    pop.appendChild(btn);
  }
  wrap.append(trigger, pop);
  return wrap;
}
let raf = 0;
let copiedTimer = 0;

function paint() {
  displaySource.value = props.source;
  raf = 0;
}

watch(
  () => [props.source, props.live],
  () => {
    if (!props.live) {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      displaySource.value = props.source;
      return;
    }
    if (raf) return;
    raf = requestAnimationFrame(paint);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  paintTicket += 1;
  if (raf) cancelAnimationFrame(raf);
  if (copiedTimer) window.clearTimeout(copiedTimer);
  if (diagramCopyTimer) window.clearTimeout(diagramCopyTimer);
  stageObserver?.disconnect();
  document.removeEventListener('keydown', onDocKeydown, true);
  document.removeEventListener('pointerdown', onDocPointerDown);
  document.removeEventListener('scroll', onDocScroll, true);
  returnFocus = null;
  viewer.value = null;
});

const VOID_TAGS = new Set(['HR', 'BR', 'IMG']);

/**
 * 取最后一个可插入行内节点的宿主，让流式光标跟在末字后。
 */
function lastInlineHost(root: HTMLElement) {
  let node: Node = root;
  while (node?.nodeType === 1) {
    const el = node as HTMLElement;
    const kids = [...el.childNodes].filter((child) => {
      if (child.nodeType === 1 && (child as HTMLElement).classList?.contains('caret')) return false;
      if (child.nodeType === 3 && !child.textContent?.trim()) return false;
      return true;
    });
    if (!kids.length) return el;
    const last = kids[kids.length - 1];
    if (last.nodeType === Node.TEXT_NODE) return el;
    if (last.nodeType === Node.ELEMENT_NODE) {
      if ((last as HTMLElement).classList?.contains('mermaid-block')) return el;
      if (VOID_TAGS.has((last as HTMLElement).tagName)) return el;
      node = last;
      continue;
    }
    return el;
  }
  return root;
}

/** 把闪烁光标插进消毒后的 HTML 末字后面，与 v-html 同一拍更新。 */
function withLiveCaret(html: string) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');
  lastInlineHost(wrap).appendChild(caret);
  return wrap.innerHTML;
}

const html = computed(() => {
  ensureKatexPurifyHook();
  const engine = props.live ? markdownLive : md;
  const sanitized = DOMPurify.sanitize(engine.render(displaySource.value || ''), {
    USE_PROFILES: { html: true, mathMl: true },
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'aria-label', 'type', 'encoding'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
  return props.live ? withLiveCaret(sanitized) : sanitized;
});

onMounted(() => {
  document.addEventListener('keydown', onDocKeydown, true);
  document.addEventListener('pointerdown', onDocPointerDown);
  document.addEventListener('scroll', onDocScroll, true);
  void paintDiagrams();
});

watch(html, () => {
  void paintDiagrams();
}, { flush: 'post' });

watch(viewer, async (value) => {
  stageObserver?.disconnect();
  stageObserver = null;
  if (!value) return;
  viewMode.value = 'fit';
  await nextTick();
  const stage = stageRef.value;
  if (!stage || !viewer.value) return;
  stageObserver = new ResizeObserver(() => {
    if (viewMode.value === 'fit') applyFit();
  });
  stageObserver.observe(stage);
  applyFit();
  closeBtnRef.value?.focus();
});

/** 代码块「复制」走事件委托；图表按钮只响应工具条，不进 v-html。 */
async function onBodyClick(event: MouseEvent) {
  const raw = event.target;
  const target = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
  if (!target) return;
  if (target.closest('.mermaid-toolbar')) {
    await onMermaidClick(target);
    return;
  }
  const btn = target.closest?.('.code-copy');
  if (!btn || !(event.currentTarget as HTMLElement).contains(btn)) return;
  event.preventDefault();
  const block = btn.closest('.code-block');
  const text = block?.querySelector('pre')?.innerText ?? '';
  const ok = await copyText(text);
  if (!ok) return;
  btn.textContent = '已复制';
  if (copiedTimer) window.clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => {
    btn.textContent = '复制';
    copiedTimer = 0;
  }, 1500);
}

async function onMermaidClick(target: Element) {
  const btn = target.closest<HTMLButtonElement>('[data-act]');
  const block = btn?.closest<HTMLElement>('.mermaid-block');
  if (!btn || !block?.classList.contains('is-ready') || !bodyRef.value?.contains(btn)) return;
  const act = btn.dataset.act || '';
  if (act === 'toggle-download' || act === 'toggle-more') {
    toggleMenu(btn);
    return;
  }
  if (act === 'copy-src') {
    await copyDiagramSource(block, btn);
    return;
  }
  if (act === 'toggle-src') {
    toggleDiagramSource(block);
    closeMenus();
    return;
  }
  const svg = svgByBlock.get(block) || '';
  if (!prepareSvgMarkup(svg)) {
    const failed = act === 'zoom' ? '这张图还不能放大' : act === 'copy-png' ? '复制失败' : '下载失败';
    antdMessage.error(failed);
    return;
  }
  if (act === 'zoom') {
    closeMenus();
    openViewer(svg, btn);
    return;
  }
  if (act === 'download-svg') {
    closeMenus();
    downloadSvg(block, svg);
    return;
  }
  if (act === 'download-png') {
    closeMenus();
    await downloadPng(block, svg);
    return;
  }
  if (act === 'copy-png') {
    await copyDiagramPng(block, btn, svg);
  }
}

function toggleMenu(btn: HTMLElement) {
  const menu = btn.closest<HTMLElement>('.mermaid-menu');
  if (!menu) return;
  const willOpen = !menu.classList.contains('is-open');
  closeMenus();
  if (willOpen) setMenuOpen(menu, true);
}

function setMenuOpen(menu: HTMLElement, open: boolean) {
  menu.classList.toggle('is-open', open);
  const pop = menu.querySelector<HTMLElement>('.mermaid-pop');
  const trigger = menu.querySelector('button');
  if (pop) {
    pop.hidden = !open;
    if (open && trigger) placeMenu(trigger, pop);
    else {
      pop.style.position = '';
      pop.style.top = '';
      pop.style.left = '';
      pop.style.zIndex = '';
    }
  }
  trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/** 菜单用 fixed，避免被消息区 overflow 裁切；靠近视口底边时向上展开。 */
function placeMenu(trigger: HTMLElement, pop: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const estimated = 96;
  let top = rect.bottom + 4;
  if (top + estimated > window.innerHeight - 8) {
    top = Math.max(8, rect.top - 4 - estimated);
  }
  pop.style.position = 'fixed';
  pop.style.zIndex = '30';
  pop.style.top = `${top}px`;
  pop.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 148))}px`;
}

function closeMenus() {
  const root = bodyRef.value;
  if (!root) return;
  for (const menu of root.querySelectorAll<HTMLElement>('.mermaid-menu.is-open')) {
    setMenuOpen(menu, false);
  }
}

function onDocScroll() {
  if (!bodyRef.value?.querySelector('.mermaid-menu.is-open')) return;
  closeMenus();
}

function onDocPointerDown(event: Event) {
  const root = bodyRef.value;
  const target = event.target;
  if (!root || !(target instanceof Node)) return;
  const open = [...root.querySelectorAll<HTMLElement>('.mermaid-menu.is-open')];
  if (!open.length || open.some((menu) => menu.contains(target))) return;
  closeMenus();
}

function onDocKeydown(event: KeyboardEvent) {
  if (viewer.value) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeViewer();
    } else if (event.key === 'Tab') {
      trapViewerTab(event);
    }
    return;
  }
  if (event.key !== 'Escape' || !bodyRef.value) return;
  const open = bodyRef.value.querySelector<HTMLElement>('.mermaid-menu.is-open');
  if (!open) return;
  event.preventDefault();
  event.stopPropagation();
  const trigger = open.querySelector('button');
  setMenuOpen(open, false);
  trigger?.focus();
}

function trapViewerTab(event: KeyboardEvent) {
  const root = dialogRef.value;
  if (!root) return;
  const items = [...root.querySelectorAll<HTMLElement>('button')].filter((el) => !el.hasAttribute('disabled'));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (!active || !root.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

async function copyDiagramSource(block: HTMLElement, btn: HTMLButtonElement) {
  const text = block.querySelector('.mermaid-src code')?.textContent ?? '';
  const ok = await copyText(text);
  if (!ok) {
    antdMessage.error('复制失败');
    return;
  }
  flashCopied(btn, '复制源码');
}

function toggleDiagramSource(block: HTMLElement) {
  const raw = block.querySelector('.mermaid-src code')?.textContent ?? '';
  const show = !block.classList.contains('is-source');
  block.classList.toggle('is-source', show);
  if (raw) {
    if (show) sourceShown.add(raw);
    else sourceShown.delete(raw);
  }
  syncSourceLabel(block);
}

function fileBaseFor(block: HTMLElement) {
  const blocks = bodyRef.value ? [...bodyRef.value.querySelectorAll('.mermaid-block')] : [];
  const index = blocks.indexOf(block);
  return diagramFileBase(props.exportTitle, index >= 0 ? index + 1 : 1);
}

function downloadSvg(block: HTMLElement, svg: string) {
  const markup = prepareSvgMarkup(svg);
  if (!markup) {
    antdMessage.error('下载失败');
    return;
  }
  downloadBlob(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${fileBaseFor(block)}.svg`);
}

async function downloadPng(block: HTMLElement, svg: string) {
  try {
    const png = await svgToPngBlob(svg, paperColor());
    downloadBlob(png, `${fileBaseFor(block)}.png`);
  } catch {
    antdMessage.error('下载失败');
  }
}

async function copyDiagramPng(block: HTMLElement, btn: HTMLButtonElement, svg: string) {
  try {
    const result = await copyOrDownloadPng(svg, paperColor(), `${fileBaseFor(block)}.png`);
    if (result === 'copied') {
      flashCopied(btn, '复制图片');
      return;
    }
    closeMenus();
    antdMessage.warning('当前环境不能复制图片，已改为下载');
  } catch {
    closeMenus();
    antdMessage.error('复制失败');
  }
}

function flashCopied(btn: HTMLButtonElement, label: string) {
  if (diagramCopyBtn && diagramCopyBtn !== btn && diagramCopyBtn.isConnected) {
    diagramCopyBtn.textContent = diagramCopyBtn.dataset.label || diagramCopyBtn.textContent;
  }
  diagramCopyBtn = btn;
  btn.dataset.label = label;
  btn.textContent = '已复制';
  if (diagramCopyTimer) window.clearTimeout(diagramCopyTimer);
  diagramCopyTimer = window.setTimeout(() => {
    const current = diagramCopyBtn;
    if (current?.isConnected) current.textContent = current.dataset.label || label;
    if (current?.dataset.act === 'copy-png') {
      const menu = current.closest<HTMLElement>('.mermaid-menu');
      if (menu) setMenuOpen(menu, false);
    }
    diagramCopyBtn = null;
    diagramCopyTimer = 0;
  }, 1500);
}

function paperColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim();
  return value || '#eef1f8';
}

function openViewer(svg: string, back: HTMLElement) {
  const markup = prepareSvgMarkup(svg);
  if (!markup) {
    antdMessage.error('这张图还不能放大');
    return;
  }
  const size = svgPixelSize(markup);
  returnFocus = back;
  closeMenus();
  fitted.value = false;
  viewMode.value = 'fit';
  viewer.value = {
    svg: namespaceSvgIds(markup, 'mmdv-'),
    width: size.width,
    height: size.height,
  };
}

function closeViewer() {
  if (!viewer.value) return;
  viewer.value = null;
  const back = returnFocus;
  returnFocus = null;
  if (back?.isConnected) back.focus();
}

function stageBox() {
  const stage = stageRef.value;
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return rect;
}

function applyFit() {
  const rect = stageBox();
  const box = viewer.value;
  if (!rect || !box) return;
  const availW = Math.max(32, rect.width - FIT_PAD * 2);
  const availH = Math.max(32, rect.height - FIT_PAD * 2);
  place(Math.min(1, availW / box.width, availH / box.height), 'fit');
}

function applyActual() {
  place(1, 'manual');
}

function place(nextScale: number, mode: 'fit' | 'manual') {
  const rect = stageBox();
  const box = viewer.value;
  if (!rect || !box) return;
  const next = mode === 'fit' ? Math.min(MAX_SCALE, nextScale) : Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
  scale.value = next;
  panX.value = (rect.width - box.width * next) / 2;
  panY.value = (rect.height - box.height * next) / 2;
  viewMode.value = mode;
  fitted.value = true;
}

function zoomCenter(factor: number) {
  const rect = stageBox();
  if (!rect) return;
  zoomAt(rect.width / 2, rect.height / 2, scale.value * factor);
}

function zoomAt(px: number, py: number, next: number) {
  const current = scale.value || 1;
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
  if (Math.abs(clamped - current) < 1e-6) return;
  const cx = (px - panX.value) / current;
  const cy = (py - panY.value) / current;
  scale.value = clamped;
  panX.value = px - cx * clamped;
  panY.value = py - cy * clamped;
  viewMode.value = 'manual';
}

function onStageWheel(event: WheelEvent) {
  const stage = stageRef.value;
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  zoomAt(event.clientX - rect.left, event.clientY - rect.top, scale.value * factor);
}

function onPanDown(event: PointerEvent) {
  if (event.button !== 0) return;
  const stage = event.currentTarget as HTMLElement;
  panSession = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    panX: panX.value,
    panY: panY.value,
    moved: false,
  };
  try {
    stage.setPointerCapture(event.pointerId);
  } catch {
    /* 指针未被浏览器跟踪时仍可在图内拖移 */
  }
}

function onPanMove(event: PointerEvent) {
  if (!panSession || panSession.id !== event.pointerId) return;
  const dx = event.clientX - panSession.x;
  const dy = event.clientY - panSession.y;
  if (!panSession.moved && Math.hypot(dx, dy) < 4) return;
  panSession.moved = true;
  panX.value = panSession.panX + dx;
  panY.value = panSession.panY + dy;
  viewMode.value = 'manual';
  (event.currentTarget as HTMLElement).classList.add('is-panning');
}

function onPanEnd(event: PointerEvent) {
  if (!panSession || panSession.id !== event.pointerId) return;
  panSession = null;
  (event.currentTarget as HTMLElement).classList.remove('is-panning');
}
</script>

<style scoped>
.md-wrap {
  position: relative;
  min-width: 0;
}
.md-body {
  background: transparent !important;
  color: inherit;
  font-size: var(--fs-message);
  line-height: 1.65;
  max-width: none;
}
.md-body :deep(.katex),
.md-body :deep(.katex *) {
  box-sizing: content-box;
}
.md-body :deep(.katex) {
  display: inline-block;
  vertical-align: middle;
  overflow: visible;
  font-size: 1.21em;
  line-height: 1.2;
  text-indent: 0;
}
.md-body :deep(.katex-display-wrap) {
  overflow-x: auto;
  overflow-y: hidden;
  margin: 0.8em 0;
  text-align: center;
}
.md-body :deep(.katex-display) {
  display: block;
  margin: 0.4em 0;
}
.md-body :deep(.katex-html) {
  overflow: visible;
}
.md-body :deep(.code-block) {
  position: relative;
  margin: 0.8em 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-paper);
}
.md-body :deep(.code-head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--color-paper);
  border-bottom: 1px solid var(--color-line);
  font-size: var(--fs-small);
  color: var(--color-ink-secondary);
}
.md-body :deep(.code-copy) {
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: var(--color-paper-raised);
  color: var(--color-ink);
  font-size: var(--fs-small);
  line-height: 1;
  padding: 3px 8px;
  cursor: pointer;
}
.md-body :deep(.code-copy:hover) {
  background: var(--color-brand-soft);
}
.md-body :deep(.code-block pre) {
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  background: var(--color-paper);
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.md-body :deep(.code-block pre:hover) {
  scrollbar-color: rgba(31, 35, 40, 0.28) transparent;
}
.md-body :deep(.code-block pre)::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.md-body :deep(.code-block pre)::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 8px;
}
.md-body :deep(.code-block pre:hover)::-webkit-scrollbar-thumb {
  background: rgba(31, 35, 40, 0.28);
}
.md-body :deep(.code-block code.hljs) {
  background: transparent;
  padding: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-secondary);
}
.md-body :deep(.mermaid-block) {
  position: relative;
  margin: 0.8em 0;
  max-width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-paper);
}
.md-body :deep(.mermaid-head) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-paper);
  border-bottom: 1px solid var(--color-line);
  font-size: var(--fs-small);
  color: var(--color-ink-secondary);
}
.md-body :deep(.mermaid-label) {
  flex-shrink: 0;
}
.md-body :deep(.mermaid-toolbar) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}
.md-body :deep(.mermaid-act),
.md-body :deep(.mermaid-item) {
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: var(--color-paper-raised);
  color: var(--color-ink);
  font-size: var(--fs-small);
  line-height: 1.2;
  min-height: 32px;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
}
.md-body :deep(.mermaid-act:hover),
.md-body :deep(.mermaid-item:hover) {
  background: var(--color-brand-soft);
}
.md-body :deep(.mermaid-menu) {
  position: relative;
}
.md-body :deep(.mermaid-pop) {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 112px;
  padding: 4px;
  background: var(--color-paper-raised);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-pop);
}
.md-body :deep(.mermaid-pop[hidden]) {
  display: none !important;
}
.md-body :deep(.mermaid-item) {
  text-align: left;
}
.md-body :deep(.mermaid-view) {
  overflow-x: auto;
  max-width: 100%;
  padding: 12px 14px;
  background: var(--color-paper);
}
.md-body :deep(.mermaid-view:empty) {
  display: none;
}
.md-body :deep(.mermaid-src) {
  display: none;
  margin: 0;
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  background: var(--color-paper);
  overflow: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-secondary);
  white-space: pre-wrap;
}
.md-body :deep(.mermaid-block.is-pending .mermaid-src),
.md-body :deep(.mermaid-block.is-error .mermaid-src),
.md-body :deep(.mermaid-block.is-ready.is-source .mermaid-src) {
  display: block;
}
.md-body :deep(.mermaid-block.is-ready.is-source .mermaid-view) {
  display: none;
}
.md-body :deep(.mermaid-block.is-error .mermaid-view) {
  display: block;
}
.md-body :deep(.mermaid-view svg) {
  max-width: 100%;
  height: auto;
}
.md-body :deep(.mermaid-block.is-error .mermaid-view)::before {
  content: '这张图还不能绘制';
  display: block;
  margin-bottom: 8px;
  color: var(--color-ink-secondary);
  font-size: var(--fs-small);
}
/* 流式光标：8px 品牌色块，1s 阶梯闪烁；reduced-motion 下静态常驻 */
.md-body :deep(.caret) {
  display: inline-block;
  width: 8px;
  height: 1em;
  margin-left: 2px;
  border-radius: 1px;
  background: var(--color-brand);
  animation: caret-blink 1s step-end infinite;
  vertical-align: -0.12em;
}
@keyframes caret-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
.mmd-viewer {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  padding: 16px;
  background: rgba(12, 14, 28, 0.72);
  overscroll-behavior: none;
}
.mmd-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--color-paper-raised);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-pop);
  overflow: hidden;
}
.mmd-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-line);
}
.mmd-btn {
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: var(--color-paper-raised);
  color: var(--color-ink);
  font-size: var(--fs-small);
  line-height: 1.2;
  min-height: 32px;
  padding: 6px 10px;
  cursor: pointer;
}
.mmd-btn:hover:not(:disabled) {
  background: var(--color-brand-soft);
}
.mmd-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mmd-btn[aria-pressed='true'] {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand);
}
.mmd-close {
  margin-left: auto;
}
.mmd-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--color-paper);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.mmd-stage.is-panning {
  cursor: grabbing;
}
.mmd-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  transition: none;
}
.mmd-canvas :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
}
@media (max-width: 768px) {
  .mmd-viewer {
    padding: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .md-body :deep(.caret) {
    animation: none;
    opacity: 1;
  }
  .mmd-canvas {
    transition: none;
  }
}
</style>
