"use strict";
(() => {
  // src/save.ts
  var SAVE_KEY = "linebound_save";
  var SAVE_VERSION = 1;
  function createDefaultSave() {
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      playerName: "Player"
    };
  }
  function loadSave() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.version !== "number") return null;
      return parsed;
    } catch {
      console.warn("[save] Failed to parse saved data; starting fresh.");
      return null;
    }
  }
  function persistSave(data) {
    const toWrite = { ...data, timestamp: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toWrite));
  }
  function exportSave() {
    const data = loadSave() ?? createDefaultSave();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `linebound_save_${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function importSave(onSuccess, onError) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = e.target?.result;
          if (typeof raw !== "string") throw new Error("Unexpected file content type");
          const parsed = JSON.parse(raw);
          if (typeof parsed.version !== "number") {
            throw new Error("Invalid save file: missing version field");
          }
          persistSave(parsed);
          onSuccess(parsed);
        } catch (err) {
          onError(err instanceof Error ? err.message : "Unknown error reading save file");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // src/menu.ts
  var MENU_SCENE_ID = "scene-menu";
  function initMenu(callbacks) {
    const scene = document.getElementById(MENU_SCENE_ID);
    if (!scene) {
      console.error("[menu] Scene element not found:", MENU_SCENE_ID);
      return;
    }
    scene.classList.remove("hidden");
    wireButtons(callbacks);
  }
  function hideMenu() {
    const scene = document.getElementById(MENU_SCENE_ID);
    scene?.classList.add("hidden");
  }
  function wireButtons(callbacks) {
    bindButton("btn-start-game", () => {
      hideMenu();
      callbacks.onStartGame();
    });
    bindButton("btn-settings", () => {
      callbacks.onSettings();
    });
    bindButton("btn-export-save", () => {
      exportSave();
      flashStatus("Save exported!");
    });
    bindButton("btn-import-save", () => {
      importSave(
        (data) => {
          flashStatus(`Save imported (v${data.version})`);
        },
        (msg) => {
          flashStatus(`Import failed: ${msg}`, true);
        }
      );
    });
  }
  function bindButton(id, handler) {
    const btn = document.getElementById(id);
    if (!btn) {
      console.warn("[menu] Button not found:", id);
      return;
    }
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener("click", handler);
  }
  function flashStatus(message, isError = false) {
    const statusEl = document.getElementById("menu-status");
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = isError ? "menu-status error" : "menu-status success";
    statusEl.classList.remove("hidden");
    const existingTimer = statusEl._flashTimer;
    if (existingTimer !== void 0) clearTimeout(existingTimer);
    statusEl._flashTimer = window.setTimeout(() => {
      statusEl.classList.add("hidden");
    }, 3e3);
  }

  // src/game.ts
  var GAME_SCENE_ID = "scene-game";
  var canvas = null;
  var ctx = null;
  var rafId = null;
  function initGame(onBack) {
    const scene = document.getElementById(GAME_SCENE_ID);
    if (!scene) {
      console.error("[game] Scene element not found:", GAME_SCENE_ID);
      return;
    }
    scene.classList.remove("hidden");
    canvas = document.getElementById("game-canvas");
    if (!canvas) {
      console.error("[game] Canvas element not found: #game-canvas");
      return;
    }
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    const backBtn = document.getElementById("btn-back-to-menu");
    backBtn?.addEventListener("click", () => {
      stopGame();
      onBack();
    });
    startRenderLoop();
  }
  function stopGame() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("resize", resizeCanvas);
    const scene = document.getElementById(GAME_SCENE_ID);
    scene?.classList.add("hidden");
  }
  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function startRenderLoop() {
    let lastTime = performance.now();
    function loop(now) {
      const dt = (now - lastTime) / 1e3;
      lastTime = now;
      drawFrame(dt);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }
  function drawFrame(_dt) {
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Game coming soon\u2026", canvas.width / 2, canvas.height / 2);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText('(Use "Back to Menu" to return)', canvas.width / 2, canvas.height / 2 + 44);
  }

  // src/main.ts
  var currentState = "menu";
  document.addEventListener("DOMContentLoaded", () => {
    ensureSaveExists();
    transitionTo("menu");
  });
  function transitionTo(next) {
    switch (currentState) {
      case "menu":
        break;
      case "game":
        stopGame();
        break;
      case "settings":
        break;
    }
    currentState = next;
    switch (next) {
      case "menu":
        initMenu({
          onStartGame: () => transitionTo("game"),
          onSettings: () => openSettingsStub()
        });
        break;
      case "game":
        initGame(() => transitionTo("menu"));
        break;
      case "settings":
        break;
    }
  }
  function ensureSaveExists() {
    const existing = loadSave();
    if (!existing) {
      persistSave(createDefaultSave());
    }
  }
  function openSettingsStub() {
    alert("Settings coming soon!");
  }
})();
//# sourceMappingURL=bundle.js.map
