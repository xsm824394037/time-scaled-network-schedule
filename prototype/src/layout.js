/**
 * 时标布局模块：
 *   - X 轴 = 时间（天），工作框左边 = ES，宽度 = 工期；
 *   - Y 轴 = 分层（lane），用"区间图贪心着色"避免时间重叠的工作挤在同一行。
 */
function layout(activities, opts) {
  const pxPerDay = opts.pxPerDay || 12;
  const boxH = opts.boxHeight || 40;
  const laneH = opts.laneHeight || 58;
  const x0 = opts.xOrigin || 60;
  const y0 = opts.yOrigin || 96;

  // 区间图贪心着色：按 ES 升序，放入第一个不冲突的层
  const sorted = [...activities].sort(
    (a, b) => a.es - b.es || b.duration - a.duration,
  );
  const laneEnds = []; // 每层最后一个工作占用到的 EF
  for (const a of sorted) {
    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] > a.es + 1e-6) lane++;
    if (lane === laneEnds.length) laneEnds.push(0);
    laneEnds[lane] = a.ef;
    a.lane = lane;
  }

  const laneCount = Math.max(1, laneEnds.length);
  for (const a of activities) {
    a.x = x0 + a.es * pxPerDay;
    a.y = y0 + a.lane * laneH;
    a.width = a.duration * pxPerDay;
    a.height = boxH;
    a.cx = a.x + a.width / 2;
    a.cy = a.y + boxH / 2;
  }

  const contentWidth = opts.projectDuration * pxPerDay;
  const width = x0 + contentWidth + opts.rightMargin;
  const height = y0 + laneCount * laneH + opts.bottomMargin;

  return { pxPerDay, boxH, laneH, x0, y0, laneCount, width, height };
}

module.exports = { layout };
