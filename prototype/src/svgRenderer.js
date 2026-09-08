/**
 * SVG 渲染模块：输出单代号时标网络计划图（矢量，可无损缩放/打印）。
 *
 * 图元约定：
 *   - 工作框：实心矩形，长度=工期，位置=最早时间；关键=红，非关键=蓝；
 *   - 自由时差：框右侧的波浪线（波线）；
 *   - 逻辑箭线：紧前 → 紧后，关键线路为红色粗线；
 *   - 里程碑：菱形节点；时间轴：顶部，按周标刻度与日期。
 */

const FONT = "'Microsoft YaHei', 'SimHei', 'PingFang SC', sans-serif";
const C = {
  critBorder: '#d32f2f',
  critFill: '#fdecea',
  normBorder: '#1976d2',
  normFill: '#e8f1fb',
  wave: '#f57c00',
  waveText: '#e65100',
  grid: '#e3e8ee',
  axisText: '#546e7a',
  text: '#263238',
  dimText: '#78909c',
  milestone: '#455a64',
  milestoneFill: '#ffd54f',
  startEnd: '#37474f',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(startDate, dayOffset) {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + dayOffset);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function dayOffset(startDate, dateStr) {
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(dateStr + 'T00:00:00');
  return Math.round((e - s) / 86400000);
}

// 波浪线路径（自由时差）
function wavePath(x0, x1, cy, amp = 3.5, period = 8) {
  if (x1 - x0 < 2) return '';
  const n = Math.max(1, Math.round((x1 - x0) / period));
  const dx = (x1 - x0) / n;
  let d = `M ${x0.toFixed(1)} ${cy.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const xa = x0 + dx * i;
    const xm = xa + dx / 2;
    const xb = xa + dx;
    d += ` L ${xm.toFixed(1)} ${(cy - amp).toFixed(1)} L ${xb.toFixed(1)} ${cy.toFixed(1)}`;
  }
  return d;
}

function renderSVG(project, activities, lay, opts) {
  const { pxPerDay, x0, y0, laneH, boxH, width, height } = lay;
  const P = [];
  const projectDuration = opts.projectDuration;
  const startDate = project.startDate;
  const endDate = fmtDate(startDate, projectDuration);

  const push = (s) => P.push(s);

  // 图幅与 defs（箭头 marker）
  push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">`);
  push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`);
  push(`<defs>
    <marker id="arrowCrit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="${C.critBorder}"/>
    </marker>
    <marker id="arrowNorm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="${C.normBorder}"/>
    </marker>
  </defs>`);

  // 标题与副标题
  push(`<text x="${x0}" y="30" font-size="20" font-weight="bold" fill="${C.text}">${esc(project.projectName)} — 单代号时标网络进度计划图</text>`);
  const critPathStr = (opts.criticalPath || []).join(' → ');
  push(`<text x="${x0}" y="52" font-size="12" fill="${C.dimText}">计划工期 ${projectDuration} 天（${fmtDate(startDate, 0)} ~ ${endDate}）｜合同工期 ${project.contractDurationDays} 天｜关键线路：${esc(critPathStr)}</text>`);

  // 时间轴（顶部）：网格线 + 按周刻度 + 日期
  const gridTop = y0 - 8;
  const gridBottom = y0 + lay.laneCount * laneH + 8;
  for (let d = 0; d <= projectDuration; d += 7) {
    const x = x0 + d * pxPerDay;
    push(`<line x1="${x}" y1="${gridTop}" x2="${x}" y2="${gridBottom}" stroke="${C.grid}" stroke-width="1"/>`);
    push(`<line x1="${x}" y1="${gridTop}" x2="${x}" y2="${gridTop + 4}" stroke="${C.axisText}" stroke-width="1"/>`);
    push(`<text x="${x}" y="${gridTop - 20}" font-size="10" fill="${C.axisText}" text-anchor="middle">${fmtDate(startDate, d)}</text>`);
    push(`<text x="${x}" y="${gridTop - 7}" font-size="9" fill="${C.dimText}" text-anchor="middle">D${d}</text>`);
  }
  // 末端也标一根
  const xEnd = x0 + projectDuration * pxPerDay;
  push(`<line x1="${xEnd}" y1="${gridTop}" x2="${xEnd}" y2="${gridBottom}" stroke="${C.grid}" stroke-width="1"/>`);
  push(`<text x="${xEnd}" y="${gridTop - 20}" font-size="10" fill="${C.axisText}" text-anchor="middle">${endDate}</text>`);
  push(`<text x="${xEnd}" y="${gridTop - 7}" font-size="9" fill="${C.dimText}" text-anchor="middle">D${projectDuration}</text>`);

  // 起点/终点里程碑菱形（垂直居中）
  const centerY = y0 + (lay.laneCount * laneH) / 2;
  const diamond = (x, y, fill, stroke, label, dy) => {
    const r = 7;
    push(`<path d="M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
    if (label) push(`<text x="${x}" y="${y + r + dy}" font-size="10" fill="${C.text}" text-anchor="middle">${esc(label)}</text>`);
  };
  diamond(x0, centerY, C.startEnd, C.startEnd, '开始', 18);
  diamond(xEnd, centerY, C.startEnd, C.startEnd, '结束', 18);

  // 命名里程碑（招标文件里的控制节点），画在时间轴顶端
  for (const m of project.milestones || []) {
    const off = dayOffset(startDate, m.date);
    if (off < 0 || off > projectDuration) continue;
    const x = x0 + off * pxPerDay;
    push(`<path d="M ${x} ${gridTop} L ${x + 6} ${gridTop - 10} L ${x - 6} ${gridTop - 10} Z" fill="${C.milestoneFill}" stroke="${C.milestone}" stroke-width="1"/>`);
    push(`<text x="${x}" y="${gridTop - 16}" font-size="10" fill="${C.milestone}" text-anchor="middle">${esc(m.name)}</text>`);
  }

  // 自由时差波浪线（先画，位于工作框之后、箭线之前）
  for (const a of activities) {
    if (a.ff > 0) {
      const wx0 = a.x + a.width;
      const wx1 = wx0 + a.ff * pxPerDay;
      const path = wavePath(wx0, wx1, a.cy);
      if (path) push(`<path d="${path}" fill="none" stroke="${C.wave}" stroke-width="1.6"/>`);
    }
  }

  // 工作框
  for (const a of activities) {
    const border = a.critical ? C.critBorder : C.normBorder;
    const fill = a.critical ? C.critFill : C.normFill;
    push(`<rect x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${a.width.toFixed(1)}" height="${boxH}" rx="4" fill="${fill}" stroke="${border}" stroke-width="${a.critical ? 2 : 1.3}"/>`);
    if (a.width >= 52) {
      // 两行：名称 + 工期
      push(`<text x="${a.cx.toFixed(1)}" y="${a.y + 17}" font-size="11" fill="${C.text}" text-anchor="middle">${esc(a.name)}</text>`);
      push(`<text x="${a.cx.toFixed(1)}" y="${a.y + 32}" font-size="10" fill="${a.critical ? C.critBorder : C.normBorder}" text-anchor="middle">${a.duration}天</text>`);
    } else {
      // 窄框：仅名称
      push(`<text x="${a.cx.toFixed(1)}" y="${a.y + boxH / 2 + 3.5}" font-size="10" fill="${C.text}" text-anchor="middle">${esc(a.name)}</text>`);
    }
  }

  // 逻辑箭线（紧前 → 紧后）
  const byId = new Map(activities.map((a) => [a.id, a]));
  for (const a of activities) {
    const exitX = a.x + a.width + a.ff * pxPerDay; // 出口 = 框右 + 自由时差波线
    const marker = a.critical ? 'arrowCrit' : 'arrowNorm';
    const color = a.critical ? C.critBorder : C.normBorder;
    for (const sId of a.predecessors) {
      const s = byId.get(sId);
      if (!s) continue;
      const sx = s.x; // 紧后框左边缘
      if (a.lane === s.lane) {
        // 同一行：水平直连（可能为 0 长度紧连，仍画箭头）
        push(`<line x1="${exitX.toFixed(1)}" y1="${a.cy.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${s.cy.toFixed(1)}" stroke="${color}" stroke-width="${a.critical ? 2 : 1.4}" marker-end="url(#${marker})"/>`);
      } else {
        // 跨行：正交折线（先水平到折点，再竖直，再水平进框）
        const mid = Math.max(exitX + 8, sx - 10);
        push(`<path d="M ${exitX.toFixed(1)} ${a.cy.toFixed(1)} L ${mid.toFixed(1)} ${a.cy.toFixed(1)} L ${mid.toFixed(1)} ${s.cy.toFixed(1)} L ${sx.toFixed(1)} ${s.cy.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${a.critical ? 2 : 1.4}" marker-end="url(#${marker})"/>`);
      }
    }
  }

  // 图例
  const lgY = height - 18;
  const lgX = x0;
  push(`<rect x="${lgX}" y="${lgY - 12}" width="14" height="14" rx="3" fill="${C.critFill}" stroke="${C.critBorder}" stroke-width="2"/>`);
  push(`<text x="${lgX + 20}" y="${lgY}" font-size="11" fill="${C.text}">关键工作（红色）</text>`);
  push(`<rect x="${lgX + 150}" y="${lgY - 12}" width="14" height="14" rx="3" fill="${C.normFill}" stroke="${C.normBorder}"/>`);
  push(`<text x="${lgX + 170}" y="${lgY}" font-size="11" fill="${C.text}">非关键工作</text>`);
  push(`<path d="${wavePath(lgX + 290, lgX + 330, lgY - 5) || ''}" fill="none" stroke="${C.wave}" stroke-width="1.6"/>`);
  push(`<text x="${lgX + 336}" y="${lgY}" font-size="11" fill="${C.text}">自由时差（波浪线）</text>`);
  push(`<line x1="${lgX + 470}" y1="${lgY - 5}" x2="${lgX + 510}" y2="${lgY - 5}" stroke="${C.critBorder}" stroke-width="2" marker-end="url(#arrowCrit)"/>`);
  push(`<text x="${lgX + 518}" y="${lgY}" font-size="11" fill="${C.text}">关键线路</text>`);

  push('</svg>');
  return P.join('\n');
}

module.exports = { renderSVG };
