/**
 * 古建筑测绘局 · Canvas 交互
 * 跨学科情境：土圭测影（《周髀》土圭之法）、盆水倒影（静水平面反射）、步天立杆（标杆测高）
 * 数学内核与方案比拼一致：平行光影长、反射定律、斜率三点共线 —— 仅场景与文案不同
 */
(function (global) {
  "use strict";

  var W = 960;
  var H = 540;
  var GROUND_Y = 470;
  /** 古塔高度、八尺木表高度（像素示意） */
  var TOWER_H = 200;
  var BIAO_H = 52;
  var POLE_H = 62;
  var EYE_OFFSET = 28;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function len(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function norm(nx, ny) {
    var L = Math.hypot(nx, ny) || 1;
    return { x: nx / L, y: ny / L };
  }

  function dot(ax, ay, bx, by) {
    return ax * bx + ay * by;
  }

  /** 与校园版相同：平行光方向与地面交点求影长 */
  function shadowScene(sunX, sunY, towerX, groundY, towerH, biaoX, biaoH) {
    var tTop = groundY - towerH;
    var bTop = groundY - biaoH;
    var inc = norm(towerX - sunX, tTop - sunY);
    if (Math.abs(inc.y) < 1e-4) inc.y = 1e-4;
    var tT = (groundY - tTop) / inc.y;
    var tB = (groundY - bTop) / inc.y;
    return {
      inc: inc,
      shadowTower: tT * inc.x,
      shadowBiao: tB * inc.x,
      tipTower: towerX + tT * inc.x,
      tipBiao: biaoX + tB * inc.x,
    };
  }

  function mirrorReflect(topX, topY, mirrorX, mirrorY, eyeX, eyeY) {
    var ix = mirrorX - topX;
    var iy = mirrorY - topY;
    var I = norm(ix, iy);
    var nx = 0;
    var ny = -1;
    var dn = dot(I.x, I.y, nx, ny);
    var rx = I.x - 2 * dn * nx;
    var ry = I.y - 2 * dn * ny;
    var ex = eyeX - mirrorX;
    var ey = eyeY - mirrorY;
    var cross = Math.abs(ex * ry - ey * rx);
    var lenR = Math.hypot(rx, ry) || 1;
    var dist = cross / lenR;
    var tproj = dot(ex, ey, rx, ry) / lenR;
    if (tproj < 0) dist = 1e9;
    return { rx: rx, ry: ry, hitDist: dist };
  }

  function collinearSlope(eyeX, eyeY, pTopX, pTopY, wallTopX, wallTopY, eps) {
    var k1 = (pTopY - eyeY) / (pTopX - eyeX + 1e-9);
    var k2 = (wallTopY - eyeY) / (wallTopX - eyeX + 1e-9);
    return { k1: k1, k2: k2, ok: Math.abs(k1 - k2) < eps };
  }

  function fitCanvasToWrap(wrap, logicalW, logicalH) {
    var cw = Math.max(1, (wrap && wrap.clientWidth) || logicalW);
    var chAvail = wrap && wrap.clientHeight > 0 ? wrap.clientHeight : 0;
    var lh = Math.round((cw * logicalH) / logicalW);
    if (chAvail > 0 && lh > chAvail) {
      lh = Math.max(1, Math.floor(chAvail));
      cw = Math.max(1, Math.round((lh * logicalW) / logicalH));
    }
    return { cw: cw, lh: lh };
  }

  function HeritageLab(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.mode = "shadow";
    this._scale = 1;
    this._drag = null;
    this.sun = { x: 720, y: 55 };
    this.towerX = 240;
    this.biaoX = 420;
    this.basinX = 400;
    this.poleBaseX = 370;
    this.craftsmanX = 515;

    this._resize();
    this._bind();
    this._loop();
  }

  HeritageLab.prototype._resize = function () {
    var wrap = this.canvas.parentElement;
    var sz = fitCanvasToWrap(wrap, W, H);
    var cw = sz.cw;
    this._lw = cw;
    this._lh = sz.lh;
    this._scale = cw / W;
    this.canvas.style.width = cw + "px";
    this.canvas.style.height = this._lh + "px";
    var dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(this._lh * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._dprScale = dpr;
  };

  HeritageLab.prototype._toLogical = function (ev) {
    var rect = this.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) / this._scale,
      y: (ev.clientY - rect.top) / this._scale,
    };
  };

  HeritageLab.prototype._bind = function () {
    var self = this;
    var el = this.canvas;
    el.addEventListener("pointerdown", function (e) {
      var L = self._toLogical(e);
      el.setPointerCapture(e.pointerId);
      if (self.mode === "shadow") {
        var hsx = self._shadowShiftX();
        if (len(L.x, L.y, self.sun.x + hsx, self.sun.y) < 36) self._drag = { type: "sun" };
        else self._drag = null;
      } else if (self.mode === "mirror") {
        if (Math.abs(L.x - self.basinX) < 32 && L.y > GROUND_Y - 24) self._drag = { type: "basin" };
        else self._drag = null;
      } else {
        if (len(L.x, L.y, self.poleBaseX, GROUND_Y) < 30) self._drag = { type: "pole" };
        else if (len(L.x, L.y, self.craftsmanX, GROUND_Y) < 30) self._drag = { type: "craftsman" };
        else self._drag = null;
      }
    });
    el.addEventListener("pointermove", function (e) {
      if (!self._drag) return;
      e.preventDefault();
      var L = self._toLogical(e);
      if (self._drag.type === "sun") {
        var hsm = self._shadowShiftX();
        self.sun.x = clamp(L.x - hsm, 400, 920);
        self.sun.y = clamp(L.y, 18, 210);
      } else if (self._drag.type === "basin") {
        self.basinX = clamp(L.x, 210, 690);
      } else if (self._drag.type === "pole") {
        self.poleBaseX = clamp(L.x, 190, 510);
      } else if (self._drag.type === "craftsman") {
        self.craftsmanX = clamp(L.x, 390, 880);
      }
    });
    var end = function () {
      self._drag = null;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    if (typeof ResizeObserver !== "undefined" && self.canvas.parentElement) {
      new ResizeObserver(function () {
        self._resize();
      }).observe(self.canvas.parentElement);
    }
  };

  HeritageLab.prototype._loop = function () {
    var self = this;
    function frame() {
      self._draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  HeritageLab.prototype.setMode = function (m) {
    this.mode = m;
  };

  /** 水墨远山与暮色天空 */
  HeritageLab.prototype._drawSky = function (ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, "#c5d5e3");
    g.addColorStop(0.45, "#a8bcc8");
    g.addColorStop(1, "#8fa9b5");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);
    ctx.fillStyle = "rgba(120, 110, 100, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 40);
    ctx.bezierCurveTo(200, GROUND_Y - 120, 400, GROUND_Y - 60, W, GROUND_Y - 80);
    ctx.lineTo(W, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  };

  /** 多层古塔轮廓 */
  HeritageLab.prototype._drawPagoda = function (ctx, cx, groundY, totalH) {
    var tiers = 5;
    var w = 44;
    var y = groundY;
    for (var i = 0; i < tiers; i++) {
      var th = totalH / (tiers + 0.5);
      var ratio = 1 - i * 0.12;
      var tw = w * ratio;
      y -= th;
      ctx.fillStyle = i % 2 === 0 ? "#5c4a3a" : "#4a3d32";
      ctx.fillRect(cx - tw / 2, y, tw, th);
      ctx.strokeStyle = "rgba(212, 175, 125, 0.25)";
      ctx.strokeRect(cx - tw / 2, y, tw, th);
    }
    ctx.fillStyle = "#3d3530";
    ctx.beginPath();
    ctx.moveTo(cx, y - 18);
    ctx.lineTo(cx + 8, y);
    ctx.lineTo(cx - 8, y);
    ctx.closePath();
    ctx.fill();
  };

  HeritageLab.prototype._drawWall = function (ctx, x, groundY, h) {
    ctx.fillStyle = "#5a5348";
    ctx.fillRect(x - 10, groundY - h, 20, h);
    var top = groundY - h;
    for (var i = 0; i < 5; i++) {
      ctx.fillRect(x - 14 + i * 6, top - 6, 5, 6);
    }
  };

  HeritageLab.prototype._drawBasin = function (ctx, mx, my) {
    ctx.fillStyle = "#6b5b45";
    ctx.beginPath();
    ctx.ellipse(mx, my + 2, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120, 180, 220, 0.35)";
    ctx.beginPath();
    ctx.ellipse(mx, my, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 220, 240, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(mx, my, 30, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  };

  HeritageLab.prototype._draw = function () {
    var ctx = this.ctx;
    var Lw = this._lw || W;
    var Lh = this._lh || H;
    var dpr = this._dprScale || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Lw, Lh);
    ctx.save();
    ctx.scale(Lw / W, Lh / H);
    this._drawSky(ctx);
    ctx.fillStyle = "#d4ccc0";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.strokeStyle = "rgba(180, 160, 130, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    if (this.mode === "shadow") this._drawShadow(ctx);
    else if (this.mode === "mirror") this._drawMirror(ctx);
    else this._drawPole(ctx);

    ctx.fillStyle = "rgba(212, 175, 125, 0.8)";
    ctx.font = "12px Segoe UI, Microsoft YaHei, sans-serif";
    var cap =
      this.mode === "shadow"
        ? "土圭测影：《周髀》立表测影，影长与物高成比例"
        : this.mode === "mirror"
          ? "盆水如镜：入射角等于反射角，构造相似三角形"
          : "步天立杆：目、杆顶、檐口共线，剔除眼高后相似求解";
    ctx.fillText(cap, 16, H - 18);
    ctx.restore();
  };

  HeritageLab.prototype._shadowShiftX = function () {
    var tx = this.towerX;
    var bx = this.biaoX;
    var sl = shadowScene(this.sun.x, this.sun.y, tx, GROUND_Y, TOWER_H, bx, BIAO_H);
    var tipT = sl.tipTower;
    var tipB = sl.tipBiao;
    var sunX = this.sun.x;
    var minX = Math.min(tx, bx, tipT, tipB);
    var maxX = Math.max(tx, bx, tipT, tipB, sunX);
    var pad = 36;
    var lo = pad - minX;
    var hi = W - pad - maxX;
    var shiftX = 0;
    if (lo <= hi) {
      if (0 < lo) shiftX = lo;
      else if (0 > hi) shiftX = hi;
    } else {
      shiftX = (lo + hi) / 2;
    }
    return shiftX;
  };

  HeritageLab.prototype._drawShadow = function (ctx) {
    var tx = this.towerX;
    var bx = this.biaoX;
    var sl = shadowScene(this.sun.x, this.sun.y, tx, GROUND_Y, TOWER_H, bx, BIAO_H);
    var inc = sl.inc;
    var rdx = inc.x;
    var rdy = inc.y;
    var tipT = sl.tipTower;
    var tipB = sl.tipBiao;
    var shiftX = this._shadowShiftX();

    ctx.save();
    ctx.translate(shiftX, 0);

    this._drawPagoda(ctx, tx, GROUND_Y, TOWER_H);

    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
    ctx.lineWidth = 2;
    for (var o = -50; o <= 90; o += 40) {
      ctx.beginPath();
      ctx.moveTo(tx + o - rdx * 500, GROUND_Y - TOWER_H - rdy * 500);
      ctx.lineTo(tx + o + rdx * 600, GROUND_Y - TOWER_H + rdy * 600);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(56, 189, 248, 0.14)";
    ctx.beginPath();
    ctx.moveTo(tx, GROUND_Y);
    ctx.lineTo(tx, GROUND_Y - TOWER_H);
    ctx.lineTo(tipT, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
    ctx.beginPath();
    ctx.moveTo(bx, GROUND_Y);
    ctx.lineTo(bx, GROUND_Y - BIAO_H);
    ctx.lineTo(tipB, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#a8a29e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, GROUND_Y);
    ctx.lineTo(bx, GROUND_Y - BIAO_H);
    ctx.stroke();
    ctx.strokeStyle = "#78716c";
    ctx.beginPath();
    ctx.moveTo(tx, GROUND_Y);
    ctx.lineTo(tipT, GROUND_Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, GROUND_Y);
    ctx.lineTo(tipB, GROUND_Y);
    ctx.stroke();

    ctx.fillStyle = "#fcd34d";
    ctx.beginPath();
    ctx.arc(this.sun.x, this.sun.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f2e22";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    ctx.fillText("拖日", this.sun.x - 14, this.sun.y + 36);

    ctx.restore();

    ctx.fillStyle = "#475569";
    ctx.font = "13px Microsoft YaHei, sans-serif";
    ctx.fillText("古塔影 ≈ " + Math.abs(sl.shadowTower).toFixed(0) + " px　木表影 ≈ " + Math.abs(sl.shadowBiao).toFixed(0) + " px", 20, 28);
    ctx.fillText("八尺木表 · 与塔影构成相似直角三角形", 20, 48);
  };

  HeritageLab.prototype._drawMirror = function (ctx) {
    var towerTopX = this.towerX;
    var towerTopY = GROUND_Y - TOWER_H;
    var mx = this.basinX;
    var my = GROUND_Y;
    var eyeX = 785;
    var eyeY = GROUND_Y - 148;

    this._drawPagoda(ctx, towerTopX, GROUND_Y, TOWER_H);
    this._drawBasin(ctx, mx, my);

    var refl = mirrorReflect(towerTopX, towerTopY, mx, my, eyeX, eyeY);
    var ok = refl.hitDist < 14;

    ctx.strokeStyle = ok ? "#4ade80" : "rgba(251, 191, 36, 0.9)";
    ctx.lineWidth = ok ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(towerTopX, towerTopY);
    ctx.lineTo(mx, my);
    ctx.lineTo(mx + refl.rx * 500, my + refl.ry * 500);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    ctx.fillText("工匠目", eyeX - 20, eyeY - 14);

    if (ok) {
      ctx.fillStyle = "rgba(74, 222, 128, 0.18)";
      ctx.beginPath();
      ctx.moveTo(towerTopX, towerTopY);
      ctx.lineTo(mx, my);
      ctx.lineTo(eyeX, eyeY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 15px Microsoft YaHei, sans-serif";
      ctx.fillText("测绘视线锁定！", 22, 30);
    } else {
      ctx.fillStyle = "#a8a29e";
      ctx.font = "13px Microsoft YaHei, sans-serif";
      ctx.fillText("拖动青铜盆水，使塔顶倒影光路经过工匠眼睛", 22, 30);
    }
  };

  HeritageLab.prototype._drawPole = function (ctx) {
    var wallX = this.towerX;
    var wallTopY = GROUND_Y - TOWER_H;
    var poleX = this.poleBaseX;
    var poleTopY = GROUND_Y - POLE_H;
    var footX = this.craftsmanX;
    var eyeX = footX;
    var eyeY = GROUND_Y - EYE_OFFSET;

    this._drawWall(ctx, wallX, GROUND_Y, TOWER_H);

    var col = collinearSlope(eyeX, eyeY, poleX, poleTopY, wallX, wallTopY, 0.012);
    var ok = col.ok;

    ctx.strokeStyle = ok ? "#4ade80" : "rgba(251, 191, 36, 0.85)";
    ctx.lineWidth = ok ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(eyeX, eyeY);
    ctx.lineTo(wallX, wallTopY);
    ctx.stroke();

    ctx.strokeStyle = "#a8a29e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(poleX, GROUND_Y);
    ctx.lineTo(poleX, poleTopY);
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 7, 0, Math.PI * 2);
    ctx.fill();

    if (ok) {
      ctx.fillStyle = "rgba(74, 222, 128, 0.12)";
      ctx.beginPath();
      ctx.moveTo(footX, GROUND_Y);
      ctx.lineTo(wallX, wallTopY);
      ctx.lineTo(wallX, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(34, 211, 238, 0.1)";
      ctx.beginPath();
      ctx.moveTo(footX, GROUND_Y);
      ctx.lineTo(poleX, poleTopY);
      ctx.lineTo(poleX, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 14px Microsoft YaHei, sans-serif";
      ctx.fillText("步天立杆 · 三点共线 · A 字型相似", 22, 28);
    } else {
      ctx.fillStyle = "#a8a29e";
      ctx.font = "13px Microsoft YaHei, sans-serif";
      ctx.fillText("拖木杆或工匠站位，使目、杆顶、城垛顶共线", 22, 28);
    }

    ctx.fillStyle = "#475569";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    ctx.fillText("城墙 · 测绘杆", 22, H - 22);
  };

  global.HeritageLab = HeritageLab;
})(typeof window !== "undefined" ? window : this);
