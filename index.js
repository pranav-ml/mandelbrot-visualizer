// create a canvas element
const canvas = document.createElement('canvas');

// set canvas size
canvas.width = 800;
canvas.height = 600;

// get canvas context
const ctx = canvas.getContext('2d');

// create an offscreen canvas for updating colors
const offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
const offscreenCtx = offscreenCanvas.getContext('2d');

// set initial color array
let colors = [];

// fill initial color array with random colors
for (let i = 0; i < canvas.width * canvas.height; i++) {
  colors.push(`rgb(${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)})`);
}

// define row update function
function updateRow(row) {
  // loop through pixels in row and update with new colors
  for (let i = 0; i < canvas.width; i++) {
    const index = (row * canvas.width) + i;
    offscreenCtx.fillStyle = colors[index];
    offscreenCtx.fillRect(i, row, 1, 1);
  }
}

// define function to update all rows
function updateRows() {
  // loop through each row and call updateRow function
  for (let i = 0; i < canvas.height; i++) {
    updateRow(i);
  }
}

// set interval to update canvas every 500ms
setInterval(() => {
  // draw offscreen canvas onto main canvas
  ctx.drawImage(offscreenCanvas, 0, 0);
}, 500);

// create new worker to handle updating colors
const worker = new Worker('worker.js');

// listen for message from worker
worker.onmessage = (e) => {
  // update colors with new data from worker
  colors = e.data;
};

// send initial colors to worker
worker.postMessage({ colors });

// listen for error from worker
worker.onerror = (e) => {
  console.error(`Worker error: ${e.message}`);
};
