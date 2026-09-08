/**
 * 数据模型：活动（单代号网络图中的节点 = 一项工作）。
 */
function createActivity(item) {
  return {
    // 输入字段
    id: item.id,
    code: item.code || '',
    name: item.name,
    unit: item.unit || '',
    quantity: Number(item.quantity) || 0,
    category: item.category || '',
    predecessors: Array.isArray(item.predecessors) ? item.predecessors.slice() : [],
    manualDuration: item.manualDuration == null ? null : Number(item.manualDuration),

    // 工期估算结果
    productivity: null,   // 匹配到的工效（单位/天），fixedDays 时为 null
    estDuration: 0,       // 自动建议工期
    durationSource: 'auto', // 'auto' | 'auto-fixed' | 'auto-fallback' | 'manual'
    duration: 0,          // 最终采用工期

    // CPM 结果
    es: 0, ef: 0, ls: 0, lf: 0, tf: 0, ff: 0,
    critical: false,

    // 布局结果
    lane: 0, x: 0, y: 0, width: 0, height: 0, cx: 0, cy: 0,
  };
}

module.exports = { createActivity };
