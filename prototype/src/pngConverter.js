/**
 * PNG 转换模块：SVG → PNG（借助 @resvg/resvg-js，支持中文系统字体）。
 */
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');

function svgToPng(svg, outPath, { scale = 2 } = {}) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: scale },
    background: '#ffffff',
    font: { loadSystemFonts: true },
  });
  const png = r.render().asPng();
  fs.writeFileSync(outPath, png);
  return png.length;
}

module.exports = { svgToPng };
