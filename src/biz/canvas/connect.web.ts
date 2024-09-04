import { BezierPoint } from "@/biz/bezier_point";
import { Canvas } from "./index";

export function connect(store: Canvas, $canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  store.drawLine = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  };
  store.drawCurve = (curve: { points: { x: number; y: number }[] }) => {
    ctx.beginPath();
    const ox = 0;
    const oy = 0;
    const p = curve.points;
    ctx.moveTo(p[0].x + ox, p[0].y + oy);
    if (p.length === 3) {
      ctx.quadraticCurveTo(p[1].x + ox, p[1].y + oy, p[2].x + ox, p[2].y + oy);
    }
    if (p.length === 4) {
      ctx.bezierCurveTo(p[1].x + ox, p[1].y + oy, p[2].x + ox, p[2].y + oy, p[3].x + ox, p[3].y + oy);
    }
    ctx.stroke();
    ctx.closePath();
  };
  store.drawCircle = (point: { x: number; y: number }, radius: number) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
    // ctx.fillStyle = "black";
    // ctx.font = "10px Arial";
    // const x = point.x;
    // const y = point.y;
    // // @ts-ignore
    // ctx.fillText(`${point._uid}、${x},${y}`, x + 2, y - 2);
  };
  store.drawLabel = (point: BezierPoint) => {
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    const x = point.x;
    const y = point.y;
    ctx.fillText(`${point.uid}|${x - store.grid.x},${y - store.grid.y}`, x + 2, y - 2);
  };
  store.drawDiamondAtLineEnd = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    // 绘制线条
    // ctx.beginPath();
    // ctx.moveTo(lineStartX, lineStartY);
    // ctx.lineTo(lineEndX, lineEndY);
    // ctx.stroke();
    const size = 3;
    const color = "red";

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length;
    const unitY = dy / length;
    const perpX = -unitY;
    const perpY = unitX;
    // 菱形顶点
    const diamondTopX = p2.x + perpX * size;
    const diamondTopY = p2.y + perpY * size;
    // 菱形右点
    const diamondRightX = p2.x + unitX * size;
    const diamondRightY = p2.y + unitY * size;
    // 菱形底点
    const diamondBottomX = p2.x - perpX * size;
    const diamondBottomY = p2.y - perpY * size;
    // 菱形左点
    const diamondLeftX = p2.x - unitX * size;
    const diamondLeftY = p2.y - unitY * size;

    // 绘制菱形
    ctx.beginPath();
    ctx.moveTo(diamondTopX, diamondTopY);
    ctx.lineTo(diamondRightX, diamondRightY);
    ctx.lineTo(diamondBottomX, diamondBottomY);
    ctx.lineTo(diamondLeftX, diamondLeftY);
    ctx.closePath();
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
  };
  store.drawGrid = () => {
    const { width, height } = $canvas;
    const unit = 20;
    const gridSize = 400; // 网格区域的大小
    const startX = (width - gridSize) / 2; // 网格区域左上角的 x 坐标
    const startY = (height - gridSize) / 2; // 网格区域左上角的 y 坐标
    store.setGrid({
      x: startX,
      y: startY,
      width: gridSize,
      height: gridSize,
    });
    ctx.beginPath();
    // 绘制垂直线
    for (let x = startX; x <= startX + gridSize; x += unit) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + gridSize);
    }
    // 绘制水平线
    for (let y = startY; y <= startY + gridSize; y += unit) {
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + gridSize, y);
    }
    ctx.strokeStyle = "#e0e0e0";
    ctx.stroke();
    // ctx.beginPath();
    // const a1 = {
    //   x: startX + gridSize / 2,
    //   y: startY + 100,
    // };
    // const a2 = {
    //   x: startX + gridSize / 2,
    //   y: startY + 100 + 100,
    // };
    // ctx.moveTo(a1.x, a1.y);
    // ctx.fillStyle = "black";
    // ctx.font = "12px Arial";
    // ctx.fillText(`${a1.x - startX},${a1.y - startY}`, a1.x + 2, a1.y - 2);
    // ctx.lineTo(a2.x, a2.y);
    // ctx.fillText(`${a2.x - startX},${a2.y - startY}`, a2.x + 2, a2.y - 2);
    // ctx.strokeStyle = "red";
    // ctx.stroke();
  };
  store.clear = () => {
    const { width, height } = $canvas;
    // 清空画布
    ctx.clearRect(0, 0, width, height);
  };
  const { innerWidth, innerHeight } = window;
  store.setSize({
    width: innerWidth,
    height: innerHeight,
  });
  $canvas.width = innerWidth;
  $canvas.height = innerHeight;
  $canvas.addEventListener("mousedown", (evt) => {
    store.handleMouseDown({
      x: evt.offsetX,
      y: evt.offsetY,
    });
  });
  $canvas.addEventListener("mousemove", (evt) => {
    store.handleMouseMove({ x: evt.offsetX, y: evt.offsetY });
  });
  $canvas.addEventListener("mouseup", (evt) => {
    store.handleMouseUp({ x: evt.offsetX, y: evt.offsetY });
  });
  $canvas.addEventListener("mouseout", (evt) => {
    store.handleMouseOut();
  });
}
