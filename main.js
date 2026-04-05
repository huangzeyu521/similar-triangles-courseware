/**
 * 《利用相似三角形测高》· 主程序
 * 职责：视图路由、情境遮罩任务卡、方案比拼/古建筑测绘局、数据速算、误差分析、随堂评价
 */
(function () {
  "use strict";

  var currentView = "home";
  /**
   * 情境挑战阶段：0 = 仅情境导入；1 = 已弹出任务卡（下一步文案变为「接受挑战」）
   */
  var challengePhase = 0;

  /** 主界面关卡顺序：入门 → 工具 → 速算 → 场景应用 → 误差 → 测验 → BOSS */
  var ORDER = ["challenge", "lab", "calc", "heritage", "error", "quiz", "extreme"];

  var TITLES = {
    home: "主界面",
    challenge: "悬赏榜 · 情境挑战",
    lab: "测绘局 · 方案比拼",
    heritage: "古建测绘",
    calc: "算学馆 · 数据速算",
    error: "鉴误阁 · 误差分析",
    quiz: "科举考 · 随堂评价",
    extreme: "极限挑战 · 高阶探究 / 风力",
  };

  var labInstance = null;
  var heritageInstance = null;
  var errorLabInstance = null;
  var extremeLabInstance = null;
  /** 当前速算 Tab 与题目种子 */
  var calcTab = "shadow";
  var calcSeed = null;

  var els = {
    announcer: document.getElementById("route-announcer"),
    contextBar: document.getElementById("module-context-bar"),
    contextTitle: document.getElementById("context-title"),
    contextSub: document.getElementById("context-sub"),
    btnHome: document.getElementById("btn-home"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    btnMusic: document.getElementById("btn-music"),
    bgm: document.getElementById("bgm"),
    labHint: document.getElementById("lab-hint-text"),
    heritageHint: document.getElementById("heritage-hint-text"),
    challengeModal: document.getElementById("challenge-modal"),
    calcCard: document.getElementById("calc-card"),
    calcAnswer: document.getElementById("calc-answer-input"),
    calcFeedback: document.getElementById("calc-feedback-main"),
    btnCalcSubmit: document.getElementById("btn-calc-submit"),
    btnCalcReroll: document.getElementById("btn-calc-reroll"),
    btnCalcFormula: document.getElementById("btn-calc-formula-hint"),
    calcFormulaPanel: document.getElementById("calc-formula-panel"),
    quizRoot: document.getElementById("quiz-root"),
    errorRange: document.getElementById("error-range"),
    errorWind: document.getElementById("error-wind"),
    errorLabel: document.getElementById("error-label"),
    errorShakeHost: document.getElementById("error-shake-host"),
    scrollPaper: document.getElementById("scroll-paper"),
  };

  function announce(msg) {
    if (els.announcer) els.announcer.textContent = msg;
  }

  function syncContext() {
    if (!els.contextBar || !els.contextTitle) return;
    if (currentView === "home") {
      els.contextBar.hidden = true;
      return;
    }
    els.contextBar.hidden = false;
    els.contextTitle.textContent = TITLES[currentView] || currentView;
    if (currentView === "challenge" && els.contextSub) {
      els.contextSub.hidden = false;
      els.contextSub.textContent =
        challengePhase === 0 ? "第 1 / 2 步：情境导入" : "第 2 / 2 步：接受任务";
    } else if (els.contextSub) {
      els.contextSub.hidden = true;
    }
  }

  /** 进入情境时同步任务卡显隐（不销毁 DOM，便于动画重播） */
  function syncChallengeModal() {
    var m = els.challengeModal;
    if (!m) return;
    if (challengePhase >= 1) {
      m.hidden = false;
      m.setAttribute("aria-hidden", "false");
      window.requestAnimationFrame(function () {
        m.classList.add("is-open");
      });
    } else {
      m.classList.remove("is-open");
      window.setTimeout(function () {
        if (challengePhase === 0) m.hidden = true;
        m.setAttribute("aria-hidden", "true");
      }, 320);
    }
  }

  /**
   * 切换主视图；进入 lab / error 时懒加载 Canvas 模块
   * @param {string} name
   * @param {{ challengePhase?: number }} [opt]
   */
  function showView(name, opt) {
    opt = opt || {};
    currentView = name;

    if (name === "challenge") {
      challengePhase = typeof opt.challengePhase === "number" ? opt.challengePhase : 0;
    }
    if (name === "home") {
      challengePhase = 0;
    }

    var mainStageEl = document.getElementById("main-stage");
    if (mainStageEl) {
      mainStageEl.classList.toggle("main-stage--home", name === "home");
    }

    document.querySelectorAll(".main-stage .view").forEach(function (v) {
      var id = v.id.replace("view-", "");
      var on = id === name;
      v.hidden = !on;
      v.classList.toggle("view-active", on);
      /** 非当前视图对辅助技术隐藏，避免读屏读到叠在一起的多个模块 */
      v.setAttribute("aria-hidden", on ? "false" : "true");
      if ("inert" in v) {
        try {
          v.inert = !on;
        } catch (e) {}
      }
    });

    if (name === "challenge") {
      syncChallengeModal();
    } else if (els.challengeModal) {
      els.challengeModal.classList.remove("is-open");
      els.challengeModal.hidden = true;
    }

    if (name === "lab" && typeof MeasureLab !== "undefined" && !labInstance) {
      var c = document.getElementById("lab-canvas");
      if (c) {
        labInstance = new MeasureLab(c);
        setupLabTabs();
      }
    } else if (name === "lab" && labInstance) {
      labInstance._resize();
    }

    if (name === "heritage") {
      setupHeritageModeTabs();
      var hLabPanel = document.getElementById("heritage-lab-panel");
      var hClassicPanel = document.getElementById("heritage-classic-panel");
      if (hLabPanel && hClassicPanel) {
        hLabPanel.hidden = false;
        hClassicPanel.hidden = true;
        document.querySelectorAll(".heritage-mode-tab[data-heritage-mode]").forEach(function (t) {
          var isLab = t.getAttribute("data-heritage-mode") === "lab";
          t.classList.toggle("active", isLab);
          t.setAttribute("aria-selected", isLab ? "true" : "false");
        });
      }
    }

    if (name === "heritage" && typeof HeritageLab !== "undefined" && !heritageInstance) {
      var hCan = document.getElementById("heritage-canvas");
      if (hCan) {
        heritageInstance = new HeritageLab(hCan);
        setupHeritageTabs();
      }
    } else if (name === "heritage" && heritageInstance) {
      heritageInstance._resize();
    }

    if (name === "error" && typeof ErrorAmpLab !== "undefined" && !errorLabInstance) {
      var errCan = document.getElementById("error-canvas");
      if (errCan) {
        errorLabInstance = new ErrorAmpLab(errCan, els.errorRange, els.errorLabel, els.errorShakeHost, els.errorWind);
      }
    } else if (name === "error" && errorLabInstance && errorLabInstance._resize) {
      errorLabInstance._resize();
    }

    if (name === "extreme") {
      setupExtremeTabs();
      extremeQuizIndex = 0;
      renderExtremeQuiz();
      var exQuiz = document.getElementById("extreme-panel-quiz");
      var exWind = document.getElementById("extreme-panel-wind");
      if (exQuiz && exWind) {
        exQuiz.hidden = false;
        exWind.hidden = true;
        document.querySelectorAll(".extreme-tab[data-extreme-panel]").forEach(function (t) {
          var isQuiz = t.getAttribute("data-extreme-panel") === "quiz";
          t.classList.toggle("active", isQuiz);
          t.setAttribute("aria-selected", isQuiz ? "true" : "false");
        });
      }
    }

    if (name === "extreme" && typeof ErrorAmpLab !== "undefined" && !extremeLabInstance) {
      var exCan = document.getElementById("extreme-canvas");
      if (exCan) {
        extremeLabInstance = new ErrorAmpLab(
          exCan,
          document.getElementById("extreme-manual-deg"),
          document.getElementById("extreme-label"),
          document.getElementById("extreme-shake-host"),
          document.getElementById("extreme-wind")
        );
      }
    } else if (name === "extreme" && extremeLabInstance && extremeLabInstance._resize) {
      if (document.getElementById("extreme-panel-wind") && !document.getElementById("extreme-panel-wind").hidden) {
        extremeLabInstance._resize();
      }
    }

    if (name === "calc") {
      setupCalcTabs();
      rollCalcForTab();
      renderCalcCard();
      resetCalcFeedback();
    }

    if (name === "quiz") {
      quizIndex = 0;
      renderQuiz();
    }

    announce(name && TITLES[name] ? "已进入：" + TITLES[name] : name === "home" ? "主界面" : "");
    syncContext();
    updateNav();
    if (name === "home" && els.scrollPaper) {
      els.scrollPaper.classList.add("is-reopen");
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (els.scrollPaper) els.scrollPaper.classList.remove("is-reopen");
        });
      });
    }
    window.setTimeout(function () {
      if (mainStageEl && name !== "home") {
        mainStageEl.setAttribute("tabindex", "-1");
        try {
          mainStageEl.focus({ preventScroll: true });
        } catch (e) {}
      }
    }, 50);
  }

  function setupLabTabs() {
    var tabs = document.querySelectorAll(".lab-tab[data-lab]");
    var hintMap = {
      shadow: "拖动右上方的「太阳」，观察平行光与影长变化及相似直角三角形。",
      mirror: "左右拖动地面「镜子」，使反射光经过人眼（变绿即捕捉到光路）。",
      pole: "拖动标杆基座与人物位置，使三点共线时射线变绿。",
    };
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var mode = tab.getAttribute("data-lab");
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        if (labInstance) {
          labInstance.setMode(mode);
        }
        if (els.labHint) els.labHint.textContent = hintMap[mode] || "";
      });
    });
    if (els.labHint) els.labHint.textContent = hintMap.shadow;
  }

  function setupHeritageTabs() {
    var tabs = document.querySelectorAll(".heritage-tab[data-heritage]");
    var hintMap = {
      shadow: "拖动「日轮」模拟不同时刻太阳高度角，观察古塔与八尺木表的影长及相似三角形。",
      mirror: "左右拖动地面「青铜盆水」，使塔顶反射光进入工匠眼睛（绿光即测绘视线锁定）。",
      pole: "拖动测绘木杆或工匠站位，让步天立杆与城墙垛口共线时射线变绿。",
    };
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var mode = tab.getAttribute("data-heritage");
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        if (heritageInstance) heritageInstance.setMode(mode);
        if (els.heritageHint) els.heritageHint.textContent = hintMap[mode] || "";
      });
    });
    if (els.heritageHint) els.heritageHint.textContent = hintMap.shadow;
  }

  // ---------- 数据速算：三种模型 + 多情境模板，判分容差 ±0.1 ----------

  /**
   * 影子法核心：同一时刻 H = (h × s2) / s1（h 为参考物高度，s1、s2 为对应影长）
   * 情境 A：用人身高与影长作参考；情境 B：用直立标杆高度与影长作参考。
   */
  function genShadowProblem() {
    var usePole = Math.random() < 0.5;
    var h = usePole
      ? Math.round((1.0 + Math.random() * 1.0) * 10) / 10
      : Math.round((1.5 + Math.random() * 0.3) * 10) / 10;
    var s1 = Math.round((1.2 + Math.random() * 1.4) * 10) / 10;
    var s2 = Math.round((5 + Math.random() * 10) * 10) / 10;
    var H = (h * s2) / s1;
    return {
      kind: "shadow",
      variant: usePole ? "pole" : "person",
      h: h,
      s1: s1,
      s2: s2,
      answer: Math.round(H * 10) / 10,
      formulaPlain:
        "同一时刻物高与影长成正比：H / 参考物高 = 树的影长 / 参考影长，即 H = (参考物高 × 树的影长) ÷ 参考影长。",
    };
  }

  /**
   * 平面镜法：H = (d2 × h) / d1（h 眼高，d1 人到镜，d2 镜到树/杆底水平距）
   */
  function genMirrorProblem() {
    var h = Math.round((1.45 + Math.random() * 0.35) * 10) / 10;
    var d1 = Math.round((0.8 + Math.random() * 1.8) * 10) / 10;
    var d2 = Math.round((5 + Math.random() * 8) * 10) / 10;
    var H = (d2 * h) / d1;
    return {
      kind: "mirror",
      variant: Math.random() < 0.5 ? "plain" : "wordy",
      h: h,
      d1: d1,
      d2: d2,
      answer: Math.round(H * 10) / 10,
      formulaPlain:
        "入射角等于反射角 ⇒ 两直角三角形相似：树高 H 与眼高 h 之比 = 镜到树水平距 d₂ 与人到镜水平距 d₁ 之比，即 H = (d₂ × h) ÷ d₁。",
    };
  }

  /**
   * 标杆法：H = h + b × (L − h) / a（a 人到标杆，b 人到旗杆/树，L 标杆长，h 眼高）
   */
  function genPoleProblem() {
    var h = Math.round((1.45 + Math.random() * 0.25) * 100) / 100;
    var L = Math.round((2 + Math.random() * 0.8) * 10) / 10;
    if (L <= h + 0.05) L = Math.round((h + 0.5 + Math.random() * 0.5) * 10) / 10;
    var a = Math.round((1.5 + Math.random() * 2.5) * 10) / 10;
    var b = Math.round((6 + Math.random() * 6) * 10) / 10;
    var H = h + (b * (L - h)) / a;
    return {
      kind: "pole",
      h: h,
      L: L,
      a: a,
      b: b,
      answer: Math.round(H * 10) / 10,
      formulaPlain:
        "视线过标杆顶与树顶共线 ⇒ △ 相似：树顶高出眼高部分与 (L−h) 对应，水平比为 b∶a，故 H = h + b×(L−h)/a。",
    };
  }

  function rollCalcForTab() {
    if (calcTab === "shadow") calcSeed = genShadowProblem();
    else if (calcTab === "mirror") calcSeed = genMirrorProblem();
    else calcSeed = genPoleProblem();
  }

  function renderCalcCard() {
    if (!els.calcCard || !calcSeed) return;
    var d = calcSeed;
    var html = "";
    if (d.kind === "shadow") {
      if (d.variant === "pole") {
        html =
          "<p class=\"calc-scenario\">阳光下，将一根高 <strong>" +
          d.h +
          " m</strong> 的<strong>直立标杆</strong>立于地面，测得其<strong>影长</strong>为 <strong>" +
          d.s1 +
          " m</strong>；同一时刻测得一棵树的<strong>影长</strong>为 <strong>" +
          d.s2 +
          " m</strong>。设树高为 H（m）。</p>";
      } else {
        html =
          "<p class=\"calc-scenario\">阳光下，小明的<strong>身高</strong>为 <strong>" +
          d.h +
          " m</strong>，<strong>影长</strong>为 <strong>" +
          d.s1 +
          " m</strong>；同一时刻测得一棵树的<strong>影长</strong>为 <strong>" +
          d.s2 +
          " m</strong>。设树高为 H（m）。</p>";
      }
    } else if (d.kind === "mirror") {
      if (d.variant === "wordy") {
        html =
          "<p class=\"calc-scenario\">在水平地面上平放一面小镜子，人退后至恰能在镜中看到树顶。已知<strong>眼高</strong> <strong>" +
          d.h +
          " m</strong>，<strong>人眼到镜面</strong>的水平距离 <strong>" +
          d.d1 +
          " m</strong>，<strong>镜面到树根</strong>的水平距离 <strong>" +
          d.d2 +
          " m</strong>。求树高 H（m）。</p>";
      } else {
        html =
          "<p class=\"calc-scenario\">小镜子平放在水平地面，你<strong>眼高</strong>为 <strong>" +
          d.h +
          " m</strong>，<strong>人眼到镜子</strong>的水平距离为 <strong>" +
          d.d1 +
          " m</strong>，<strong>镜子到旗杆底</strong>的水平距离为 <strong>" +
          d.d2 +
          " m</strong>。恰能在镜中看到旗杆顶端时，求旗杆高度 H（m）。</p>";
      }
    } else {
      html =
        "<p class=\"calc-scenario\">标杆法测高：<strong>眼高</strong> <strong>" +
        d.h +
        " m</strong>，<strong>标杆长</strong> <strong>" +
        d.L +
        " m</strong>，<strong>人到标杆</strong>水平距离 <strong>" +
        d.a +
        " m</strong>，<strong>人到旗杆</strong>水平距离 <strong>" +
        d.b +
        " m</strong>（三点共线）。求旗杆高度 H（m）。</p>";
    }
    els.calcCard.innerHTML = html;
  }

  function resetCalcFeedback() {
    if (els.calcFeedback) {
      els.calcFeedback.textContent = "";
      els.calcFeedback.className = "calc-feedback-main";
      els.calcFeedback.classList.remove("liquid-glass-reward");
    }
    if (els.calcAnswer) els.calcAnswer.value = "";
    if (els.btnCalcFormula) els.btnCalcFormula.hidden = true;
    if (els.calcFormulaPanel) {
      els.calcFormulaPanel.hidden = true;
      els.calcFormulaPanel.textContent = "";
    }
  }

  function checkCalcAnswer() {
    if (!calcSeed || !els.calcAnswer || !els.calcFeedback) return;
    var v = parseFloat(String(els.calcAnswer.value).trim());
    if (isNaN(v)) {
      els.calcFeedback.textContent = "请输入一个数字（可保留一位小数）。";
      els.calcFeedback.className = "calc-feedback-main bad";
      return;
    }
    var ok = Math.abs(v - calcSeed.answer) <= 0.1 + 1e-9;
    if (ok) {
      els.calcFeedback.textContent = "✔ 恭喜你，计算准确！";
      els.calcFeedback.className = "calc-feedback-main ok liquid-glass-reward";
      if (els.btnCalcFormula) els.btnCalcFormula.hidden = true;
      if (els.calcFormulaPanel) els.calcFormulaPanel.hidden = true;
    } else {
      els.calcFeedback.textContent = "结果与参考答案偏差超过 0.1m，请再算算或查看公式提示。";
      els.calcFeedback.className = "calc-feedback-main bad";
      els.calcFeedback.classList.remove("liquid-glass-reward");
      if (els.btnCalcFormula) els.btnCalcFormula.hidden = false;
      if (els.calcFormulaPanel) {
        els.calcFormulaPanel.textContent = calcSeed.formulaPlain || "";
        els.calcFormulaPanel.hidden = true;
      }
    }
  }

  var calcTabsBound = false;

  function setupCalcTabs() {
    if (calcTabsBound) return;
    calcTabsBound = true;
    document.querySelectorAll(".calc-tab[data-calc-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        calcTab = tab.getAttribute("data-calc-tab") || "shadow";
        document.querySelectorAll(".calc-tab[data-calc-tab]").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        rollCalcForTab();
        renderCalcCard();
        resetCalcFeedback();
        announce("已切换为：" + (calcTab === "shadow" ? "影子法" : calcTab === "mirror" ? "平面镜法" : "标杆法"));
      });
    });
    if (els.btnCalcSubmit) {
      els.btnCalcSubmit.addEventListener("click", checkCalcAnswer);
    }
    if (els.calcAnswer) {
      els.calcAnswer.addEventListener("keydown", function (e) {
        if (e.key === "Enter") checkCalcAnswer();
      });
    }
    if (els.btnCalcFormula) {
      els.btnCalcFormula.addEventListener("click", function () {
        if (!els.calcFormulaPanel || !calcSeed) return;
        var open = els.calcFormulaPanel.hidden;
        els.calcFormulaPanel.hidden = !open;
        els.calcFormulaPanel.textContent = calcSeed.formulaPlain || "";
      });
    }
    if (els.btnCalcReroll) {
      els.btnCalcReroll.addEventListener("click", function () {
        rollCalcForTab();
        renderCalcCard();
        resetCalcFeedback();
        announce("已换一题");
      });
    }
  }

  // ---------- 随堂评价：固定 3 题，单题界面，事件委托 ----------

  var quizIndex = 0;

  /** 科举考：现代生活应用与综合建模（进阶） */
  var QUIZ = [
    {
      q:
        "小明用手电筒配合平面镜测量古城墙高度：在地面点 P 处放一平面镜，光线从人眼所在 A 处经镜面反射刚好到达城墙顶端 C。已知 AB⊥BD，CD⊥BD，测得 AB = 1.2 m，BP = 1.8 m，PD = 12 m。求城墙高度 CD？",
      labels: ["A", "B", "C", "D"],
      opts: ["6 m", "8 m", "18 m", "24 m"],
      correct: 1,
      hint:
        "镜面反射：入射角等于反射角 ⇒ △ABP ∼ △CDP（直角对应），故 AB/CD = BP/DP，CD = AB×DP÷BP = 1.2×12÷1.8 = 8（m）。",
    },
    {
      q:
        "小明用自制直角三角形纸板 DEF 测树高 AB：使斜边 DF 保持水平，且边 DE 与树根 B 在同一直线上。已知 DF = 50 cm，EF = 30 cm，DF 离地高度 AC = 1.5 m，人到树的水平距离 CD = 20 m。求树高？",
      labels: ["A", "B", "C", "D"],
      opts: ["12 m", "13.5 m", "15 m", "16.5 m"],
      correct: 3,
      hint:
        "∠E 为直角且 DF 为斜边时，竖直边与水平边比 EF∶DE = 30∶40。由 △DEF ∼ △DCB 得 BC = CD×(EF/DE) = 20×0.75 = 15（m），树高 AB = BC + AC = 15 + 1.5 = 16.5（m）。",
    },
    {
      q:
        "1 m 长的竹竿影长为 0.4 m。一棵树的影子一部分落在高 0.3 m 的台阶上（该段「影长」水平量得 0.2 m），落在地面上的影长为 4.4 m。求树高？",
      labels: ["A", "B", "C", "D"],
      opts: ["11.5 m", "11.75 m", "11.8 m", "12.25 m"],
      correct: 2,
      hint:
        "将台阶上影子折算：水平总有效影长约 4.4 + 0.2 = 4.6（m），物高∶影长 = 1∶0.4 ⇒ 竖直高差 4.6÷0.4 = 11.5（m），再加上台阶抬高 0.3 m，树高约 11.8 m。",
    },
  ];

  /** 古建测绘 · 算经闯关：《孙子算经》《九章算术》 */
  var heritageQuizIndex = 0;
  var HERITAGE_QUIZ = [
    {
      q:
        "《孙子算经》竹竿测影：今有竿不知其长，量得其影长一丈五尺；另立一标杆，长一尺五寸，影长五寸。问竿长几何？（1 丈 = 10 尺，1 尺 = 10 寸）",
      labels: ["A", "B", "C", "D"],
      opts: ["五丈", "四丈五尺", "一丈", "五尺"],
      correct: 1,
      hint:
        "同一时刻物高与影长成正比：标杆 1.5 尺 / 影 0.5 尺 = 竿长 x / 影 15 尺 ⇒ x = 45 尺 = 四丈五尺。",
    },
    {
      q:
        "《九章算术》井深几何：今有井径五尺，不知其深；立五尺木于井口边缘，从木末望水岸，视线与井径方向「入径」四寸。问井深？",
      labels: ["A", "B", "C", "D"],
      opts: ["57.5 尺", "62.5 尺", "50 尺", "60 尺"],
      correct: 0,
      hint:
        "视线与木杆、井径构成相似直角三角形：竖直比 5∶0.4 对应井径 5 尺方向，得视线方向总竖直段约 5÷0.4×5 = 62.5 尺，减去地表木杆 5 尺，井深 57.5 尺。（此为古题常见比例模型）",
    },
  ];

  /** 极限挑战 · 高阶探究（与风力模拟并列） */
  var extremeQuizIndex = 0;
  var EXTREME_QUIZ = [
    {
      q:
        "1 m 竹竿影长 0.4 m。一棵树的影子不全在地面：部分落在高 0.3 m 的台阶上（该段水平量得 0.2 m），地面影长 4.4 m。则树高为？",
      labels: ["A", "B", "C", "D"],
      opts: ["11.5 m", "11.75 m", "11.8 m", "12.25 m"],
      correct: 2,
      hint:
        "辅助线：经台阶上影子顶端作竖直辅助。有效水平影长约 4.6 m，按 1∶0.4 得竖直高差 11.5 m，再加台阶抬高 0.3 m ⇒ 11.8 m。",
    },
    {
      q:
        "两路灯 AD、BC 竖直立于地面，小明（身高 1.8 m）站在两灯之间。路灯 BC 高 9 m，小明在灯 C 一侧地面上的影长为 2 m；此时小明到路灯 A 的水平距离为 4.5 m。求路灯 AD 的高度？",
      labels: ["A", "B", "C", "D"],
      opts: ["10 m", "12 m", "14 m", "15 m"],
      correct: 1,
      hint:
        "先由人与灯 BC、影长 2 m 用相似求小明到 C 的水平距离，再得两灯间距；再由人与灯 AD、距 A 4.5 m 列第二次相似，求得 AD = 12 m。",
    },
  ];

  function renderQuiz() {
    if (!els.quizRoot) return;
    var total = QUIZ.length;
    var item = QUIZ[quizIndex];
    var locked = false;

    els.quizRoot.innerHTML =
      '<p class="quiz-progress" id="quiz-progress">第 ' +
      (quizIndex + 1) +
      " / " +
      total +
      " 题</p>" +
      '<div class="quiz-panel" data-quiz-idx="' +
      quizIndex +
      '">' +
      '<p class="quiz-q">' +
      item.q +
      "</p>" +
      '<div class="quiz-opts-grid" role="radiogroup" aria-label="选项"></div>' +
      '<p class="quiz-inline-feedback" id="quiz-inline-fb" role="status"></p>' +
      '<div class="quiz-hint-slide" id="quiz-hint-slide" hidden>' +
      '<span class="quiz-hint-ico">💡</span> <span id="quiz-hint-text"></span>' +
      "</div>" +
      "</div>" +
      '<div class="quiz-nav-row">' +
      '<button type="button" class="btn" id="quiz-btn-prev" ' +
      (quizIndex === 0 ? "disabled" : "") +
      ">上一题</button>" +
      '<button type="button" class="btn btn-primary" id="quiz-btn-next">' +
      (quizIndex >= total - 1 ? "下一关 · 极限挑战" : "下一题") +
      "</button>" +
      "</div>";

    var grid = els.quizRoot.querySelector(".quiz-opts-grid");
    item.opts.forEach(function (text, oi) {
      var lab = item.labels[oi];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt-btn";
      b.setAttribute("data-oi", String(oi));
      b.innerHTML = '<span class="quiz-opt-key">' + lab + "</span><span class=\"quiz-opt-txt\">" + text + "</span>";
      grid.appendChild(b);
    });

    var fb = els.quizRoot.querySelector("#quiz-inline-fb");
    var hintSlide = els.quizRoot.querySelector("#quiz-hint-slide");
    var hintText = els.quizRoot.querySelector("#quiz-hint-text");

    els.quizRoot.querySelector(".quiz-opts-grid").addEventListener("click", function (e) {
      var btn = e.target.closest(".quiz-opt-btn");
      if (!btn || locked) return;
      var oi = Number(btn.getAttribute("data-oi"));
      locked = true;
      var ok = oi === item.correct;
      els.quizRoot.querySelectorAll(".quiz-opt-btn").forEach(function (el, idx) {
        el.classList.remove("opt-correct", "opt-wrong");
        if (idx === item.correct) el.classList.add("opt-correct");
        if (!ok && idx === oi) el.classList.add("opt-wrong");
        el.disabled = true;
      });
      fb.textContent = ok ? "✔ 回答正确" : "✘ 再想一想";
      fb.className = "quiz-inline-feedback " + (ok ? "ok liquid-glass-reward" : "bad");
      if (!ok && item.hint) {
        hintText.textContent = item.hint;
        hintSlide.hidden = false;
        hintSlide.classList.add("is-visible");
      }
    });

    els.quizRoot.querySelector("#quiz-btn-prev").addEventListener("click", function () {
      if (quizIndex > 0) {
        quizIndex--;
        renderQuiz();
      }
    });
    els.quizRoot.querySelector("#quiz-btn-next").addEventListener("click", function () {
      if (quizIndex < total - 1) {
        quizIndex++;
        renderQuiz();
      } else {
        showView("extreme");
        announce("已进入极限挑战");
      }
    });
  }

  /** 极限闯关：答错时屏幕轻微震动（与 CSS .quiz-shake-once 配套） */
  function triggerExtremeQuizShake() {
    var root = document.getElementById("extreme-quiz-root");
    if (!root) return;
    root.classList.remove("quiz-shake-once");
    void root.offsetWidth;
    root.classList.add("quiz-shake-once");
    window.setTimeout(function () {
      root.classList.remove("quiz-shake-once");
    }, 480);
  }

  /** 古建测绘 · 算经闯关渲染（水墨卷轴题板样式见 CSS） */
  function renderHeritageQuiz() {
    var root = document.getElementById("heritage-quiz-root");
    if (!root) return;
    var total = HERITAGE_QUIZ.length;
    var item = HERITAGE_QUIZ[heritageQuizIndex];
    var locked = false;

    root.innerHTML =
      '<p class="heritage-quiz-progress">算经闯关 · 第 ' +
      (heritageQuizIndex + 1) +
      " / " +
      total +
      " 题</p>" +
      '<div class="heritage-quiz-panel">' +
      '<p class="heritage-quiz-q">' +
      item.q +
      "</p>" +
      '<div class="quiz-opts-grid heritage-quiz-opts" role="radiogroup" aria-label="选项"></div>' +
      '<p class="heritage-quiz-fb" id="heritage-quiz-fb" role="status"></p>' +
      '<div class="heritage-hint-slide" id="heritage-hint-slide" hidden>' +
      '<span class="quiz-hint-ico">📜</span> <span id="heritage-quiz-hint-inline"></span>' +
      "</div>" +
      "</div>" +
      '<div class="quiz-nav-row">' +
      '<button type="button" class="btn" id="heritage-quiz-prev" ' +
      (heritageQuizIndex === 0 ? "disabled" : "") +
      ">上一题</button>" +
      '<button type="button" class="btn btn-primary" id="heritage-quiz-next">' +
      (heritageQuizIndex >= total - 1 ? "完成" : "下一题") +
      "</button>" +
      "</div>";

    var grid = root.querySelector(".heritage-quiz-opts");
    item.opts.forEach(function (text, oi) {
      var lab = item.labels[oi];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt-btn heritage-quiz-opt";
      b.setAttribute("data-oi", String(oi));
      b.innerHTML = '<span class="quiz-opt-key">' + lab + "</span><span class=\"quiz-opt-txt\">" + text + "</span>";
      grid.appendChild(b);
    });

    var fb = root.querySelector("#heritage-quiz-fb");
    var hintSlide = root.querySelector("#heritage-hint-slide");
    var hintText = root.querySelector("#heritage-quiz-hint-inline");

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".quiz-opt-btn");
      if (!btn || locked) return;
      var oi = Number(btn.getAttribute("data-oi"));
      locked = true;
      var ok = oi === item.correct;
      root.querySelectorAll(".quiz-opt-btn").forEach(function (el, idx) {
        el.classList.remove("opt-correct", "opt-wrong");
        if (idx === item.correct) el.classList.add("opt-correct");
        if (!ok && idx === oi) el.classList.add("opt-wrong");
        el.disabled = true;
      });
      fb.textContent = ok ? "✔ 回答正确" : "✘ 再想一想";
      fb.className = "heritage-quiz-fb " + (ok ? "ok liquid-glass-reward" : "bad");
      if (!ok && item.hint) {
        hintText.textContent = item.hint;
        hintSlide.hidden = false;
        hintSlide.classList.add("is-visible");
      }
    });

    root.querySelector("#heritage-quiz-prev").addEventListener("click", function () {
      if (heritageQuizIndex > 0) {
        heritageQuizIndex--;
        renderHeritageQuiz();
      }
    });
    root.querySelector("#heritage-quiz-next").addEventListener("click", function () {
      if (heritageQuizIndex < total - 1) {
        heritageQuizIndex++;
        renderHeritageQuiz();
      } else {
        heritageQuizIndex = 0;
        document.querySelectorAll(".heritage-mode-tab[data-heritage-mode]").forEach(function (t) {
          var isLab = t.getAttribute("data-heritage-mode") === "lab";
          t.classList.toggle("active", isLab);
          t.setAttribute("aria-selected", isLab ? "true" : "false");
        });
        var labPanel = document.getElementById("heritage-lab-panel");
        var classicPanel = document.getElementById("heritage-classic-panel");
        if (labPanel && classicPanel) {
          labPanel.hidden = false;
          classicPanel.hidden = true;
        }
        if (heritageInstance && heritageInstance._resize) heritageInstance._resize();
        announce("已返回互动测绘");
      }
    });
  }

  /** 极限挑战 · 高阶探究题板（深色 UI + 答错震动） */
  function renderExtremeQuiz() {
    var root = document.getElementById("extreme-quiz-root");
    if (!root) return;
    var total = EXTREME_QUIZ.length;
    var item = EXTREME_QUIZ[extremeQuizIndex];
    var locked = false;

    root.innerHTML =
      '<p class="extreme-quiz-progress">高阶探究 · 第 ' +
      (extremeQuizIndex + 1) +
      " / " +
      total +
      " 题</p>" +
      '<div class="extreme-quiz-panel-inner">' +
      '<p class="extreme-quiz-q">' +
      item.q +
      "</p>" +
      '<div class="quiz-opts-grid extreme-quiz-opts" role="radiogroup" aria-label="选项"></div>' +
      '<p class="extreme-quiz-fb" id="extreme-quiz-fb" role="status"></p>' +
      '<div class="extreme-hint-slide" id="extreme-hint-slide" hidden>' +
      '<span class="quiz-hint-ico">⚡</span> <span id="extreme-hint-text"></span>' +
      "</div>" +
      "</div>" +
      '<div class="quiz-nav-row">' +
      '<button type="button" class="btn" id="extreme-quiz-prev" ' +
      (extremeQuizIndex === 0 ? "disabled" : "") +
      ">上一题</button>" +
      '<button type="button" class="btn btn-primary" id="extreme-quiz-next">' +
      (extremeQuizIndex >= total - 1 ? "进入风力模拟" : "下一题") +
      "</button>" +
      "</div>";

    var grid = root.querySelector(".extreme-quiz-opts");
    item.opts.forEach(function (text, oi) {
      var lab = item.labels[oi];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt-btn extreme-quiz-opt";
      b.setAttribute("data-oi", String(oi));
      b.innerHTML = '<span class="quiz-opt-key">' + lab + "</span><span class=\"quiz-opt-txt\">" + text + "</span>";
      grid.appendChild(b);
    });

    var fb = root.querySelector("#extreme-quiz-fb");
    var hintSlide = root.querySelector("#extreme-hint-slide");
    var hintText = root.querySelector("#extreme-hint-text");

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".quiz-opt-btn");
      if (!btn || locked) return;
      var oi = Number(btn.getAttribute("data-oi"));
      locked = true;
      var ok = oi === item.correct;
      root.querySelectorAll(".quiz-opt-btn").forEach(function (el, idx) {
        el.classList.remove("opt-correct", "opt-wrong");
        if (idx === item.correct) el.classList.add("opt-correct");
        if (!ok && idx === oi) el.classList.add("opt-wrong");
        el.disabled = true;
      });
      fb.textContent = ok ? "✔ 回答正确" : "✘ 再想一想";
      fb.className = "extreme-quiz-fb " + (ok ? "ok liquid-glass-reward" : "bad");
      if (!ok) {
        triggerExtremeQuizShake();
        if (item.hint) {
          hintText.textContent = item.hint;
          hintSlide.hidden = false;
          hintSlide.classList.add("is-visible");
        }
      }
    });

    root.querySelector("#extreme-quiz-prev").addEventListener("click", function () {
      if (extremeQuizIndex > 0) {
        extremeQuizIndex--;
        renderExtremeQuiz();
      }
    });
    root.querySelector("#extreme-quiz-next").addEventListener("click", function () {
      if (extremeQuizIndex < total - 1) {
        extremeQuizIndex++;
        renderExtremeQuiz();
      } else {
        document.querySelectorAll(".extreme-tab[data-extreme-panel]").forEach(function (t) {
          var isWind = t.getAttribute("data-extreme-panel") === "wind";
          t.classList.toggle("active", isWind);
          t.setAttribute("aria-selected", isWind ? "true" : "false");
        });
        var qEl = document.getElementById("extreme-panel-quiz");
        var wEl = document.getElementById("extreme-panel-wind");
        if (qEl && wEl) {
          qEl.hidden = true;
          wEl.hidden = false;
        }
        if (extremeLabInstance && extremeLabInstance._resize) extremeLabInstance._resize();
        announce("已切换到风力模拟");
      }
    });
  }

  var heritageModeBound = false;

  /** 互动测绘 / 算经闯关 分栏 */
  function setupHeritageModeTabs() {
    if (heritageModeBound) return;
    heritageModeBound = true;
    document.querySelectorAll(".heritage-mode-tab[data-heritage-mode]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var mode = tab.getAttribute("data-heritage-mode");
        document.querySelectorAll(".heritage-mode-tab[data-heritage-mode]").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        var labPanel = document.getElementById("heritage-lab-panel");
        var classicPanel = document.getElementById("heritage-classic-panel");
        if (!labPanel || !classicPanel) return;
        if (mode === "lab") {
          labPanel.hidden = false;
          classicPanel.hidden = true;
          if (heritageInstance && heritageInstance._resize) heritageInstance._resize();
        } else {
          labPanel.hidden = true;
          classicPanel.hidden = false;
          heritageQuizIndex = 0;
          renderHeritageQuiz();
        }
      });
    });
  }

  var extremeTabsBound = false;

  /** 极限挑战：高阶闯关 / 风力模拟 */
  function setupExtremeTabs() {
    if (extremeTabsBound) return;
    extremeTabsBound = true;
    document.querySelectorAll(".extreme-tab[data-extreme-panel]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var panel = tab.getAttribute("data-extreme-panel");
        document.querySelectorAll(".extreme-tab[data-extreme-panel]").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        var qEl = document.getElementById("extreme-panel-quiz");
        var wEl = document.getElementById("extreme-panel-wind");
        if (!qEl || !wEl) return;
        if (panel === "quiz") {
          qEl.hidden = false;
          wEl.hidden = true;
        } else {
          qEl.hidden = true;
          wEl.hidden = false;
          if (extremeLabInstance && extremeLabInstance._resize) extremeLabInstance._resize();
        }
      });
    });
  }

  function idxOfView(name) {
    return ORDER.indexOf(name);
  }

  function goNext() {
    if (currentView === "home") return;

    if (currentView === "challenge") {
      if (challengePhase === 0) {
        challengePhase = 1;
        syncChallengeModal();
        syncContext();
        updateNav();
        announce("任务卡已弹出");
        return;
      }
      showView("lab");
      challengePhase = 0;
      if (els.challengeModal) {
        els.challengeModal.classList.remove("is-open");
        els.challengeModal.hidden = true;
      }
      return;
    }

    var i = idxOfView(currentView);
    if (i >= 0 && i < ORDER.length - 1) {
      showView(ORDER[i + 1]);
    } else if (currentView === "extreme") {
      showView("home");
      announce("已返回主界面");
    }
  }

  function goPrev() {
    if (currentView === "home") return;

    if (currentView === "challenge") {
      if (challengePhase === 1) {
        challengePhase = 0;
        syncChallengeModal();
        syncContext();
        updateNav();
        announce("返回情境导入");
        return;
      }
      showView("home");
      return;
    }

    var i = idxOfView(currentView);
    if (i > 0) {
      var prevName = ORDER[i - 1];
      if (prevName === "challenge") {
        showView("challenge", { challengePhase: 1 });
      } else {
        showView(prevName);
      }
    }
  }

  function updateNav() {
    var prev = els.btnPrev;
    var next = els.btnNext;
    if (!prev || !next) return;
    prev.disabled = false;
    next.disabled = false;
    next.classList.remove("btn-pulse");

    if (currentView === "home") {
      prev.disabled = true;
      next.disabled = true;
      next.textContent = "下一步";
      return;
    }

    if (currentView === "challenge") {
      if (challengePhase === 0) {
        prev.disabled = true;
        next.textContent = "下一步";
        next.classList.add("btn-pulse");
      } else {
        prev.disabled = false;
        next.textContent = "接受挑战（测绘局）";
      }
      return;
    }

    if (currentView === "quiz") {
      next.textContent = "下一步";
    } else if (currentView === "extreme") {
      next.textContent = "返回主界面";
    } else {
      next.textContent = "下一步";
    }
  }

  /**
   * 主导航：直接进入模块。
   * 旧版曾用 .scroll-paper.is-closing 将卷轴 scaleX(0.04) 再切换，会造成整屏只剩窄条、观感像「坏掉」；
   * 现由 .view / .view-active 的 opacity 过渡承担切换感，避免中间态。
   */
  function closeScrollThenNavigate(target) {
    window.requestAnimationFrame(function () {
      showView(target);
    });
  }

  document.querySelectorAll(".nav-slip[data-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeScrollThenNavigate(btn.getAttribute("data-target"));
    });
  });

  if (els.btnHome) {
    els.btnHome.addEventListener("click", function () {
      showView("home");
    });
  }

  if (els.btnNext) {
    els.btnNext.addEventListener("click", function () {
      goNext();
    });
  }

  if (els.btnPrev) {
    els.btnPrev.addEventListener("click", function () {
      goPrev();
    });
  }

  var musicOn = false;
  if (els.btnMusic) {
    els.btnMusic.addEventListener("click", function () {
      musicOn = !musicOn;
      els.btnMusic.setAttribute("aria-pressed", musicOn ? "true" : "false");
      els.btnMusic.textContent = musicOn ? "音乐：开" : "音乐：关";
      if (els.bgm && els.bgm.src) {
        if (musicOn) els.bgm.play().catch(function () {});
        else els.bgm.pause();
      }
    });
  }

  showView("home");
  syncContext();
  updateNav();

  window.heightCourseApp = { showView: showView };
})();
