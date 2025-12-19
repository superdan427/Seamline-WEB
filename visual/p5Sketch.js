// src/visual/p5Sketch.js

let spots = [];

// p5 only receives data — it does not decide layout
export function updateVisuals(newSpots) {
  spots = newSpots;
}

new p5((p) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.addClass("p5-canvas");
    p.noStroke();
  };

  p.draw = () => {
    // Soft fade background
    p.background(255, 255, 255, 40);

    // FULL SCREEN drawing area ✅
    const drawWidth = p.width;
    const drawHeight = p.height;

    // --- TWO ellipses only ---
    for (let i = 0; i < 3; i++) {
      const x = p.noise(i * 100 + p.frameCount * 0.004) * drawWidth;
      const y = p.noise(i * 200 + p.frameCount * 0.004) * drawHeight;

      p.fill(3, 2, 252);
      p.circle(x, y, 120);
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
});
