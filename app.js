"use strict";

const MAX_HISTORY = 20;
const BUBBLE_DELAY_MS = 1100;
const STORAGE_KEY = "mark-six-high-fantasy-history-v4";
const redNumbers = new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46]);
const blueNumbers = new Set([3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48]);

const issueInput = document.querySelector("#issue");
const jackpotInput = document.querySelector("#jackpot");
const numberCountInput = document.querySelector("#number-count");
const repeatCountInput = document.querySelector("#repeat-count");
const ritualStage = document.querySelector("#ritual-stage");
const bubbleStack = document.querySelector("#bubble-stack");
const emptyResult = document.querySelector("#empty-result");
const dialogue = document.querySelector("#oracle-dialogue");
const prizeList = document.querySelector("#prize-list");
const drawButton = document.querySelector("#draw-button");
const copyButton = document.querySelector("#copy-button");
const clearButton = document.querySelector("#clear-button");
const historyList = document.querySelector("#history-list");
const emptyHistory = document.querySelector("#empty-history");
const controls = [issueInput, jackpotInput, numberCountInput, repeatCountInput];

let history = [];
let lastNumbers = [];
let isDrawing = false;

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const parseMoney = (value) => Number(String(value).replace(/[^0-9]/g, "")) || 0;
const formatMoney = (value) => Math.round(value).toLocaleString("en-US");
const padNumber = (value) => String(value).padStart(2, "0");

function numberColour(number) {
  if (redNumbers.has(number)) return "red";
  if (blueNumbers.has(number)) return "blue";
  return "green";
}

function secureRandom(max) {
  const range = 0x100000000;
  const limit = range - (range % max);
  const buffer = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
}

function drawNumbers(count) {
  const pool = Array.from({ length: 49 }, (_, index) => index + 1);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandom(index + 1);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

function setStatus(text) {
  dialogue.textContent = text;
}

function setDrawingState(active) {
  isDrawing = active;
  controls.forEach((control) => { control.disabled = active; });
  drawButton.disabled = active;
  copyButton.disabled = active || !lastNumbers.length;
  clearButton.disabled = active || !history.length;
}

function updatePrizes() {
  const jackpotValue = parseMoney(jackpotInput.value);
  const prizes = [
    ["頭獎", jackpotValue], ["二獎", jackpotValue * 0.25], ["三獎", jackpotValue * 0.075],
    ["四獎", 9600], ["五獎", 640], ["六獎", 320], ["七獎", 40],
  ];
  prizeList.replaceChildren(...prizes.map(([name, value]) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const amount = document.createElement("strong");
    label.textContent = name;
    amount.textContent = `HK$ ${formatMoney(value)}`;
    row.append(label, amount);
    return row;
  }));
}

function createDistribution(numbers) {
  const selected = new Set(numbers);
  const section = document.createElement("section");
  section.className = "distribution";
  section.setAttribute("aria-label", `已抽出號碼：${numbers.join("、")}`);

  const heading = document.createElement("div");
  heading.className = "distribution-heading";
  heading.innerHTML = "<span>號碼分佈</span><span class=\"gold-key\">金環代表已抽出</span>";

  const grid = document.createElement("div");
  grid.className = "number-grid";
  for (let number = 1; number <= 49; number += 1) {
    const item = document.createElement("span");
    const isSelected = selected.has(number);
    item.className = `map-number ${numberColour(number)}${isSelected ? " selected" : ""}`;
    item.textContent = number;
    item.setAttribute("aria-label", `${number}${isSelected ? "，已抽出" : "，未抽出"}`);
    grid.append(item);
  }
  section.append(heading, grid);
  return section;
}

function renderHistory() {
  historyList.replaceChildren();
  const hasHistory = history.length > 0;
  historyList.hidden = !hasHistory;
  emptyHistory.hidden = hasHistory;

  history.forEach((record, index) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const summary = document.createElement("div");
    summary.className = "record-summary";
    const recordIndex = document.createElement("p");
    recordIndex.className = "record-index";
    recordIndex.textContent = `第 ${history.length - index} 筆`;
    const issue = document.createElement("h3");
    issue.textContent = record.issue;
    const createdAt = document.createElement("p");
    createdAt.textContent = record.createdAt;
    const balls = document.createElement("div");
    balls.className = "mini-balls";
    record.numbers.forEach((number) => {
      const ball = document.createElement("span");
      ball.className = numberColour(number);
      ball.textContent = padNumber(number);
      balls.append(ball);
    });
    summary.append(recordIndex, issue, createdAt, balls);
    card.append(summary, createDistribution(record.numbers));
    historyList.append(card);
  });
  clearButton.disabled = isDrawing || !history.length;
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function addHistoryRecord(record) {
  history = [record, ...history].slice(0, MAX_HISTORY);
  saveHistory();
  renderHistory();
}

function createBubbleLayer(record, isNewest) {
  bubbleStack.querySelectorAll(".bubble-layer.newest").forEach((layer) => layer.classList.remove("newest"));
  const layer = document.createElement("div");
  layer.className = `bubble-layer${isNewest ? " newest" : ""}`;
  layer.dataset.recordId = record.id;
  const orbs = document.createElement("div");
  orbs.className = "layer-orbs";
  layer.append(orbs);
  bubbleStack.append(layer);
  return layer;
}

function appendBubble(layer, number) {
  const fall = document.createElement("span");
  fall.className = "bubble-fall";
  fall.innerHTML = `<span class="magic-bubble ${numberColour(number)}"><span class="living-core" aria-hidden="true"></span><i></i><b>${padNumber(number)}</b></span>`;
  layer.querySelector(".layer-orbs").append(fall);
}

function completeLayer(layer, numbers) {
  const result = document.createElement("p");
  result.className = "layer-result-text";
  result.textContent = numbers.map(padNumber).join("　");
  layer.append(result);
}

async function beginDraw() {
  if (isDrawing) return;
  const numberCount = clamp(Number(numberCountInput.value) || 1, 1, 49);
  const repeatCount = clamp(Number(repeatCountInput.value) || 1, 1, 20);
  numberCountInput.value = numberCount;
  repeatCountInput.value = repeatCount;
  lastNumbers = [];
  bubbleStack.replaceChildren();
  bubbleStack.hidden = false;
  emptyResult.hidden = true;
  setDrawingState(true);

  try {
    const multipleDraws = repeatCount > 1;
    const phases = multipleDraws ? [
      { text: `星盤展開：正在校準四十九道符文，準備連續抽出 ${repeatCount} 次……`, duration: 1100 },
      { text: `月鏡啟示：正在為 ${repeatCount} 次抽取擾動命數之池……`, duration: 900 },
      { text: `天啟完成：即將連續抽出 ${repeatCount} 次，每次凝成 ${numberCount} 個魔法泡泡……`, duration: 1200 },
    ] : [
      { text: "星盤展開：正在校準四十九道符文……", duration: 1100 },
      { text: "月鏡啟示：正在擾動命數之池……", duration: 900 },
      { text: `天啟完成：即將抽出 1 次命數，凝成 ${numberCount} 個魔法泡泡……`, duration: 1200 },
    ];

    ritualStage.classList.add("active");
    ritualStage.setAttribute("aria-hidden", "false");
    for (const phase of phases) {
      setStatus(phase.text);
      await delay(phase.duration);
    }
    ritualStage.classList.remove("active");
    ritualStage.setAttribute("aria-hidden", "true");
    setStatus(multipleDraws
      ? `天啟完成，將連續抽出 ${repeatCount} 次；每次凝成 ${numberCount} 個魔法泡泡……`
      : `天啟完成，正在凝成 ${numberCount} 個魔法泡泡……`);

    for (let drawIndex = 0; drawIndex < repeatCount; drawIndex += 1) {
      const numbers = drawNumbers(numberCount);
      const record = {
        id: `${Date.now()}-${drawIndex}-${numbers.join("-")}`,
        issue: issueInput.value.trim() || "未填期數",
        numbers,
        createdAt: new Date().toLocaleString("zh-HK", { hour12: false }),
        complete: true,
      };
      const layer = createBubbleLayer(record, true);
      for (const number of numbers) {
        appendBubble(layer, number);
        await delay(BUBBLE_DELAY_MS);
      }
      completeLayer(layer, numbers);
      lastNumbers = numbers;
      addHistoryRecord(record);
      copyButton.disabled = true;
      if (drawIndex < repeatCount - 1) await delay(700);
    }

    setStatus(multipleDraws
      ? `連續 ${repeatCount} 次抽取已完成；每次均從 49 個號碼中抽出 ${numberCount} 個不重複號碼。`
      : `已從 49 個號碼中抽出 ${numberCount} 個不重複號碼。`);
  } catch (error) {
    console.error(error);
    setStatus("天啟過程遇到異常，請重新嘗試。");
  } finally {
    ritualStage.classList.remove("active");
    ritualStage.setAttribute("aria-hidden", "true");
    setDrawingState(false);
  }
}

async function copyCurrent() {
  if (!lastNumbers.length) return;
  const text = lastNumbers.map(padNumber).join(", ");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  setStatus("本次號碼已複製");
}

function clearHistory() {
  history = [];
  lastNumbers = [];
  bubbleStack.replaceChildren();
  bubbleStack.hidden = true;
  emptyResult.hidden = false;
  localStorage.removeItem(STORAGE_KEY);
  setStatus("紀錄已清除");
  renderHistory();
  copyButton.disabled = true;
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    history = Array.isArray(saved) ? saved.slice(0, MAX_HISTORY) : [];
  } catch {
    history = [];
    localStorage.removeItem(STORAGE_KEY);
  }
  renderHistory();
}

jackpotInput.addEventListener("focus", () => {
  jackpotInput.value = String(parseMoney(jackpotInput.value) || "");
});
jackpotInput.addEventListener("input", () => {
  jackpotInput.value = jackpotInput.value.replace(/[^0-9,]/g, "");
  updatePrizes();
});
jackpotInput.addEventListener("blur", () => {
  jackpotInput.value = formatMoney(parseMoney(jackpotInput.value));
  updatePrizes();
});
numberCountInput.addEventListener("change", () => {
  numberCountInput.value = clamp(Number(numberCountInput.value) || 1, 1, 49);
});
repeatCountInput.addEventListener("change", () => {
  repeatCountInput.value = clamp(Number(repeatCountInput.value) || 1, 1, 20);
});
drawButton.addEventListener("click", beginDraw);
copyButton.addEventListener("click", copyCurrent);
clearButton.addEventListener("click", clearHistory);

updatePrizes();
loadHistory();
setDrawingState(false);
