/**
 * 主入口：把整条流水线串起来。
 *   输入（JSON 或 PDF）→ 建模 → 工期估算 → 逻辑关系 → CPM → 时标布局 → SVG/PNG。
 *
 * 用法：
 *   node src/index.js                                   # 使用内置样例 JSON
 *   node src/index.js --bid a.json --boq b.json         # 自定义 JSON
 *   node src/index.js --bid-pdf a.pdf --boq-pdf b.pdf   # 自定义 PDF
 */
const fs = require('fs');
const path = require('path');

const { createActivity } = require('./models');
const { estimateDurations } = require('./durationEstimator');
const { buildLogic } = require('./logicBuilder');
const { runCPM } = require('./cpm');
const { layout } = require('./layout');
const { renderSVG } = require('./svgRenderer');
const { svgToPng } = require('./pngConverter');
const { parseBidPdf, parseBoqPdf } = require('./pdfParser');

const DATA = path.join(__dirname, '..', 'data');
const OUT = path.join(__dirname, '..', 'output');

function parseArgs(argv) {
  const a = { bid: null, boq: null, bidPdf: null, boqPdf: null, out: OUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--bid') a.bid = argv[++i];
    else if (argv[i] === '--boq') a.boq = argv[++i];
    else if (argv[i] === '--bid-pdf') a.bidPdf = argv[++i];
    else if (argv[i] === '--boq-pdf') a.boqPdf = argv[++i];
    else if (argv[i] === '--out') a.out = argv[++i];
  }
  return a;
}

async function loadInputs(args) {
  if (args.bidPdf && args.boqPdf) {
    console.log('【输入】从 PDF 解析…');
    const [bid, boq] = await Promise.all([parseBidPdf(args.bidPdf), parseBoqPdf(args.boqPdf)]);
    if (!bid.projectName) bid.projectName = '未命名项目';
    boq.projectName = bid.projectName || boq.projectName;
    return { bid, boq };
  }
  if (args.bid && args.boq) {
    return {
      bid: JSON.parse(fs.readFileSync(args.bid, 'utf8')),
      boq: JSON.parse(fs.readFileSync(args.boq, 'utf8')),
    };
  }
  return {
    bid: JSON.parse(fs.readFileSync(path.join(DATA, 'sample_bid.json'), 'utf8')),
    boq: JSON.parse(fs.readFileSync(path.join(DATA, 'sample_boq.json'), 'utf8')),
  };
}

function printTable(activities, projectDuration) {
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const rows = activities.map((a) => [
    a.id, a.name, a.duration, a.es, a.ef, a.ls, a.lf,
    fmt(a.tf), fmt(a.ff), a.critical ? '★' : '',
  ]);
  const head = ['编号', '工作名称', '工期', 'ES', 'EF', 'LS', 'LF', 'TF', 'FF', '关键'];
  const w = head.map((h, i) =>
    Math.max(h.length * 2, ...rows.map((r) => String(r[i]).length * 2)) + 1);
  const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join('');
  console.log(line(head));
  console.log(line(rows[0].map(() => '')));
  for (const r of rows) console.log(line(r));
  console.log(`\n计划总工期 = ${projectDuration} 天`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { bid, boq } = await loadInputs(args);

  // 1) 建模
  const activities = boq.items.map(createActivity);
  console.log(`\n=== 项目：${bid.projectName} | 开工 ${bid.startDate} | 合同工期 ${bid.contractDurationDays} 天 ===\n`);

  // 2) 工期估算
  const durLog = estimateDurations(activities);
  durLog.forEach((l) => console.log(l));

  // 3) 逻辑关系
  console.log('');
  buildLogic(activities).forEach((l) => console.log(l));

  // 4) 关键路径
  const { projectDuration, criticalPath } = runCPM(activities);
  console.log(`\n[CPM] 计划总工期 = ${projectDuration} 天，关键线路：${criticalPath.join(' → ')}\n`);
  printTable(activities, projectDuration);

  // 5) 布局
  const opts = {
    pxPerDay: 12, boxHeight: 40, laneHeight: 58,
    xOrigin: 60, yOrigin: 96, rightMargin: 80, bottomMargin: 40,
    projectDuration,
  };
  const lay = layout(activities, opts);

  // 6) 渲染
  const project = { projectName: bid.projectName, startDate: bid.startDate, contractDurationDays: bid.contractDurationDays, milestones: bid.milestones || [] };
  const svg = renderSVG(project, activities, lay, { projectDuration, criticalPath });

  fs.mkdirSync(args.out, { recursive: true });
  const base = path.join(args.out, '时标网络进度计划图');
  const svgPath = base + '.svg';
  const pngPath = base + '.png';
  fs.writeFileSync(svgPath, svg, 'utf8');
  const pngBytes = svgToPng(svg, pngPath, { scale: 2 });

  // 机读结果（供后续 UI / 报表 / 导入其他系统使用）
  const result = {
    project: { name: bid.projectName, startDate: bid.startDate, contractDurationDays: bid.contractDurationDays },
    planDurationDays: projectDuration,
    criticalPath,
    activities: activities.map((a) => ({
      id: a.id, name: a.name, unit: a.unit, quantity: a.quantity,
      duration: a.duration, durationSource: a.durationSource,
      predecessors: a.predecessors, es: a.es, ef: a.ef, ls: a.ls, lf: a.lf,
      tf: a.tf, ff: a.ff, critical: a.critical,
    })),
  };
  const jsonPath = path.join(args.out, '进度计算结果.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`\n✅ 已生成矢量图：${svgPath}`);
  console.log(`✅ 已生成位图（2x 高清）：${pngPath}（${(pngBytes / 1024).toFixed(0)} KB）`);
  console.log(`✅ 已生成机读结果：${jsonPath}`);
  console.log(`   图幅 ${Math.round(lay.width)} × ${Math.round(lay.height)} px（不含 2x 缩放）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
