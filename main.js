const days = [
  {n:1, title:'🛬 Day 1 · 抵廈'},
  {n:2, title:'🚇 Day 2 · 集美'},
  {n:3, title:'🏯 Day 3 · 土樓'},
  {n:4, title:'🌊 Day 4 · 鼓浪嶼'},
  {n:5, title:'🎭 Day 5 · 返台'},
];
const nav = document.getElementById('dayNav');
days.forEach(d => {
  const btn = document.createElement('button');
  btn.className = 'day-btn' + (d.n === 1 ? ' active' : '');
  btn.textContent = d.title;
  btn.onclick = () => {
    document.querySelectorAll('.day-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`day-${d.n}`).classList.add('active');
    btn.classList.add('active');
    document.getElementById('mainContent').scrollIntoView({behavior:'smooth', block:'start'});
  };
  nav.appendChild(btn);
});

function calcBudget() {
  const ids = ['b1','b2','b3','b4','b5','b6','b7','b8','b9'];
  const total = ids.reduce((s,id) => s + (parseFloat(document.getElementById(id).value)||0), 0);
  document.getElementById('totalDisplay').textContent = 'NT$ ' + total.toLocaleString();
}
calcBudget();

// === AUDIO STORY ===
let currentUtterance = null;
let currentAudio = null;
let currentBtn = null;

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
    currentBtn.textContent = '🎙️ 聽故事';
    currentBtn.dataset.state = 'idle';
    currentBtn.disabled = false;
    currentBtn = null;
  }
}

async function playSpotStory(btn, spotName, spotHint, audioSrc = null) {
  // 停止其他正在播放的
  if (currentBtn && currentBtn !== btn) stopCurrent();

  // 本地 MP3
  if (audioSrc) {
    if (btn.dataset.state === 'playing') {
      currentAudio.pause();
      btn.textContent = '▶️ 繼續';
      btn.dataset.state = 'paused';
      return;
    }
    if (btn.dataset.state === 'paused') {
      currentAudio.play();
      btn.textContent = '⏸ 暫停';
      btn.dataset.state = 'playing';
      return;
    }
    const audio = new Audio(audioSrc);
    currentAudio = audio;
    currentBtn = btn;
    btn.textContent = '⏸ 暫停';
    btn.dataset.state = 'playing';
    audio.play();
    audio.onended = () => { btn.textContent = '🎙️ 聽故事'; btn.dataset.state = 'idle'; currentAudio = null; currentBtn = null; };
    audio.onerror = () => { btn.textContent = '🎙️ 聽故事'; btn.dataset.state = 'idle'; currentAudio = null; currentBtn = null; };
    return;
  }

  // AI 生成 + TTS
  if (btn.dataset.state === 'playing') {
    window.speechSynthesis.pause();
    btn.textContent = '▶️ 繼續';
    btn.dataset.state = 'paused';
    return;
  }
  if (btn.dataset.state === 'paused') {
    window.speechSynthesis.resume();
    btn.textContent = '⏸ 暫停';
    btn.dataset.state = 'playing';
    return;
  }
  btn.textContent = '⏳ 生成中...';
  btn.dataset.state = 'loading';
  btn.disabled = true;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: '你是一位溫暖風趣的旅遊導覽員。用繁體中文說一段關於景點的小故事，120-160字，口語化、有畫面感，像在跟朋友聊天，結尾用一句有趣或有詩意的話收尾。只輸出故事本身，不要任何前言或格式。',
        messages: [{ role: 'user', content: `景點：${spotName}\n背景提示：${spotHint}\n請說一段適合語音朗讀的導覽小故事。` }]
      })
    });
    const data = await res.json();
    const story = data.content?.[0]?.text || `歡迎來到${spotName}，這裡風光明媚，值得您細細品味。`;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(story);
    utter.lang = 'zh-TW'; utter.rate = 0.88; utter.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang === 'zh-TW') || voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utter.voice = zhVoice;
    utter.onstart = () => { btn.textContent = '⏸ 暫停'; btn.dataset.state = 'playing'; btn.disabled = false; };
    utter.onend = utter.onerror = () => { btn.textContent = '🎙️ 聽故事'; btn.dataset.state = 'idle'; currentUtterance = null; currentBtn = null; };
    currentUtterance = utter; currentBtn = btn;
    window.speechSynthesis.speak(utter);
  } catch(e) {
    console.error(e);
    btn.textContent = '🎙️ 聽故事'; btn.dataset.state = 'idle'; btn.disabled = false;
  }
}

window.speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
if (!window.speechSynthesis) document.querySelectorAll('.btn-audio').forEach(b => b.style.display='none');
