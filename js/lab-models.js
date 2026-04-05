/**
 * 《利用相似三角形测高》· 方案比拼实验区
 * 三大模型：影子法（平行光）| 平面镜法（反射）| 标杆法（三点共线）
 * 数学与物理计算均附中文注释，便于教学核对。
 */
(function (global) {
  "use strict";

  var W = 960;
  var H = 540;
  var GROUND_Y = 470;
  /** 像素比例：约 20px ≈ 1m，旗杆约 10m */
  var FLAG_H = 200;
  var PERSON_H = 32;
  var POLE_H = 60;
  var EYE_OFFSET = 28;
  /** 平面镜法：人眼距地面高度（像素，越小表示人眼越低） */
  var MIRROR_EYE_ABOVE_GROUND = 100;

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

  function shadowScene(sunX, sunY, flagX, groundY, flagH, personX, personH) {
    var fTop = groundY - flagH;
    var pTop = groundY - personH;
    var inc = norm(flagX - sunX, fTop - sunY);
    if (Math.abs(inc.y) < 1e-4) inc.y = 1e-4;
    var tF = (groundY - fTop) / inc.y;
    var tP = (groundY - pTop) / inc.y;
    var sFlag = tF * inc.x;
    var sPer = tP * inc.x;
    var elev = Math.atan2(-inc.y, Math.abs(inc.x) + 1e-6);
    return {
      inc: inc,
      shadowFlag: sFlag,
      shadowPerson: sPer,
      tipFlag: flagX + sFlag,
      tipPer: personX + sPer,
      elevation: Math.abs(elev),
    };
  }

  /**
   * 模型二：水平镜面，法线 N 竖直向上（屏幕坐标 y 向下时取 n=(0,-1) 指向天空）。
   * 入射方向单位向量 I（光从杆顶射向镜面），反射 R = I - 2(I·N)N。
   */
  function mirrorReflect(flagTopX, flagTopY, mirrorX, mirrorY, eyeX, eyeY) {
    var ix = mirrorX - flagTopX;
    var iy = mirrorY - flagTopY;
    var I = norm(ix, iy);
    var nx = 0;
    var ny = -1;
    var dn = dot(I.x, I.y, nx, ny);
    var rx = I.x - 2 * dn * nx;
    var ry = I.y - 2 * dn * ny;
    /** 点到射线（镜心出发，方向 R）的垂直距离 */
    var ex = eyeX - mirrorX;
    var ey = eyeY - mirrorY;
    var cross = Math.abs(ex * ry - ey * rx);
    var lenR = Math.hypot(rx, ry) || 1;
    var dist = cross / lenR;
    /** 需反射光向前（朝向人眼一侧）才合理：沿 R 投影 t>0 */
    var tproj = dot(ex, ey, rx, ry) / lenR;
    if (tproj < 0) dist = 1e9;
    return { rx: rx, ry: ry, hitDist: dist };
  }

  /**
   * 模型三：斜率共线判定 |k1-k2| < eps
   */
  function collinearSlope(eyeX, eyeY, poleTopX, poleTopY, flagTopX, flagTopY, eps) {
    var k1 = (poleTopY - eyeY) / (poleTopX - eyeX + 1e-9);
    var k2 = (flagTopY - eyeY) / (flagTopX - eyeX + 1e-9);
    return { k1: k1, k2: k2, ok: Math.abs(k1 - k2) < eps };
  }

  /**
   * 在容器内「contain」适配：统一缩放系数 s = min(宽/W, 高/H)，保证 Lw/W === Lh/H，
   * 与 _draw 中 scale(Lw/W, Lh/H) 一致，太阳与文字不变形（接受两侧或上下少量留白）。
   */
  function fitCanvasToWrap(wrap, logicalW, logicalH) {
    var maxW = Math.max(1, (wrap && wrap.clientWidth) || logicalW);
    var maxH =
      wrap && wrap.clientHeight > 0
        ? wrap.clientHeight
        : Math.round((maxW * logicalH) / logicalW);
    var s = Math.min(maxW / logicalW, maxH / logicalH);
    var cw = Math.max(1, Math.round(s * logicalW));
    var lh = Math.max(1, Math.round(s * logicalH));
    return { cw: cw, lh: lh };
  }

  function MeasureLab(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.mode = "shadow";
    this._scale = 1;
    this._drag = null;

    this.sun = { x: 720, y: 60 };
    /** 影子法：旗杆勿过于靠左，否则太阳在右侧时光影向左延伸会整段画出画布 */
    this.flagX = 240;
    this.personX = 420;
    this.mirrorX = 420;
    this.poleBaseX = 380;
    this.personFootX = 520;

    this._resize();
    this._bind();
    this._loop();
  }

  MeasureLab.prototype._resize = function () {
    var wrap = this.canvas.parentElement;
    /** 与容器同宽（或受剩余高度限制缩小），逻辑坐标仍为 960×540，在 _draw 中 scale 映射 */
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

  MeasureLab.prototype._toLogical = function (ev) {
    var rect = this.canvas.getBoundingClientRect();
    var x = (ev.clientX - rect.left) / this._scale;
    var y = (ev.clientY - rect.top) / this._scale;
    return { x: x, y: y };
  };

  MeasureLab.prototype._bind = function () {
    var self = this;
    var el = this.canvas;
    el.addEventListener("pointerdown", function (e) {
      var L = self._toLogical(e);
      var lx = L.x;
      var ly = L.y;
      el.setPointerCapture(e.pointerId);
      if (self.mode === "shadow") {
        /** 绘制时整景平移 shiftX，太阳在屏幕上的位置为 sun.x + shiftX，命中区须一致 */
        var sxs = self._shadowShiftX();
        if (len(lx, ly, self.sun.x + sxs, self.sun.y) < 36) self._drag = { type: "sun" };
        else self._drag = null;
      } else if (self.mode === "mirror") {
        if (Math.abs(lx - self.mirrorX) < 28 && ly > GROUND_Y - 20) self._drag = { type: "mirror" };
        else self._drag = null;
      } else {
        if (len(lx, ly, self.poleBaseX, GROUND_Y) < 30) self._drag = { type: "pole" };
        else if (len(lx, ly, self.personFootX, GROUND_Y) < 30) self._drag = { type: "person" };
        else self._drag = null;
      }
    });
    var sunDragRaf = 0;
    var pendingSun = null;
    el.addEventListener("pointermove", function (e) {
      if (!self._drag) return;
      e.preventDefault();
      var L = self._toLogical(e);
      if (self._drag.type === "sun") {
        pendingSun = { x: L.x, y: L.y };
        if (!sunDragRaf) {
          sunDragRaf = requestAnimationFrame(function () {
            sunDragRaf = 0;
            if (self._drag && self._drag.type === "sun" && pendingSun) {
              self._applySunDragLogical(pendingSun.x, pendingSun.y);
            }
          });
        }
      } else if (self._drag.type === "mirror") {
        self.mirrorX = clamp(L.x, 220, 680);
      } else if (self._drag.type === "pole") {
        self.poleBaseX = clamp(L.x, 200, 520);
      } else if (self._drag.type === "person") {
        self.personFootX = clamp(L.x, 400, 880);
      }
    });
    var end = function () {
      self._drag = null;
      pendingSun = null;
      self._resize();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    if (typeof ResizeObserver !== "undefined" && el.parentElement) {
      var roTimer = null;
      new ResizeObserver(function () {
        if (self._drag) return;
        clearTimeout(roTimer);
        roTimer = setTimeout(function () {
          self._resize();
        }, 80);
      }).observe(el.parentElement);
    }
  };

  MeasureLab.prototype._loop = function () {
    var self = this;
    function frame() {
      self._draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  MeasureLab.prototype.setMode = function (m) {
    this.mode = m;
  };

  MeasureLab.prototype._draw = function () {
    var ctx = this.ctx;
    var Lw = this._lw || W;
    var Lh = this._lh || H;
    var dpr = this._dprScale || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Lw, Lh);
    ctx.save();
    ctx.scale(Lw / W, Lh / H);
    ctx.fillStyle = "#e8e4de";
    ctx.fillRect(0, 0, W, H);

    /** 操场地面 */
    ctx.fillStyle = "#c5d0dc";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.strokeStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    if (this.mode === "shadow") this._drawShadow(ctx);
    else if (this.mode === "mirror") this._drawMirror(ctx);
    else this._drawPole(ctx);
    ctx.restore();
  };

  /**
   * 影子法水平平移量（与 _drawShadow 一致），供绘制与指针命中、拖动共用
   */
  MeasureLab.prototype._shadowShiftX = function () {
    var fx = this.flagX;
    var px = this.personX;
    var sl = shadowScene(this.sun.x, this.sun.y, fx, GROUND_Y, FLAG_H, px, PERSON_H);
    var tipF = sl.tipFlag;
    var tipP = sl.tipPer;
    var sunX = this.sun.x;
    var minX = Math.min(fx, px, tipF, tipP);
    var maxX = Math.max(fx, px, tipF, tipP, sunX);
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
    return Math.round(shiftX);
  };

  /**
   * 影子法拖动太阳：指针逻辑坐标与「平移后太阳中心」应对齐；shiftX 随 sun 变化，单次 L.x-shiftX 会振荡。
   * 少量迭代使 sun.x + shiftX(sun) ≈ lx 收敛；坐标半像素对齐减轻文字与圆边缘闪烁。
   */
  MeasureLab.prototype._applySunDragLogical = function (lx, ly) {
    var k;
    for (k = 0; k < 4; k++) {
      var sx = this._shadowShiftX();
      this.sun.x = clamp(lx - sx, 420, 920);
      this.sun.y = clamp(ly, 20, 220);
    }
    this.sun.x = Math.round(this.sun.x * 4) / 4;
    this.sun.y = Math.round(this.sun.y * 4) / 4;
  };

  /**
   * 影子法：绘制平行太阳光（黄色虚线）、两直角三角形半透明填充
   * 当影端 tipF、tipP 超出画布左右时，对整景做水平平移，保证旗杆影、人影与太阳均落在可视区内（几何关系不变）。
   */
  MeasureLab.prototype._drawShadow = function (ctx) {
    var fx = this.flagX;
    var px = this.personX;
    var sl = shadowScene(this.sun.x, this.sun.y, fx, GROUND_Y, FLAG_H, px, PERSON_H);
    var inc = sl.inc;
    var rdx = inc.x;
    var rdy = inc.y;

    var tipF = sl.tipFlag;
    var tipP = sl.tipPer;
    var shiftX = this._shadowShiftX();

    ctx.save();
    ctx.translate(shiftX, 0);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
    ctx.lineWidth = 2;
    /** 若干条与 inc 平行的光线（教学演示「平行光」） */
    for (var o = -60; o <= 100; o += 40) {
      ctx.beginPath();
      ctx.moveTo(fx + o - rdx * 500, GROUND_Y - FLAG_H - rdy * 500);
      ctx.lineTo(fx + o + rdx * 600, GROUND_Y - FLAG_H + rdy * 600);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    /** 相似直角三角形高亮 */
    ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
    ctx.beginPath();
    ctx.moveTo(fx, GROUND_Y);
    ctx.lineTo(fx, GROUND_Y - FLAG_H);
    ctx.lineTo(tipF, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(34, 211, 238, 0.15)";
    ctx.beginPath();
    ctx.moveTo(px, GROUND_Y);
    ctx.lineTo(px, GROUND_Y - PERSON_H);
    ctx.lineTo(tipP, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    /** 旗杆与人 */
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(fx, GROUND_Y);
    ctx.lineTo(fx, GROUND_Y - FLAG_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, GROUND_Y);
    ctx.lineTo(px, GROUND_Y - PERSON_H);
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px Segoe UI, Microsoft YaHei, sans-serif";
    ctx.fillText("旗杆", fx - 8, GROUND_Y - FLAG_H - 8);
    ctx.fillText("人", px - 6, GROUND_Y - PERSON_H - 6);

    /** 影子 */
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx, GROUND_Y);
    ctx.lineTo(tipF, GROUND_Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, GROUND_Y);
    ctx.lineTo(tipP, GROUND_Y);
    ctx.stroke();

    /** 太阳可拖 */
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(this.sun.x, this.sun.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.font = "12px sans-serif";
    ctx.fillText("拖太阳", this.sun.x - 20, this.sun.y + 38);

    ctx.restore();

    /** 说明文字固定在画布左上角，不随场景平移 */
    ctx.fillStyle = "#475569";
    ctx.font = "13px sans-serif";
    ctx.fillText("旗杆影长 ≈ " + Math.abs(sl.shadowFlag).toFixed(0) + " px  人影长 ≈ " + Math.abs(sl.shadowPerson).toFixed(0) + " px", 24, 28);
    ctx.fillText("同一组平行光线 → 两直角三角形相似（对应边成比例）", 24, 48);
  };

  /**
   * 平面镜法：蝴蝶型相似；反射光线经过人眼时高亮
   */
  MeasureLab.prototype._drawMirror = function (ctx) {
    var flagTopX = this.flagX;
    var flagTopY = GROUND_Y - FLAG_H;
    var mx = this.mirrorX;
    var my = GROUND_Y;
    var eyeX = 780;
    var eyeY = GROUND_Y - MIRROR_EYE_ABOVE_GROUND;

    var refl = mirrorReflect(flagTopX, flagTopY, mx, my, eyeX, eyeY);
    var ok = refl.hitDist < 14;

    ctx.strokeStyle = ok ? "#4ade80" : "rgba(250, 204, 21, 0.9)";
    ctx.lineWidth = ok ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(flagTopX, flagTopY);
    ctx.lineTo(mx, my);
    var t = 500;
    ctx.lineTo(mx + refl.rx * t, my + refl.ry * t);
    ctx.stroke();

    /** 镜面 */
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(mx - 24, my - 4, 48, 8);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px sans-serif";
    ctx.fillText("镜子（拖动）", mx - 36, my + 22);

    /** 旗杆与人眼 */
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(flagTopX, GROUND_Y);
    ctx.lineTo(flagTopX, flagTopY);
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("人眼", eyeX - 14, eyeY - 14);

    if (ok) {
      ctx.fillStyle = "rgba(74, 222, 128, 0.2)";
      ctx.beginPath();
      ctx.moveTo(flagTopX, flagTopY);
      ctx.lineTo(mx, my);
      ctx.lineTo(eyeX, eyeY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("捕捉到视觉光线！", 24, 28);
    } else {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px sans-serif";
      ctx.fillText("拖动镜子使反射光经过人眼（反射角=入射角）", 24, 28);
    }
  };

  /**
   * 标杆法：拖标杆与人物；三点共线时以人眼为顶点、沿眼高水平线作 A 字型嵌套高亮（剔除人身高后的相似关系）。
   */
  MeasureLab.prototype._drawPole = function (ctx) {
    var flagX = this.flagX;
    var flagTopY = GROUND_Y - FLAG_H;
    var poleX = this.poleBaseX;
    var poleTopY = GROUND_Y - POLE_H;
    var footX = this.personFootX;
    var eyeX = footX;
    var eyeY = GROUND_Y - EYE_OFFSET;

    var col = collinearSlope(eyeX, eyeY, poleX, poleTopY, flagX, flagTopY, 0.012);
    var ok = col.ok;

    /** 旗杆与标杆（先画实体，再高亮与视线） */
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(flagX, GROUND_Y);
    ctx.lineTo(flagX, flagTopY);
    ctx.stroke();
    ctx.strokeStyle = "#8b5a3c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(poleX, GROUND_Y);
    ctx.lineTo(poleX, poleTopY);
    ctx.stroke();

    if (ok) {
      /** 大三角：人眼 — 旗杆顶 — 旗杆在眼高水平线上的垂足点 */
      ctx.fillStyle = "rgba(251, 146, 60, 0.38)";
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(flagX, flagTopY);
      ctx.lineTo(flagX, eyeY);
      ctx.closePath();
      ctx.fill();
      /** 小三角：人眼 — 标杆顶 — 标杆在眼高水平线上的垂足点 */
      ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(poleX, poleTopY);
      ctx.lineTo(poleX, eyeY);
      ctx.closePath();
      ctx.fill();
      /** 眼高水平辅助线（人眼 — 旗杆一侧） */
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(flagX, eyeY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /** 视线：人眼 → 旗杆顶 */
    ctx.strokeStyle = ok ? "#22c55e" : "rgba(250, 204, 21, 0.9)";
    ctx.lineWidth = ok ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(eyeX, eyeY);
    ctx.lineTo(flagX, flagTopY);
    ctx.stroke();

    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 7, 0, Math.PI * 2);
    ctx.fill();

    if (ok) {
      ctx.fillStyle = "#15803d";
      ctx.font = "bold 14px Segoe UI, Microsoft YaHei, sans-serif";
      ctx.fillText("三点共线 · A 字型相似（以眼高水平线为底）", 24, 28);
    } else {
      ctx.fillStyle = "#64748b";
      ctx.font = "13px Segoe UI, Microsoft YaHei, sans-serif";
      ctx.fillText("|k1−k2| = " + Math.abs(col.k1 - col.k2).toFixed(4) + "（对齐后应小于阈值）", 24, 28);
    }

    ctx.fillStyle = "#475569";
    ctx.font = "12px Segoe UI, Microsoft YaHei, sans-serif";
    ctx.fillText("拖标杆基座 / 拖人（脚的位置）", 24, H - 24);
  };

  /**
   * 误差分析模块：
   * 1）手动倾斜 θ（度，−5°～+5°）—— 原「手部晃动 / 非竖直」示意；
   * 2）可选风力等级 0～5：在 θ 上叠加随时间变化的摆动角（sin 与组合波 + 微扰），模拟阵风导致杆顶晃动。
   * 有效倾角 θ_eff = θ_手动 + θ_风(t)，再代入与原先相同的几何投射，观察古塔上高度偏差。
   */
  function ErrorAmpLab(canvasEl, rangeEl, labelEl, shakeHost, windRangeEl) {
    this.canvas = canvasEl;
    this.range = rangeEl;
    /** 若 range 元素带 data-fixed-manual-deg，则固定手动倾角（用于「仅风力」进阶模块；含 0°） */
    this._fixedManualDegAttr = rangeEl && rangeEl.hasAttribute("data-fixed-manual-deg");
    this._fixedManualDeg = this._fixedManualDegAttr ? Number(rangeEl.getAttribute("data-fixed-manual-deg")) : null;
    this.label = labelEl;
    this.shakeHost = shakeHost;
    /** 风力 0～5 级，0 为无风（不叠加摆动） */
    this.windRange = windRangeEl || null;
    this.ctx = canvasEl.getContext("2d");
    this.W = 720;
    this.H = 320;
    this._scale = 1;
    this._lastDeg = 0;
    var self = this;
    this._resize();
    var onInput = function () {
      self._syncShake();
    };
    if (rangeEl && !this._fixedManualDegAttr) {
      rangeEl.addEventListener("input", onInput);
      rangeEl.addEventListener("change", onInput);
    }
    if (this.windRange) {
      this.windRange.addEventListener("input", onInput);
      this.windRange.addEventListener("change", onInput);
    }
    if (typeof ResizeObserver !== "undefined" && self.canvas.parentElement) {
      new ResizeObserver(function () {
        self._resize();
      }).observe(self.canvas.parentElement);
    }
    function loop() {
      self._drawFrame();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  ErrorAmpLab.prototype._resize = function () {
    var wrap = this.canvas.parentElement;
    var sz = fitCanvasToWrap(wrap, this.W, this.H);
    var cw = sz.cw;
    this._lw = cw;
    this._lh = sz.lh;
    this._scale = cw / this.W;
    this.canvas.style.width = cw + "px";
    this.canvas.style.height = this._lh + "px";
    var dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(this._lh * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._dprScale = dpr;
  };

  /** 手动倾斜：滑块 −50～50 → −5.0°～+5.0°（步长 0.1°）；固定模式用 data-fixed-manual-deg */
  ErrorAmpLab.prototype._readManualDeg = function () {
    if (this._fixedManualDegAttr) {
      var v = this._fixedManualDeg;
      return isNaN(v) ? 0 : v;
    }
    if (!this.range) return 0;
    return Number(this.range.value) / 10;
  };

  /**
   * 风力摆动角（度）：等级越高振幅越大，5 级约 ±5° 峰值。
   * 用多频 sin 叠加模拟非规则摆动，并加缓变项避免完全周期化。
   */
  ErrorAmpLab.prototype._windOscillationDeg = function () {
    if (!this.windRange) return 0;
    var level = Number(this.windRange.value);
    if (!level || level <= 0) return 0;
    var t = Date.now() / 1000;
    var maxAmp = (level / 5) * 5;
    var w =
      0.52 * Math.sin(t * 2.4) +
      0.28 * Math.sin(t * 4.1 + 0.7) +
      0.15 * Math.sin(t * 6.3) * Math.cos(t * 1.9);
    return maxAmp * w;
  };

  /** 有效倾角（度）= 手动 + 风力摆动 */
  ErrorAmpLab.prototype._readEffectiveDeg = function () {
    return this._readManualDeg() + this._windOscillationDeg();
  };

  ErrorAmpLab.prototype._syncShake = function () {
    var eff = Math.abs(this._readEffectiveDeg());
    var windLv = this.windRange ? Number(this.windRange.value) : 0;
    if (this.shakeHost) {
      this.shakeHost.classList.toggle("is-error-shaking", eff > 0.35 || windLv > 0);
    }
  };

  ErrorAmpLab.prototype._drawFrame = function () {
    var deg = this._readEffectiveDeg();
    this._lastDeg = deg;
    this._drawError((deg * Math.PI) / 180);
    this._syncShake();
  };

  /**
   * 绘制侧面剖视：地面线、人眼、竖直参考杆、倾斜标杆、远处旗杆。
   * 偏差：将 E 与倾斜杆顶 T 连线延长到 x=旗杆处，与真实顶点高度差换算为米（示意比例）。
   */
  ErrorAmpLab.prototype._drawError = function (thetaRad) {
    var ctx = this.ctx;
    var W = this.W;
    var H = this.H;
    var Lw = this._lw || W;
    var Lh = this._lh || H;
    var dpr = this._dprScale || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Lw, Lh);
    ctx.save();
    ctx.scale(Lw / W, Lh / H);
    var gy = 268;
    /** 场景几何（像素） */
    var eyeX = 72;
    var eyeY = gy - 36;
    var poleBaseX = 240;
    var poleLen = 88;
    var flagX = 600;

    var poleTopX0 = poleBaseX;
    var poleTopY0 = gy - poleLen;
    /** 倾斜后杆顶：绕杆底旋转 θ，屏幕坐标 y 向下为正 */
    var poleTopX = poleBaseX + poleLen * Math.sin(thetaRad);
    var poleTopY = gy - poleLen * Math.cos(thetaRad);

    /**
     * 真实旗杆顶点高度：取「人眼—竖直标杆顶」视线与旗杆竖直线交点，
     * 保证 θ=0 时偏差为 0（完美共线）。
     */
    var flagTopY = eyeY + ((poleTopY0 - eyeY) / (poleBaseX - eyeX + 1e-6)) * (flagX - eyeX);
    var trueFlagH = gy - flagTopY;
    /** 射线 E→T 延长到旗杆竖直线 x=flagX 处的 y */
    var dx = flagX - eyeX;
    var ey = poleTopY - eyeY;
    var ex = poleTopX - eyeX;
    /** 避免 ex→0 时除法溢出（极端角度） */
    if (Math.abs(ex) < 1e-4) ex = ex >= 0 ? 1e-4 : -1e-4;
    var hitY = eyeY + (ey / ex) * dx;
    /** 像素偏差（向下为正表示击中点更低） */
    var devPx = hitY - flagTopY;
    /** 示意：20px ≈ 1m */
    var pxPerM = 20;
    var devM = devPx / pxPerM;

    ctx.fillStyle = "#e8edf4";
    ctx.fillRect(0, 0, W, H);

    /** 天空渐变 */
    var g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, "#cfe4f7");
    g.addColorStop(1, "#b8cce0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, gy);

    ctx.strokeStyle = "#78909c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();

    /** 远处古塔（示意竖线） */
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(flagX, gy);
    ctx.lineTo(flagX, flagTopY);
    ctx.stroke();

    /** 竖直参考（虚线，θ=0 时的标杆） */
    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(poleBaseX, gy);
    ctx.lineTo(poleTopX0, poleTopY0);
    ctx.stroke();
    ctx.setLineDash([]);

    /** 倾斜标杆实体 */
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(poleBaseX, gy);
    ctx.lineTo(poleTopX, poleTopY);
    ctx.stroke();

    /** 人眼 */
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 7, 0, Math.PI * 2);
    ctx.fill();

    /** 视线：人眼 → 倾斜杆顶 → 延长 */
    var sightOk = Math.abs(thetaRad) < 0.002;
    ctx.strokeStyle = sightOk ? "rgba(74, 222, 128, 0.95)" : "rgba(74, 222, 128, 0.75)";
    ctx.lineWidth = sightOk ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(eyeX, eyeY);
    ctx.lineTo(poleTopX, poleTopY);
    ctx.lineTo(flagX, hitY);
    ctx.stroke();

    /** 古塔上「真实顶点」与「视线击中点」偏差带 */
    if (!sightOk) {
      var bandTop = Math.min(flagTopY, hitY);
      var bandBot = Math.max(flagTopY, hitY);
      ctx.fillStyle = "rgba(248, 113, 113, 0.35)";
      ctx.fillRect(flagX - 10, bandTop, 20, Math.max(4, bandBot - bandTop));
      var bounce = Math.sin(Date.now() / 180) * 3;
      var windLvDraw = this.windRange ? Number(this.windRange.value) : 0;
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 12px Segoe UI, Microsoft YaHei, sans-serif";
      if (windLvDraw > 0) {
        ctx.fillText("受风力影响，当前测绘最大误差：± " + Math.abs(devM).toFixed(1) + " 米！", Math.max(8, flagX - 168), bandTop - 10 + bounce);
      } else {
        ctx.fillText("偏离真实塔顶约 " + Math.abs(devM).toFixed(1) + " m", flagX - 52, bandTop - 10 + bounce);
      }
    }

    ctx.fillStyle = "#334155";
    ctx.font = "12px Segoe UI, Microsoft YaHei, sans-serif";
    ctx.fillText("人眼", eyeX - 10, eyeY - 12);
    ctx.fillText("标杆", poleBaseX - 12, gy + 16);
    ctx.fillText("古塔", flagX - 12, gy + 16);

    if (this.label) {
      var windLv = this.windRange ? Number(this.windRange.value) : 0;
      var manDeg = this._readManualDeg();
      var windDeg = this._windOscillationDeg();
      if (sightOk && windLv <= 0) {
        this.label.textContent =
          "完美共线（竖直标杆），θ = 0°，视线击中塔顶真实高度（示意约 " + (trueFlagH / pxPerM).toFixed(1) + " m），误差 0 m。";
      } else if (windLv > 0) {
        this.label.textContent =
          "风力 " +
          windLv +
          " 级：瞬时有效倾角 ≈ " +
          ((thetaRad * 180) / Math.PI).toFixed(2) +
          "°（手动 " +
          manDeg.toFixed(1) +
          "° + 风摆 ≈ " +
          windDeg.toFixed(2) +
          "°）。受风力影响，当前测绘最大误差：± " +
          Math.abs(devM).toFixed(2) +
          " 米！（示意相似比放大）";
      } else {
        this.label.textContent =
          "当前倾斜角 θ = " +
          ((thetaRad * 180) / Math.PI).toFixed(1) +
          "°。视线沿倾斜杆顶投射至远处古塔，竖直偏差约 " +
          Math.abs(devM).toFixed(2) +
          " m（示意：小角误差经水平距离放大）。";
      }
    }
    ctx.restore();
  };

  global.MeasureLab = MeasureLab;
  global.ErrorAmpLab = ErrorAmpLab;
})(typeof window !== "undefined" ? window : this);
