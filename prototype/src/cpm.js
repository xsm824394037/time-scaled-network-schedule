/**
 * 关键路径法（CPM，单代号 AON）：
 *   正推 ES/EF → 反推 LS/LF → 总时差 TF / 自由时差 FF → 识别关键线路。
 */
function runCPM(activities) {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const successors = new Map(activities.map((a) => [a.id, []]));
  for (const a of activities) {
    for (const p of a.predecessors) {
      successors.get(p).push(a.id);
    }
  }

  // 1) 正推：ES = max(紧前 EF)，EF = ES + 工期
  for (const a of activities) {
    a.es = a.predecessors.length
      ? Math.max(...a.predecessors.map((p) => byId.get(p).ef))
      : 0;
    a.ef = a.es + a.duration;
  }
  const projectDuration = Math.max(...activities.map((a) => a.ef));

  // 2) 反推：按 EF 降序（即逆拓扑序）处理，LF = min(紧后 LS)
  const sorted = [...activities].sort((a, b) => b.ef - a.ef);
  for (const a of sorted) {
    const succ = successors.get(a.id) || [];
    a.lf = succ.length
      ? Math.min(...succ.map((s) => byId.get(s).ls))
      : projectDuration;
    a.ls = a.lf - a.duration;
  }

  // 3) 时差与关键性
  for (const a of activities) {
    a.tf = a.ls - a.es; // 总时差 == lf - ef
    const succ = successors.get(a.id) || [];
    a.ff = succ.length
      ? Math.min(...succ.map((s) => byId.get(s).es)) - a.ef // 自由时差
      : projectDuration - a.ef;
    a.critical = Math.abs(a.tf) < 1e-9;
  }

  const criticalPath = activities
    .filter((a) => a.critical)
    .sort((a, b) => a.es - b.es)
    .map((a) => a.id);

  return { projectDuration, criticalPath };
}

module.exports = { runCPM };
