# 单代号时标网络进度计划图生成系统（原型）

根据**招标文件**与**工程量清单**，自动生成**单代号时标网络进度计划图（图片）**的可运行原型。

## 能力一览

| 环节 | 说明 |
|------|------|
| 输入解析 | 支持 PDF（招标文件 + 工程量清单）与 JSON 两种输入 |
| 工期估算 | 半自动：按「工程量 ÷ 工效」自动建议工期，`manualDuration` 人工可改 |
| 逻辑关系 | 优先采用清单紧前关系；缺失时按施工顺序模板自动链（兜底） |
| 网络计算 | CPM 关键路径：ES/EF/LS/LF、总时差 TF、自由时差 FF、关键线路 |
| 出图 | 时标网络计划图（SVG 矢量 + PNG 高清位图），关键线路加粗、自由时差画波浪线 |

## 目录结构

```
prototype/
├── config/productivity.js    # 工效基准表 + 施工顺序模板 + 名称→类别关键词（可改）
├── data/
│   ├── sample_bid.json        # 示例：招标关键信息（工期/里程碑）
│   ├── sample_boq.json        # 示例：工程量清单（含逻辑关系）
│   ├── 招标文件.pdf            # 由脚本生成的样例 PDF
│   └── 工程量清单.pdf
├── src/
│   ├── models.js              # 数据模型
│   ├── durationEstimator.js   # 工期估算（半自动）
│   ├── logicBuilder.js        # 逻辑关系建立
│   ├── cpm.js                 # 关键路径计算
│   ├── layout.js              # 时标分层布局
│   ├── svgRenderer.js         # SVG 渲染
│   ├── pngConverter.js        # SVG → PNG
│   ├── pdfParser.js           # PDF 解析（招标/清单）
│   ├── makeSamplePdf.js       # 生成样例 PDF
│   └── index.js               # 主入口
└── output/                    # 生成结果
```

## 快速开始

```bash
# 1) 安装依赖（Node.js ≥ 18）
npm install

# 2) 直接跑内置 JSON 样例，生成网络图
npm run demo

# 3) 生成样例 PDF，再走「PDF → 网络图」完整链路
npm run make-sample-pdf
npm run pdf-demo
```

也可以传自定义文件：

```bash
# 自定义 JSON
node src/index.js --bid a.json --boq b.json

# 自定义 PDF
node src/index.js --bid-pdf 招标文件.pdf --boq-pdf 工程量清单.pdf

# 指定输出目录
node src/index.js --out ./我的输出
```

输出文件（在 `output/` 下）：
- `时标网络进度计划图.svg` — 矢量图（可无损缩放/打印）
- `时标网络进度计划图.png` — 2x 高清位图（可直接插入 Word/PPT）
- `进度计算结果.json` — 机读结果（工期、时差、关键线路）

## 数据格式

### 招标信息（bid）
```json
{
  "projectName": "某办公楼建设项目",
  "startDate": "2026-09-15",
  "contractDurationDays": 100,
  "milestones": [ { "name": "主体结构封顶", "date": "2026-11-10" } ]
}
```

### 工程量清单（boq）
```json
{
  "projectName": "某办公楼建设项目",
  "items": [
    {
      "id": "A1",
      "name": "土方开挖",
      "unit": "m³",
      "quantity": 15000,
      "category": "earthwork",
      "predecessors": ["A1"],
      "manualDuration": null
    }
  ]
}
```

字段说明：
- `category`：工效类别键，对应 `config/productivity.js` 中的工效基准；
- `predecessors`：紧前工作 id 数组（人工可改）；
- `manualDuration`：人工指定工期（天），非空则覆盖自动建议值。

## 说明与限制

- 本原型**无现成定额/工效数据库**，用 `config/productivity.js` 中的工效基准表兜底，请按实际定额替换数值。
- PDF 表格识别采用「行聚类 + 列间隙切分」的轻量策略，适配结构化样例；真实招标文件/清单版式差异大，生产环境建议接入专业表格识别或人工校对（详见设计文档）。
- 本机若无中文字体文件用于生成样例 PDF，可设置环境变量 `NETWORK_CJK_FONT` 指向一个 `.ttf`。
- Windows PowerShell 下 `console.log` 中文可能乱码，可在终端先执行 `chcp 65001`；这不影响生成的图片/PDF/JSON 文件（均为 UTF-8）。
