/**
 * 工期估算模块（半自动）：
 *   1) 自动建议工期：工期 = ceil(工程量 ÷ 工效)，或固定工期项直接用 fixedDays；
 *   2) 人工覆盖：清单中的 manualDuration 优先。
 */
const config = require('../config/productivity');

function autoDuration(a) {
  const p = config.productivity[a.category];
  if (!p) {
    const days = Math.max(1, Math.ceil(a.quantity / config.fallbackProductivity));
    return { days, source: 'auto-fallback' };
  }
  if (p.fixedDays) {
    return { days: p.fixedDays, source: 'auto-fixed' };
  }
  const days = Math.max(1, Math.ceil(a.quantity / p.productivity));
  return { days, source: 'auto' };
}

function estimateDurations(activities) {
  const log = [];
  for (const a of activities) {
    const p = config.productivity[a.category];
    a.productivity = (p && p.productivity) || null;
    const auto = autoDuration(a);
    a.estDuration = auto.days;

    if (a.manualDuration != null && a.manualDuration > 0) {
      a.duration = a.manualDuration;
      a.durationSource = 'manual';
      log.push(`[工期] ${a.id} ${a.name}：建议 ${auto.days} 天 → 人工指定 ${a.duration} 天`);
    } else {
      a.duration = auto.days;
      a.durationSource = auto.source;
      const basis = p && p.fixedDays
        ? `固定工期 ${p.fixedDays} 天`
        : `${a.quantity} ${a.unit} ÷ ${a.productivity ?? config.fallbackProductivity} ${a.unit}/天`;
      log.push(`[工期] ${a.id} ${a.name}：${a.duration} 天（${basis}）`);
    }
  }
  return log;
}

module.exports = { estimateDurations, autoDuration };
