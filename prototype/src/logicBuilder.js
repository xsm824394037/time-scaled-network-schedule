/**
 * 逻辑关系建立模块：
 *   1) 优先使用清单/输入提供的紧前关系（人工可改）；
 *   2) 若整张清单无任何紧前关系，则按 config.defaultSequence 顺序自动链（兜底）。
 */
const config = require('../config/productivity');

function buildLogic(activities) {
  const log = [];
  const byId = new Map(activities.map((a) => [a.id, a]));

  // 校验并清洗紧前引用（去除不存在的 id）
  for (const a of activities) {
    const before = a.predecessors.length;
    a.predecessors = a.predecessors.filter((p) => {
      if (!byId.has(p)) {
        log.push(`[逻辑] 警告：${a.id} 的紧前工作「${p}」不存在，已忽略`);
        return false;
      }
      return true;
    });
    if (a.predecessors.length !== before) {
      // 引用被清理
    }
  }

  const hasAnyPredecessor = activities.some((a) => a.predecessors.length > 0);
  if (!hasAnyPredecessor) {
    // 无任何紧前关系 -> 按默认施工顺序模板自动链
    const rank = new Map();
    config.defaultSequence.forEach((cat, i) => rank.set(cat, i));
    const sorted = [...activities].sort((x, y) => {
      const rx = rank.has(x.category) ? rank.get(x.category) : 9999;
      const ry = rank.has(y.category) ? rank.get(y.category) : 9999;
      return rx - ry || x.id.localeCompare(y.id);
    });
    for (let i = 1; i < sorted.length; i++) {
      sorted[i].predecessors = [sorted[i - 1].id];
    }
    log.push('[逻辑] 清单未提供紧前关系，已按默认施工顺序模板自动建立 FS 链');
  }

  return log;
}

module.exports = { buildLogic };
