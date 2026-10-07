const app = document.querySelector("#app");
const exitButton = document.querySelector("#exitQuizButton");

const state = {
  data: null,
  settings: {
    setIds: [],
    difficulties: ["Dễ", "Trung bình", "Khó"],
    count: 20,
    order: "random",
  },
  session: [],
  currentIndex: 0,
  answered: false,
  selectedAnswer: null,
  correctCount: 0,
  streak: 0,
  bestStreak: 0,
  results: [],
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const shuffle = (items) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const getFilteredQuestions = () => state.data.questions.filter((question) =>
  state.settings.setIds.includes(question.setId)
  && state.settings.difficulties.includes(question.difficulty)
);

const getSet = (setId) => state.data.sets.find((set) => set.id === setId);

function persistSettings() {
  localStorage.setItem("phenikaa-quiz-settings", JSON.stringify(state.settings));
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("phenikaa-quiz-settings"));
    if (!saved) return;
    const validSetIds = state.data.sets.map((set) => set.id);
    const savedSetIds = Array.isArray(saved.setIds) ? saved.setIds.filter((id) => validSetIds.includes(id)) : [];
    const validDifficulties = ["Dễ", "Trung bình", "Khó"];
    const savedDifficulties = Array.isArray(saved.difficulties)
      ? saved.difficulties.filter((level) => validDifficulties.includes(level))
      : [];
    state.settings = {
      setIds: savedSetIds.length ? savedSetIds : validSetIds,
      difficulties: savedDifficulties.length ? savedDifficulties : validDifficulties,
      count: [10, 20, 50, "all"].includes(saved.count) ? saved.count : 20,
      order: saved.order === "original" ? "original" : "random",
    };
  } catch {
    localStorage.removeItem("phenikaa-quiz-settings");
  }
}

function renderSetup() {
  exitButton.classList.add("is-hidden");
  const checkedSets = new Set(state.settings.setIds);
  const checkedDifficulties = new Set(state.settings.difficulties);
  app.innerHTML = `
    <section class="setup-layout">
      <div class="setup-intro">
        <p class="eyebrow">Luyện tập kiến thức nội bộ</p>
        <h1 class="hero-title">Hiểu sâu hơn.<br><em>Nhớ lâu hơn.</em></h1>
        <p class="hero-copy">Chọn chủ đề và độ khó phù hợp, trả lời từng câu hỏi rồi xem giải thích ngay. Mỗi lượt luyện là một bước tiến nhỏ nhưng chắc chắn.</p>
        <div class="stat-row">
          <span class="stat-pill"><span class="stat-dot"></span><strong>${state.data.totalQuestions}</strong> câu hỏi</span>
          <span class="stat-pill"><span class="stat-dot"></span><strong>${state.data.sets.length}</strong> bộ kiến thức</span>
          <span class="stat-pill"><span class="stat-dot"></span><strong>3</strong> mức độ</span>
        </div>
      </div>

      <form class="setup-card" id="setupForm">
        <h2>Thiết lập lượt luyện</h2>
        <p>Tùy chỉnh nội dung để bắt đầu phiên học của bạn.</p>

        <div class="field-group">
          <div class="field-label"><span>Bộ câu hỏi</span><small id="setSelectionLabel"></small></div>
          <div class="set-list">
            ${state.data.sets.map((set) => `
              <label class="set-option">
                <input type="checkbox" name="set" value="${set.id}" ${checkedSets.has(set.id) ? "checked" : ""} />
                <span class="custom-check" aria-hidden="true"></span>
                <span class="set-name">${escapeHtml(set.title)}</span>
                <span class="set-count">${set.questionCount} câu</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div class="field-group">
          <div class="field-label"><span>Độ khó</span><small>Chọn một hoặc nhiều</small></div>
          <div class="chip-row">
            ${["Dễ", "Trung bình", "Khó"].map((level) => `
              <label class="filter-chip">
                <input type="checkbox" name="difficulty" value="${level}" ${checkedDifficulties.has(level) ? "checked" : ""} />
                <span>${level}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div class="field-group select-row">
          <div class="select-wrap">
            <label for="questionCount">Số câu mỗi lượt</label>
            <select id="questionCount" name="count">
              ${[[10, "10 câu"], [20, "20 câu"], [50, "50 câu"], ["all", "Tất cả câu phù hợp"]]
                .map(([value, label]) => `<option value="${value}" ${String(state.settings.count) === String(value) ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
          <div class="select-wrap">
            <label for="questionOrder">Thứ tự câu hỏi</label>
            <select id="questionOrder" name="order">
              <option value="random" ${state.settings.order === "random" ? "selected" : ""}>Ngẫu nhiên</option>
              <option value="original" ${state.settings.order === "original" ? "selected" : ""}>Theo dữ liệu gốc</option>
            </select>
          </div>
        </div>

        <button class="primary-button" id="startButton" type="submit">
          Bắt đầu luyện tập <span class="button-arrow" aria-hidden="true">→</span>
        </button>
        <p class="available-count" id="availableCount"></p>
      </form>
    </section>
  `;

  const form = document.querySelector("#setupForm");
  const syncFormState = () => {
    state.settings.setIds = [...form.querySelectorAll('input[name="set"]:checked')].map((input) => input.value);
    state.settings.difficulties = [...form.querySelectorAll('input[name="difficulty"]:checked')].map((input) => input.value);
    state.settings.count = form.elements.count.value === "all" ? "all" : Number(form.elements.count.value);
    state.settings.order = form.elements.order.value;

    const available = getFilteredQuestions().length;
    const startButton = document.querySelector("#startButton");
    startButton.disabled = available === 0;
    document.querySelector("#availableCount").textContent = available
      ? `${available} câu phù hợp với lựa chọn hiện tại`
      : "Hãy chọn ít nhất một bộ câu hỏi và một mức độ";
    document.querySelector("#setSelectionLabel").textContent = `${state.settings.setIds.length}/${state.data.sets.length} bộ đã chọn`;
    persistSettings();
  };

  form.addEventListener("change", syncFormState);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncFormState();
    startQuiz();
  });
  syncFormState();
}

function startQuiz(questions = null) {
  let available = questions ? [...questions] : getFilteredQuestions();
  if (!available.length) return;
  if (!questions && state.settings.order === "random") available = shuffle(available);
  const requested = state.settings.count === "all" ? available.length : state.settings.count;
  state.session = available.slice(0, Math.min(requested, available.length));
  state.currentIndex = 0;
  state.answered = false;
  state.selectedAnswer = null;
  state.correctCount = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.results = [];
  exitButton.classList.remove("is-hidden");
  renderQuestion();
}

function renderQuestion() {
  const question = state.session[state.currentIndex];
  const set = getSet(question.setId);
  const progress = ((state.currentIndex + (state.answered ? 1 : 0)) / state.session.length) * 100;
  const selected = state.selectedAnswer;

  app.innerHTML = `
    <section class="quiz-layout">
      <div class="quiz-topbar">
        <div>
          <div class="progress-copy">
            <span>Câu <strong>${state.currentIndex + 1}</strong> / ${state.session.length}</span>
            <span>${Math.round(progress)}% hoàn thành</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
        </div>
        <div class="score-strip">
          <div class="score-item"><span>Đúng</span><strong>${state.correctCount}</strong></div>
          <div class="score-item"><span>Chuỗi</span><strong>${state.streak}</strong></div>
        </div>
      </div>

      <article class="quiz-card">
        <div class="question-area ${question.image ? "has-image" : ""}">
          <div class="question-copy">
            <div class="question-meta">
              <span class="meta-tag">${escapeHtml(set.shortTitle)}</span>
              <span class="meta-tag difficulty">${escapeHtml(question.difficulty)}</span>
              <span class="meta-tag">${escapeHtml(question.category)}</span>
            </div>
            <h1 class="question-text">${escapeHtml(question.question)}</h1>
            <div class="answer-list" role="group" aria-label="Các đáp án">
              ${question.options.map((option, index) => {
                const isCorrect = index === question.answer;
                const isSelected = index === selected;
                let classes = "";
                let status = "";
                if (state.answered) {
                  if (isCorrect) { classes = "correct"; status = "✓"; }
                  else if (isSelected) { classes = "wrong"; status = "×"; }
                  else { classes = "dimmed"; }
                }
                return `
                  <button class="answer-button ${classes}" type="button" data-answer="${index}" ${state.answered ? "disabled" : ""}>
                    <span class="answer-letter">${"ABCD"[index]}</span>
                    <span class="answer-text">${escapeHtml(option)}</span>
                    <span class="answer-status" aria-hidden="true">${status}</span>
                  </button>`;
              }).join("")}
            </div>
          </div>
          ${question.image ? `
            <div class="question-image-wrap">
              <img class="question-image" src="${question.image}" alt="${escapeHtml(question.imageAlt || "Ảnh minh họa câu hỏi")}" />
            </div>` : ""}
        </div>

        ${state.answered ? `
          <div class="feedback-panel">
            <div>
              <h2 class="feedback-heading ${selected === question.answer ? "correct" : "wrong"}">
                <span aria-hidden="true">${selected === question.answer ? "✓" : "×"}</span>
                ${selected === question.answer ? "Chính xác!" : `Chưa đúng — đáp án là ${"ABCD"[question.answer]}`}
              </h2>
              <p class="feedback-copy">${escapeHtml(question.explanation)}</p>
            </div>
            <button class="primary-button next-button" id="nextButton" type="button">
              ${state.currentIndex === state.session.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} <span aria-hidden="true">→</span>
            </button>
          </div>` : ""}
      </article>
    </section>
  `;

  if (!state.answered) {
    document.querySelectorAll(".answer-button").forEach((button) => {
      button.addEventListener("click", () => answerQuestion(Number(button.dataset.answer)));
    });
  } else {
    document.querySelector("#nextButton").addEventListener("click", nextQuestion);
    document.querySelector("#nextButton").focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function answerQuestion(answerIndex) {
  if (state.answered) return;
  const question = state.session[state.currentIndex];
  const correct = answerIndex === question.answer;
  state.answered = true;
  state.selectedAnswer = answerIndex;
  state.results.push({ question, selectedAnswer: answerIndex, correct });
  if (correct) {
    state.correctCount += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  } else {
    state.streak = 0;
  }
  renderQuestion();
}

function nextQuestion() {
  if (state.currentIndex >= state.session.length - 1) {
    renderResults();
    return;
  }
  state.currentIndex += 1;
  state.answered = false;
  state.selectedAnswer = null;
  renderQuestion();
}

function renderResults() {
  exitButton.classList.add("is-hidden");
  const total = state.session.length;
  const percent = Math.round((state.correctCount / total) * 100);
  const incorrect = total - state.correctCount;
  const message = percent >= 90
    ? "Xuất sắc! Bạn đã nắm rất chắc nội dung của lượt luyện này."
    : percent >= 70
      ? "Kết quả rất tốt. Ôn lại vài câu sai sẽ giúp kiến thức chắc hơn."
      : percent >= 50
        ? "Bạn đang đi đúng hướng. Hãy thử lại các câu chưa đúng nhé."
        : "Mỗi lần luyện là một lần tiến bộ. Hãy xem lại giải thích và thử lại.";

  app.innerHTML = `
    <section class="result-layout">
      <div class="result-card">
        <div class="result-icon" aria-hidden="true">${percent >= 70 ? "★" : "↗"}</div>
        <p class="eyebrow">Hoàn thành lượt luyện</p>
        <h1>${percent >= 90 ? "Thật ấn tượng!" : percent >= 70 ? "Làm tốt lắm!" : "Tiếp tục cố gắng!"}</h1>
        <p>${message}</p>
        <div class="result-score"><strong>${percent}</strong><span>%</span></div>
        <div class="result-stats">
          <div class="result-stat"><strong>${state.correctCount}</strong><span>Câu đúng</span></div>
          <div class="result-stat"><strong>${incorrect}</strong><span>Câu cần ôn</span></div>
          <div class="result-stat"><strong>${state.bestStreak}</strong><span>Chuỗi tốt nhất</span></div>
        </div>
        <div class="result-actions">
          <button class="secondary-button" id="backToSetup" type="button">Chọn lượt luyện mới</button>
          <button class="primary-button" id="retryButton" type="button">
            ${incorrect ? "Luyện lại câu sai" : "Luyện lại lượt này"} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  `;
  document.querySelector("#backToSetup").addEventListener("click", renderSetup);
  document.querySelector("#retryButton").addEventListener("click", () => {
    const retryQuestions = incorrect
      ? state.results.filter((result) => !result.correct).map((result) => result.question)
      : shuffle(state.session);
    startQuiz(retryQuestions);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleKeyboard(event) {
  if (!state.session.length) return;
  if (!state.answered && ["1", "2", "3", "4"].includes(event.key)) {
    answerQuestion(Number(event.key) - 1);
  } else if (state.answered && event.key === "Enter") {
    nextQuestion();
  }
}

function exitQuiz() {
  if (!state.session.length || window.confirm("Bạn muốn thoát lượt luyện hiện tại? Kết quả lượt này sẽ không được lưu.")) {
    state.session = [];
    renderSetup();
  }
}

async function initialize() {
  try {
    const response = await fetch("/data/questions.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    if (!Array.isArray(state.data.questions) || !state.data.questions.length) throw new Error("Dữ liệu trống");
    state.settings.setIds = state.data.sets.map((set) => set.id);
    restoreSettings();
    renderSetup();
  } catch (error) {
    console.error(error);
    app.innerHTML = `
      <section class="error-state">
        <h1>Chưa tải được dữ liệu</h1>
        <p>Hãy chắc chắn bạn đang mở website qua máy chủ web, không mở trực tiếp file HTML. Sau đó tải lại trang.</p>
        <button class="primary-button" type="button" onclick="location.reload()">Tải lại</button>
      </section>`;
  }
}

exitButton.addEventListener("click", exitQuiz);
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  exitQuiz();
});
document.addEventListener("keydown", handleKeyboard);

initialize();
