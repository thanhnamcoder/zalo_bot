let Canvas;
let Jimp;
try {
  Canvas = require('canvas');
} catch (e) {
  try {
    Jimp = require('jimp');
  } catch (err) {
    // both unavailable; will throw when used
  }
}

module.exports = {
  hasCanvas: !!Canvas,
  async loadImage(src) {
    if (Canvas) return Canvas.loadImage(src);
    if (Jimp) return Jimp.read(src);
    throw new Error('No image library available: install canvas or jimp');
  },
  createCanvas(width, height) {
    if (Canvas) return Canvas.createCanvas(width, height);
    if (Jimp) {
      // create a Jimp image as fallback with minimal API
      return new Jimp(width, height);
    }
    throw new Error('No canvas available: install canvas or jimp');
  }
};
