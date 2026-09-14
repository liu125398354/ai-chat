<!--
  @file NightSky.vue
  @author liunannan
  @date 2026-09-14
  @updated 2026-09-14
  @description 夜空底：柔和暮色带 + 星座细线 + 近处网格；渐变 id 按实例隔离
-->
<script setup>
import { useId } from 'vue';

const nid = String(useId() || 'ns').replace(/[^a-zA-Z0-9_-]/g, '');
const ids = {
  sky: `ns-sky-${nid}`,
  brand: `ns-brand-${nid}`,
  dusk: `ns-dusk-${nid}`,
  grid: `ns-grid-${nid}`,
};
</script>

<template>
  <div class="night-sky" aria-hidden="true">
    <svg class="sky" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient :id="ids.sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0a0c18" />
          <stop offset="42%" stop-color="#121428" />
          <stop offset="62%" stop-color="#1a2248" />
          <stop offset="78%" stop-color="#3a2a4a" />
          <stop offset="100%" stop-color="#121428" />
        </linearGradient>
        <radialGradient :id="ids.brand" cx="22%" cy="28%" r="45%">
          <stop offset="0%" stop-color="#3b5bdb" stop-opacity="0.28" />
          <stop offset="55%" stop-color="#3b5bdb" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#3b5bdb" stop-opacity="0" />
        </radialGradient>
        <radialGradient :id="ids.dusk" cx="50%" cy="58%" r="38%">
          <stop offset="0%" stop-color="#ff8a6b" stop-opacity="0.22" />
          <stop offset="50%" stop-color="#ff8a6b" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#ff8a6b" stop-opacity="0" />
        </radialGradient>
        <linearGradient :id="ids.grid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7ee0ff" stop-opacity="0" />
          <stop offset="25%" stop-color="#7ee0ff" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#7ee0ff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" :fill="`url(#${ids.sky})`" />
      <rect width="1440" height="900" :fill="`url(#${ids.brand})`" />
      <rect width="1440" height="900" :fill="`url(#${ids.dusk})`" />

      <g stroke="#d7dcf0" stroke-width="0.7" fill="none" opacity="0.28">
        <path d="M180 140 L260 210 L210 280 L320 250 L390 180" />
        <path d="M980 90 L1080 150 L1180 120 L1240 210 L1140 260" />
        <path d="M620 80 L700 130 L780 100 L740 200" />
      </g>
      <g fill="#eef1f8">
        <circle cx="180" cy="140" r="1.6" opacity="0.55" />
        <circle cx="260" cy="210" r="1.2" opacity="0.4" />
        <circle cx="210" cy="280" r="1.4" opacity="0.45" />
        <circle cx="320" cy="250" r="1.1" opacity="0.35" />
        <circle cx="390" cy="180" r="1.8" opacity="0.6" />
        <circle cx="980" cy="90" r="1.5" opacity="0.5" />
        <circle cx="1080" cy="150" r="1.2" opacity="0.38" />
        <circle cx="1180" cy="120" r="1.6" opacity="0.52" />
        <circle cx="1240" cy="210" r="1.1" opacity="0.34" />
        <circle cx="1140" cy="260" r="1.4" opacity="0.44" />
        <circle cx="620" cy="80" r="1.3" opacity="0.4" />
        <circle cx="700" cy="130" r="1.7" opacity="0.55" />
        <circle cx="780" cy="100" r="1.2" opacity="0.36" />
        <circle cx="740" cy="200" r="1.1" opacity="0.32" />
        <circle cx="90" cy="320" r="1" opacity="0.28" />
        <circle cx="480" cy="160" r="1" opacity="0.25" />
        <circle cx="860" cy="240" r="1" opacity="0.22" />
        <circle cx="1320" cy="340" r="1.2" opacity="0.3" />
        <circle cx="70" cy="520" r="1.1" opacity="0.2" />
      </g>

      <ellipse cx="720" cy="530" rx="720" ry="36" fill="#ff8a6b" opacity="0.18" />

      <g :stroke="`url(#${ids.grid})`" stroke-width="1" fill="none">
        <path d="M0 620 L1440 620" />
        <path d="M0 670 L1440 670" opacity="0.85" />
        <path d="M0 730 L1440 730" opacity="0.7" />
        <path d="M0 810 L1440 810" opacity="0.5" />
        <path d="M720 560 L0 900" />
        <path d="M720 560 L240 900" />
        <path d="M720 560 L480 900" />
        <path d="M720 560 L720 900" />
        <path d="M720 560 L960 900" />
        <path d="M720 560 L1200 900" />
        <path d="M720 560 L1440 900" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.night-sky {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: var(--color-rail);
}
.sky {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
