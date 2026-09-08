/**
 * 工效基准表 + 施工顺序模板（可配置）。
 *
 * 背景：本原型没有现成的定额/工效数据库，因此用一张"工效基准表"兜底，
 * 作为【半自动工期估算】的默认建议值。用户可以：
 *   1) 修改本文件中的工效数值；
 *   2) 或在工程量清单里用 manualDuration 对某一项人工指定工期。
 */
module.exports = {
  // 类别 -> { label, productivity 或 fixedDays }
  //   productivity : 每日产能（工程量单位/天），工期 = ceil(工程量 / 工效)
  //   fixedDays    : 固定工期（天），用于"项/套/系统"等无量纲工作
  productivity: {
    prepare:    { label: '施工准备',       fixedDays: 5 },
    earthwork:  { label: '土方开挖',       productivity: 1200 }, // m³/天
    cushion:    { label: '基础垫层',       productivity: 120 },  // m³/天
    foundation: { label: '基础及地下结构', productivity: 300 },  // m³/天
    structure:  { label: '主体结构',       productivity: 400 },  // m²/天
    masonry:    { label: '二次结构砌筑',   productivity: 260 },  // m³/天
    roof:       { label: '屋面工程',       productivity: 200 },  // m²/天
    facade:     { label: '外立面幕墙',     productivity: 350 },  // m²/天
    mep:        { label: '机电安装',       productivity: 800 },  // m²/天
    interior:   { label: '室内精装修',     productivity: 450 },  // m²/天
    sitework:   { label: '室外工程',       productivity: 500 },  // m²/天
    handover:   { label: '竣工验收',       fixedDays: 7 },
  },

  // 默认施工顺序模板：当清单未提供紧前关系时，按此顺序自动建立 FS 链（兜底）
  defaultSequence: [
    'prepare', 'earthwork', 'cushion', 'foundation', 'structure',
    'masonry', 'roof', 'facade', 'mep', 'interior', 'sitework', 'handover',
  ],

  // 无匹配类别时的默认工效（工程量单位/天）
  fallbackProductivity: 100,

  // 工作名称 -> 类别 的关键词映射（用于从 PDF 清单自动判定工效类别）
  // 顺序敏感：命中即返回，因此"基础"应排在"主体结构/结构"之前，"砌筑"排"结构"之前
  categoryKeywords: [
    ['prepare',    ['施工准备', '准备']],
    ['earthwork',  ['土方', '开挖', '基坑']],
    ['cushion',    ['垫层']],
    ['foundation', ['基础', '桩基', '承台', '地下室']],
    ['masonry',    ['砌筑', '砌体', '二次结构']],
    ['roof',       ['屋面', '防水', '女儿墙']],
    ['facade',     ['幕墙', '外立面', '外门窗']],
    ['mep',        ['机电', '安装', '给排水', '电气', '暖通', '消防', '管线']],
    ['interior',   ['精装修', '装修', '装饰', '内墙', '地面', '吊顶', '涂料']],
    ['sitework',   ['室外', '景观', '道路', '管网', '场地']],
    ['handover',   ['验收', '竣工', '移交', '备案']],
    ['structure',  ['主体结构', '结构', '混凝土', '钢筋', '模板']],
  ],
};
