/**
 * 样例 PDF 生成：把 sample_bid.json / sample_boq.json 渲染成中文 PDF，
 * 用于演示"PDF 输入 → 解析 → 网络图"的完整链路。
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

// 中文字体解析（优先黑体）
function resolveFontPath() {
  const candidates = [
    process.env.NETWORK_CJK_FONT,
    'C:/Windows/Fonts/simhei.ttf',
    'C:/Windows/Fonts/Deng.ttf',
    'C:/Windows/Fonts/simsunb.ttf',
    'C:/Windows/Fonts/STZHONGS.TTF',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到中文字体文件，请设置环境变量 NETWORK_CJK_FONT 指向一个 .ttf');
}

async function newDoc() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fs.readFileSync(resolveFontPath()));
  return { doc, font };
}

async function makeBidPdf(project, outPath) {
  const { doc, font } = await newDoc();
  const page = doc.addPage([595, 842]);
  const T = (text, x, y, size = 11) => page.drawText(text, { x, y, size, font });

  T(project.projectName, 50, 790, 18);
  T('招标文件（摘要）', 50, 762, 14);

  T('一、工程概况', 50, 720, 12);
  T(`项目名称：${project.projectName}`, 60, 700, 11);
  T('建设地点：示例市示例区', 60, 684, 11);

  T('二、工期要求', 50, 648, 12);
  T(`合同工期：${project.contractDurationDays} 日历天`, 60, 628, 11);
  T(`开工日期：${project.startDate}`, 60, 612, 11);

  T('三、关键里程碑', 50, 576, 12);
  let y = 556;
  for (const m of project.milestones) {
    T(`${m.name}：${m.date}`, 60, y, 11);
    y -= 18;
  }

  fs.writeFileSync(outPath, await doc.save());
  return outPath;
}

async function makeBoqPdf(boq, outPath) {
  const { doc, font } = await newDoc();
  const page = doc.addPage([595, 842]);
  const T = (text, x, y, size = 10) => page.drawText(text, { x, y, size, font });

  T(`${boq.projectName} — 工程量清单（含逻辑关系）`, 50, 790, 16);

  // 表头与列坐标
  const xs = { id: 50, name: 90, unit: 320, qty: 370, pred: 430 };
  const headerY = 750;
  T('序号', xs.id, headerY);
  T('工作名称', xs.name, headerY);
  T('单位', xs.unit, headerY);
  T('工程量', xs.qty, headerY);
  T('紧前工作', xs.pred, headerY);

  // 表格线
  page.drawLine({ start: { x: 40, y: headerY - 4 }, end: { x: 560, y: headerY - 4 }, thickness: 1 });
  page.drawLine({ start: { x: 40, y: headerY + 12 }, end: { x: 560, y: headerY + 12 }, thickness: 1 });

  let y = headerY - 24;
  for (const it of boq.items) {
    T(it.id, xs.id, y);
    T(it.name, xs.name, y);
    T(it.unit, xs.unit, y);
    T(String(it.quantity), xs.qty, y);
    T((it.predecessors || []).join(','), xs.pred, y);
    y -= 24;
  }
  page.drawLine({ start: { x: 40, y: y + 12 }, end: { x: 560, y: y + 12 }, thickness: 1 });

  fs.writeFileSync(outPath, await doc.save());
  return outPath;
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const bid = JSON.parse(fs.readFileSync(path.join(dataDir, 'sample_bid.json'), 'utf8'));
  const boq = JSON.parse(fs.readFileSync(path.join(dataDir, 'sample_boq.json'), 'utf8'));
  await makeBidPdf(bid, path.join(dataDir, '招标文件.pdf'));
  await makeBoqPdf(boq, path.join(dataDir, '工程量清单.pdf'));
  console.log('已生成样例 PDF：data/招标文件.pdf、data/工程量清单.pdf');
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

module.exports = { makeBidPdf, makeBoqPdf };
