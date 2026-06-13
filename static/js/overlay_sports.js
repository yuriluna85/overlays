// Local variables to track previous scores for animations
const urlParams = new URLSearchParams(window.location.search);
const serverIP = urlParams.get('ip') || localStorage.getItem('server_ip') || '127.0.0.1';
const SERVER_URL = window.location.hostname === 'yuriluna85.github.io' ? `http://${serverIP}:8000` : '';
let prevScoreA = 0;
let prevScoreB = 0;

// DOM Elements
const scoreboardBox = document.getElementById('overlay-scoreboard-box');
const renderPeriod = document.getElementById('render-period');
const renderTeamA = document.getElementById('render-team-a');
const renderTeamB = document.getElementById('render-team-b');
const renderScoreA = document.getElementById('render-score-a');
const renderScoreB = document.getElementById('render-score-b');
const renderTimerClock = document.getElementById('render-timer-clock');
const badgeColorA = document.getElementById('badge-color-a');
const badgeColorB = document.getElementById('badge-color-b');

const footerBox = document.getElementById('scoreboard-footer-box');
const statsVolley = document.getElementById('stats-volley');
const renderSetsA = document.getElementById('render-sets-a');
const renderSetsB = document.getElementById('render-sets-b');

const penaltiesBox = document.getElementById('overlay-penalties-box');
const renderPenaltiesA = document.getElementById('render-penalties-a');
const renderPenaltiesB = document.getElementById('render-penalties-b');

const alertBox = document.getElementById('overlay-sports-alert-box');
const alertTitle = document.getElementById('render-sports-alert-title');
const replayBadge = document.getElementById('overlay-replay-badge');
const alertDesc = document.getElementById('render-sports-alert-desc');

document.addEventListener('DOMContentLoaded', () => {
  // Connect to the real-time sports event source
  connectSportsEventSource();
});

// SSE Connection
function connectSportsEventSource() {
  const source = new EventSource(SERVER_URL + '/api/sports/events');

  source.onmessage = (event) => {
    const state = JSON.parse(event.data);
    updateSportsOverlayElements(state);
  };

  source.onerror = (err) => {
    console.error("Sports SSE connection lost. Reconnecting...", err);
  };
}

// Update overlay view in OBS Browser Source
function updateSportsOverlayElements(state) {
  // 1. VISIBILITY OF SCOREBOARD
  if (state.scoreboard.visible) {
    scoreboardBox.classList.add('show');
  } else {
    scoreboardBox.classList.remove('show');
  }

  // 2. PERIOD & TEAMS
  renderPeriod.textContent = state.scoreboard.period;
  renderTeamA.textContent = state.scoreboard.team_a;
  renderTeamB.textContent = state.scoreboard.team_b;

  if (badgeColorA && state.scoreboard.color_a) {
    badgeColorA.className = `team-badge color-${state.scoreboard.color_a}`;
  }
  if (badgeColorB && state.scoreboard.color_b) {
    badgeColorB.className = `team-badge color-${state.scoreboard.color_b}`;
  }

  // 3. SCORES WITH POP EFFECT ON INCREASE
  const scoreA = state.scoreboard.score_a;
  const scoreB = state.scoreboard.score_b;

  if (scoreA !== prevScoreA) {
    animateScoreBox(renderScoreA);
    prevScoreA = scoreA;
  }
  if (scoreB !== prevScoreB) {
    animateScoreBox(renderScoreB);
    prevScoreB = scoreB;
  }
  
  renderScoreA.textContent = scoreA;
  renderScoreB.textContent = scoreB;

  // 4. TIMER
  let clockTime = state.timer.seconds_left;
  if (state.timer.direction === 'up') {
    clockTime = state.timer.seconds_elapsed;
  }
  const mins = Math.floor(clockTime / 60);
  const secs = clockTime % 60;
  renderTimerClock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // 5. SPORT SPECIFIC FOOTER STATS
  const sport = state.scoreboard.sport;
  
  if (sport === 'volley') {
    if (footerBox) footerBox.style.display = 'flex';
    if (statsVolley) statsVolley.style.display = 'flex';
    
    renderSetsA.textContent = state.scoreboard.sets_a;
    renderSetsB.textContent = state.scoreboard.sets_b;
  } else {
    // Futsal, Handball, Basketball - hide footer statistics in default layout
    if (footerBox) footerBox.style.display = 'none';
  }

  // 6. PENALTIES SHOOTOUT
  if (state.penalties && state.penalties.visible) {
    if (penaltiesBox) penaltiesBox.style.display = 'flex';
    if (footerBox) footerBox.style.display = 'none'; // hide regular stats
    
    renderOverlayPenaltyDots('a', state.penalties.kicks_a || []);
    renderOverlayPenaltyDots('b', state.penalties.kicks_b || []);
  } else {
    if (penaltiesBox) penaltiesBox.style.display = 'none';
  }

  // 7. SUBTLE SPORTS ALERTS (SLIDES DOWN FROM SCOREBOARD)
  if (state.alert.visible) {
    alertTitle.textContent = state.alert.message;
    alertDesc.textContent = `${state.scoreboard.team_a} vs ${state.scoreboard.team_b}`;
    
    // Set icon depending on alert message
    const alertIcon = document.getElementById('alert-icon-emoji');
    if (alertIcon) {
      const msg = state.alert.message.toLowerCase();
      if (msg.includes('gol')) {
        alertIcon.textContent = '⚽';
      } else if (msg.includes('ponto')) {
        alertIcon.textContent = '⭐';
      } else if (msg.includes('tempo')) {
        alertIcon.textContent = '⏱️';
      } else if (msg.includes('fim')) {
        alertIcon.textContent = '🏁';
      } else if (msg.includes('pênalti') || msg.includes('penalti')) {
        alertIcon.textContent = '🎯';
      } else {
        alertIcon.textContent = '🔔';
      }
    }
    
    // Clear old alert style classes and apply new
    alertBox.className = 'scoreboard-alert-banner show';
    if (state.alert.style) {
      alertBox.classList.add(state.alert.style);
    }
  } else {
    alertBox.classList.remove('show');
  }

  // 8. REPLAY WATERMARK
  if (replayBadge) {
    if (state.replay && state.replay.visible) {
      replayBadge.classList.add('show');
    } else {
      replayBadge.classList.remove('show');
    }
  }
}

// Render circular penalty shootout indicators in overlay
function renderOverlayPenaltyDots(team, kicks) {
  const container = team === 'a' ? renderPenaltiesA : renderPenaltiesB;
  if (!container) return;
  
  container.innerHTML = '';
  kicks.forEach(status => {
    const dot = document.createElement('div');
    dot.className = `overlay-penalty-dot ${status}`;
    container.appendChild(dot);
  });
}

// Add temporary POP scale animation
function animateScoreBox(element) {
  element.classList.remove('pop');
  void element.offsetWidth; // Trigger reflow to restart animation
  element.classList.add('pop');
}
