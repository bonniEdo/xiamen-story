const days = [
  { n: 1, title: '🛬 Day 1 · 抵廈+市區漫遊' },
  { n: 2, title: '🚇 Day 2 · 老院子景區+閩南傳奇秀' },
  { n: 3, title: '🏯 Day 3 · 雲水謠+田螺坑' },
  { n: 4, title: '🌊 Day 4 · 鼓浪嶼+嶼見閩南' },
  { n: 5, title: '✈️ Day 5 · 植物園＋南普陀寺 > 返台' },
];

const nav = document.getElementById('dayNav');
const mainContent = document.getElementById('mainContent');
const activeDayStorageKey = `xiamen-story-active-day:${window.location.pathname}`;
const availableDays = days.filter((d) => document.getElementById(`day-${d.n}`));

function setActiveDay(dayNumber, { scroll = true } = {}) {
  const targetDay = document.getElementById(`day-${dayNumber}`);
  if (!targetDay) return false;

  document.querySelectorAll('.day-content').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.day-btn').forEach((btn) => btn.classList.remove('active'));

  targetDay.classList.add('active');
  nav?.querySelector(`[data-day="${dayNumber}"]`)?.classList.add('active');

  try {
    window.localStorage.setItem(activeDayStorageKey, String(dayNumber));
  } catch (error) {
    console.warn('Unable to persist active day.', error);
  }

  if (scroll) mainContent?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

availableDays.forEach(d => {
  const btn = document.createElement('button');
  btn.className = 'day-btn';
  btn.textContent = d.title;
  btn.dataset.day = String(d.n);
  btn.onclick = () => setActiveDay(d.n);
  nav.appendChild(btn);
});

let savedDay = null;
try {
  savedDay = Number.parseInt(window.localStorage.getItem(activeDayStorageKey) || '', 10);
} catch (error) {
  console.warn('Unable to read persisted active day.', error);
}

const initialDay = availableDays.some((d) => d.n === savedDay)
  ? savedDay
  : availableDays[0]?.n ?? 1;

setActiveDay(initialDay, { scroll: false });

function initSpotCarousels() {
  const carousels = Array.from(document.querySelectorAll('[data-carousel]'));
  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.spot-carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.spot-img'));
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');
    if (!track || slides.length <= 1) return;

    let currentIndex = 0;
    const render = () => {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      slides.forEach((slide, index) => slide.classList.toggle('is-active', index === currentIndex));
      dots.forEach((dot, index) => dot.classList.toggle('is-active', index === currentIndex));
    };

    prevBtn?.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      render();
    });

    nextBtn?.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % slides.length;
      render();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentIndex = index;
        render();
      });
    });

    render();
  });
}

initSpotCarousels();

function calcBudget() {
  const inputs = Array.from(document.querySelectorAll('.budget-grid input[type="number"]'));
  const total = inputs.reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  const totalDisplay = document.getElementById('totalDisplay');
  if (totalDisplay) totalDisplay.textContent = `NT$ ${total.toLocaleString()}`;
}

calcBudget();

// === AUDIO STORY ===
let currentUtterance = null;
let currentAudio = null;
let currentBtn = null;

const AUDIO_LABELS = {
  idle: '聽故事',
  playing: '暫停',
  paused: '繼續',
  loading: '準備中...',
};

function buildLocalStory(spotName, spotHint) {
  const endings = [
    '走完這段路，你會發現廈門最迷人的不是景，而是那種剛剛好的生活節奏。',
    '等你回頭看照片時，最先想起的，通常就是這裡的風和聲音。',
    '如果旅行有背景音，這一站應該就是最耐聽的副歌。',
  ];
  const ending = endings[Math.floor(Math.random() * endings.length)];
  return `${spotName}的故事，常常從一個不經意的轉角開始。${spotHint}。你可以慢慢走、慢慢看，留意街邊的小店、空氣裡的味道，還有人們說話的節奏；這些細節拼起來，就是這座城市最真實的表情。${ending}`;
}

function setButtonIdle(btn) {
  if (!btn) return;
  btn.textContent = AUDIO_LABELS.idle;
  btn.dataset.state = 'idle';
  btn.disabled = false;
}

function enhanceAudioButtonLayout() {
  document.querySelectorAll('.spot-info').forEach((spotInfo) => {
    const title = spotInfo.querySelector('.spot-name');
    const button = spotInfo.querySelector('.btn-audio');
    if (!title || !button) return;

    let titleRow = spotInfo.querySelector('.spot-title-row');
    if (!titleRow) {
      titleRow = document.createElement('div');
      titleRow.className = 'spot-title-row';
      title.parentNode.insertBefore(titleRow, title);
      titleRow.appendChild(title);
    }

    titleRow.appendChild(button);
    button.dataset.icon = '🎙️';
    button.classList.add('btn-audio--title');

    if (!button.dataset.state || button.dataset.state === 'idle') {
      setButtonIdle(button);
    }
  });
}

function stopCurrent() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  if (currentUtterance) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  if (currentBtn) {
    setButtonIdle(currentBtn);
    currentBtn = null;
  }
}

function speakStory(btn, spotName, spotHint) {
  if (!window.speechSynthesis) {
    setButtonIdle(btn);
    return;
  }

  const story = buildLocalStory(spotName, spotHint);
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(story);
  utter.lang = 'zh-TW';
  utter.rate = 0.9;
  utter.pitch = 1.03;

  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find((voice) => voice.lang === 'zh-TW') || voices.find((voice) => voice.lang.startsWith('zh'));
  if (zhVoice) utter.voice = zhVoice;

  utter.onstart = () => {
    btn.textContent = AUDIO_LABELS.playing;
    btn.dataset.state = 'playing';
    btn.disabled = false;
  };

  utter.onend = utter.onerror = () => {
    currentUtterance = null;
    currentBtn = null;
    setButtonIdle(btn);
  };

  currentUtterance = utter;
  currentBtn = btn;
  window.speechSynthesis.speak(utter);
}

async function playSpotStory(btn, spotName, spotHint, audioSrc = null) {
  if (currentBtn && currentBtn !== btn) stopCurrent();

  if (audioSrc && btn.dataset.state !== 'fallback') {
    if (btn.dataset.state === 'playing') {
      currentAudio?.pause();
      btn.textContent = AUDIO_LABELS.paused;
      btn.dataset.state = 'paused';
      return;
    }

    if (btn.dataset.state === 'paused') {
      currentAudio?.play();
      btn.textContent = AUDIO_LABELS.playing;
      btn.dataset.state = 'playing';
      return;
    }

    const audio = new Audio(audioSrc);
    currentAudio = audio;
    currentBtn = btn;
    btn.textContent = AUDIO_LABELS.loading;
    btn.dataset.state = 'loading';

    audio.oncanplay = () => {
      btn.textContent = AUDIO_LABELS.playing;
      btn.dataset.state = 'playing';
      audio.play().catch(() => {
        btn.dataset.state = 'fallback';
        speakStory(btn, spotName, spotHint);
      });
    };

    audio.onended = () => {
      currentAudio = null;
      currentBtn = null;
      setButtonIdle(btn);
    };

    audio.onerror = () => {
      currentAudio = null;
      btn.dataset.state = 'fallback';
      speakStory(btn, spotName, spotHint);
    };

    audio.load();
    return;
  }

  if (btn.dataset.state === 'playing') {
    window.speechSynthesis.pause();
    btn.textContent = AUDIO_LABELS.paused;
    btn.dataset.state = 'paused';
    return;
  }

  if (btn.dataset.state === 'paused') {
    window.speechSynthesis.resume();
    btn.textContent = AUDIO_LABELS.playing;
    btn.dataset.state = 'playing';
    return;
  }

  btn.textContent = AUDIO_LABELS.loading;
  btn.dataset.state = 'loading';
  btn.disabled = true;
  speakStory(btn, spotName, spotHint);
}

enhanceAudioButtonLayout();

window.speechSynthesis?.getVoices();
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
} else {
  document.querySelectorAll('.btn-audio').forEach((button) => {
    button.style.display = 'none';
  });
}
