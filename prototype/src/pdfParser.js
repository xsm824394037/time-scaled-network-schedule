/**
 * PDF 解析模块：
 *   - parseBidPdf()  ：从招标文件 PDF 提取 项目名称/开工日期/合同工期/里程碑；
 *   - parseBoqPdf()  ：从工程量清单 PDF 提取工作项（含名称、单位、工程量、紧前关系），
 *                      并依据关键词自动判定工效类别。
 *
 * 说明：PDF 表格识别采用"行聚类 + 列间隙切分"的轻量策略，适配本原型生成的
 * 结构化样例；生产环境建议接入更专业的表格识别（规则/ML 或人工校对）。
 */
const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const config = require('../config/productivity');

// 提取文本项（str + x + y），按行聚类后返回自上而下的行数组
async function extractRows(path) {
  const data = new Uint8Array(fs.readFileSync(path));
  const doc = await pdfjs.getDocument({ data }).promise;
  const rowsMap = new Map(); // y -> {y, items:[{str,x}]}
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    for (const it of content.items) {
      const str = (it.str || '').trim();
      if (!str) continue;
      const x = it.transform[4];
      const y = it.transform[5];
      const key = Math.round(y / 2); // 聚类容差
      if (!rowsMap.has(key)) rowsMap.set(key, { y, items: [] });
      rowsMap.get(key).items.push({ str, x });
    }
  }
  const rows = [...rowsMap.values()]
    .sort((a, b) => b.y - a.y) // PDF 坐标 y 向上，降序=自上而下
    .map((r) => ({ y: r.y, items: r.items.sort((a, b) => a.x - b.x) }));
  return rows;
}

// 按列间隙（>gap）切分一行的文本项，返回每列的文本
function splitColumns(items, gap = 20) {
  const cols = [];
  let cur = [];
  for (let i = 0; i < items.length; i++) {
    cur.push(items[i].str);
    if (i + 1 < items.length && items[i + 1].x - items[i].x > gap) {
      cols.push(cur.join(''));
      cur = [];
    }
  }
  if (cur.length) cols.push(cur.join(''));
  return cols;
}

function normalizeDate(s) {
  if (!s) return '';
  const m = String(s).match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/);
  if (!m) return String(s).trim();
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

// 依据工作名称关键词判定工效类别
function classifyCategory(name) {
  for (const [cat, kws] of config.categoryKeywords) {
    if (kws.some((k) => name.includes(k))) return cat;
  }
  return '';
}

async function parseBidPdf(path) {
  const rows = await extractRows(path);
  const lines = rows.map((r) => r.items.map((i) => i.str).join(''));
  const bid = { projectName: '', startDate: '', contractDurationDays: null, milestones: [] };

  let inMilestone = false;
  for (const line of lines) {
    const pm = line.match(/(?:项目名称|工程名称)[:：]\s*(.+)/);
    if (pm && !bid.projectName) bid.projectName = pm[1].trim();

    const dm = line.match(/开工日期[:：]\s*(\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}日?)/);
    if (dm && !bid.startDate) bid.startDate = normalizeDate(dm[1]);

    const cm = line.match(/(?:合同|计划|总)工期[:：]?\s*(\d+)\s*(?:日历天|天)/);
    if (cm && bid.contractDurationDays == null) bid.contractDurationDays = Number(cm[1]);

    if (/里程碑/.test(line)) { inMilestone = true; continue; }

    if (inMilestone) {
      // 遇到新的章节标题则结束里程碑区
      if (/^[一二三四五六七八九十\d]+、/.test(line)) { inMilestone = false; continue; }
      const mm = line.match(/(.+?)[:：]\s*(\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}日?)/);
      if (mm) bid.milestones.push({ name: mm[1].trim(), date: normalizeDate(mm[2]) });
    }
  }

  // 竣工日期兜底：若没有里程碑，尝试竣工日期行
  if (bid.milestones.length === 0) {
    for (const line of lines) {
      const em = line.match(/竣工日期[:：]\s*(\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}日?)/);
      if (em) { bid.milestones.push({ name: '竣工交付', date: normalizeDate(em[1]) }); break; }
    }
  }
  return bid;
}

async function parseBoqPdf(path) {
  const rows = await extractRows(path);
  const items = [];
  for (const row of rows) {
    const cols = splitColumns(row.items, 20);
    // 跳过表头
    if (cols.some((c) => /工作名称|序号|项目名称/.test(c)) && cols.length <= 2) continue;
    if (cols.length < 4) continue;

    const id = cols[0].trim();
    if (!/^[A-Za-z]?\d+/.test(id)) continue; // 跳过非数据行
    const name = (cols[1] || '').trim();
    const unit = (cols[2] || '').trim();
    const quantity = parseFloat(String(cols[3] || '').replace(/[,，]/g, '')) || 0;
    const predecessors = (cols[4] || '')
      .split(/[,，、;；\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    items.push({
      id,
      code: '',
      name,
      unit,
      quantity,
      category: classifyCategory(name),
      predecessors,
      manualDuration: null,
    });
  }
  return { projectName: '', items };
}

module.exports = { parseBidPdf, parseBoqPdf, classifyCategory, extractRows };
