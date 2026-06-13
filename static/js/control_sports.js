// IF Baiano Campuses List
const CAMPUSES = [
  "Alagoinhas",
  "Bom Jesus da Lapa",
  "Catu",
  "Governador Mangabeira",
  "Guanambi",
  "Itaberaba",
  "Itapetinga",
  "Reitoria",
  "Santa Inês",
  "Senhor do Bonfim",
  "Serrinha",
  "Teixeira de Freitas",
  "Valença",
  "Uruçuca",
  "Xique-Xique"
];

// Global Sports Variables
const urlParams = new URLSearchParams(window.location.search);
const serverIP = urlParams.get('ip') || localStorage.getItem('server_ip') || '127.0.0.1';
const SERVER_URL = window.location.hostname === 'yuriluna85.github.io' ? `http://${serverIP}:8000` : '';
let currentSport = 'futsal';
let timerDirection = 'down';
let localKicksA = [];
let localKicksB = [];
let localReplayVisible = false;

// DOM Elements
const selectTeamA = document.getElementById('select-team-a');
const selectTeamB = document.getElementById('select-team-b');
const selectColorA = document.getElementById('select-color-a');
const selectColorB = document.getElementById('select-color-b');
const labelTeamA = document.getElementById('label-team-a');
const labelTeamB = document.getElementById('label-team-b');
const scoreValA = document.getElementById('score-val-a');
const scoreValB = document.getElementById('score-val-b');
const setsValA = document.getElementById('sets-val-a');
const setsValB = document.getElementById('sets-val-b');

const sportsTimerMinInput = document.getElementById('sports-timer-min');
const sportsTimerClockLabel = document.getElementById('sports-current-timer-val');
const btnSportsTimerStart = document.getElementById('btn-sports-timer-start');
const btnSportsTimerPause = document.getElementById('btn-sports-timer-pause');
const selectPeriod = document.getElementById('select-period');
const customAlertInput = document.getElementById('custom-sports-alert');
const activeSportLabel = document.getElementById('active-sport-label');

document.addEventListener('DOMContentLoaded', () => {
  // Populate dropdown selectors with IF Baiano Campuses
  populateCampuses();
  
  // Set OBS URL instructions
  document.getElementById('obs-url').textContent = `${window.location.protocol}//${window.location.host}${window.location.pathname.replace('control_sports.html', 'overlay_sports.html')}`;
  
  // Connect to live sports events SSE stream
  connectSportsEventSource();
});

// Populate selects
function populateCampuses() {
  const optionsA = CAMPUSES.map((c, i) => `<option value="${c}" ${c === "Guanambi" ? "selected" : ""}>${c}</option>`).join('');
  const optionsB = CAMPUSES.map((c, i) => `<option value="${c}" ${c === "Catu" ? "selected" : ""}>${c}</option>`).join('');
  
  selectTeamA.innerHTML = optionsA;
  selectTeamB.innerHTML = optionsB;
  
  // Update initials label
  updateInitialsLabels();
}

// Generate 3 letters initials
function getInitials(name) {
  if (name.toLowerCase() === "reitoria") return "REI";
  if (name.toLowerCase() === "santa inês") return "SIN";
  if (name.toLowerCase() === "senhor do bonfim") return "SBO";
  if (name.toLowerCase() === "teixeira de freitas") return "TXF";
  if (name.toLowerCase() === "governador mangabeira") return "GMA";
  if (name.toLowerCase() === "bom jesus da lapa") return "BJL";
  
  // Fallback first 3 letters
  return name.substring(0, 3).toUpperCase();
}

function updateInitialsLabels() {
  const initialTeamA = document.getElementById('initial-team-a');
  const initialTeamB = document.getElementById('initial-team-b');
  if (initialTeamA) initialTeamA.textContent = getInitials(selectTeamA.value);
  if (initialTeamB) initialTeamB.textContent = getInitials(selectTeamB.value);
}

// Connect to Sports SSE
function connectSportsEventSource() {
  const source = new EventSource(SERVER_URL + '/api/sports/events');
  const statusLabel = document.getElementById('status-label');
  const statusDot = document.querySelector('.status-dot');

  // Add configuration link if on GitHub Pages
  if (window.location.hostname === 'yuriluna85.github.io' && statusLabel) {
    if (!document.getElementById('btn-config-ip')) {
      const configLink = document.createElement('a');
      configLink.id = 'btn-config-ip';
      configLink.href = '#';
      configLink.style.color = '#3b82f6';
      configLink.style.textDecoration = 'underline';
      configLink.style.marginLeft = '8px';
      configLink.style.fontSize = '11px';
      configLink.innerHTML = '<i class="fa-solid fa-gear"></i> Configurar IP';
      configLink.onclick = (e) => {
        e.preventDefault();
        const currentIP = localStorage.getItem('server_ip') || '127.0.0.1';
        const newIP = prompt("Digite o endereço IP do computador onde o servidor Flask está rodando:", currentIP);
        if (newIP !== null) {
          const cleanIP = newIP.trim();
          if (cleanIP) {
            localStorage.setItem('server_ip', cleanIP);
            window.location.reload();
          }
        }
      };
      statusLabel.parentNode.appendChild(configLink);
    }
  }

  source.onopen = () => {
    if (statusLabel) statusLabel.textContent = "Servidor Conectado";
    if (statusDot) statusDot.className = "status-dot online";
  };

  source.onerror = () => {
    if (statusLabel) statusLabel.textContent = "Desconectado. Reconectando...";
    if (statusDot) statusDot.className = "status-dot offline";
  };

  source.onmessage = (event) => {
    const state = JSON.parse(event.data);
    updateSportsUI(state);
  };
}

// Update Panel inputs based on sports state (without losing focus)
function updateSportsUI(state) {
  // 1. General Indicator
  updateIndicator('sports-overlay', state.scoreboard.visible);

  // 2. Confronto / Teams
  updateInputValue(selectTeamA, state.scoreboard.team_a);
  updateInputValue(selectTeamB, state.scoreboard.team_b);
  updateInputValue(selectColorA, state.scoreboard.color_a);
  updateInputValue(selectColorB, state.scoreboard.color_b);
  labelTeamA.textContent = state.scoreboard.team_a;
  labelTeamB.textContent = state.scoreboard.team_b;
  updateInitialsLabels();

  // 3. Scores & stats
  scoreValA.textContent = state.scoreboard.score_a;
  scoreValB.textContent = state.scoreboard.score_b;
  
  setsValA.textContent = state.scoreboard.sets_a;
  setsValB.textContent = state.scoreboard.sets_b;

  // 4. Sport Type
  if (state.scoreboard.sport !== currentSport) {
    currentSport = state.scoreboard.sport;
    activeSportLabel.textContent = currentSport.toUpperCase();
    
    // Toggle active classes on sports buttons
    document.querySelectorAll('.sport-btn').forEach(btn => {
      if (btn.getAttribute('data-sport') === currentSport) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle specific controls display (sets)
    const extraVolley = document.getElementById('extra-volleyball');
    const timerSection = document.getElementById('sec-timer');

    if (currentSport === 'volley') {
      if (extraVolley) extraVolley.style.display = 'block';
      if (timerSection) timerSection.style.display = 'none'; // Volleyball doesn't use timer
    } else { // Futsal, Handball, Basketball
      if (extraVolley) extraVolley.style.display = 'none';
      if (timerSection) timerSection.style.display = 'block';
    }
  }

  // 5. Timer
  updateInputValue(sportsTimerMinInput, state.timer.duration);
  timerDirection = state.timer.direction;
  
  // Active classes on direction buttons
  if (timerDirection === 'down') {
    document.getElementById('btn-dir-down').classList.add('active');
    document.getElementById('btn-dir-up').classList.remove('active');
  } else {
    document.getElementById('btn-dir-down').classList.remove('active');
    document.getElementById('btn-dir-up').classList.add('active');
  }

  // Format Clock display
  let clockTime = state.timer.seconds_left;
  if (timerDirection === 'up') {
    clockTime = state.timer.seconds_elapsed;
  }
  const mins = Math.floor(clockTime / 60);
  const secs = clockTime % 60;
  sportsTimerClockLabel.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Timer run state
  if (state.timer.running) {
    btnSportsTimerStart.setAttribute('disabled', 'true');
    btnSportsTimerPause.removeAttribute('disabled');
    sportsTimerClockLabel.style.color = '#10b981';
  } else {
    btnSportsTimerStart.removeAttribute('disabled');
    btnSportsTimerPause.setAttribute('disabled', 'true');
    sportsTimerClockLabel.style.color = 'var(--color-warning)';
  }

  // 6. Period
  updateInputValue(selectPeriod, state.scoreboard.period);

  // 7. Penalties Shootout
  if (state.penalties) {
    localKicksA = state.penalties.kicks_a || [];
    localKicksB = state.penalties.kicks_b || [];
    
    const penaltyNameA = document.getElementById('penalty-name-a');
    const penaltyNameB = document.getElementById('penalty-name-b');
    if (penaltyNameA) penaltyNameA.textContent = state.scoreboard.team_a;
    if (penaltyNameB) penaltyNameB.textContent = state.scoreboard.team_b;
    
    updateIndicator('penalties', state.penalties.visible);
    renderPenaltyDotsInPanel('a', localKicksA);
    renderPenaltyDotsInPanel('b', localKicksB);
  }

  // 8. Replay Mode
  if (state.replay) {
    localReplayVisible = state.replay.visible;
    const btnToggleReplay = document.getElementById('btn-toggle-replay');
    if (btnToggleReplay) {
      if (localReplayVisible) {
        btnToggleReplay.innerHTML = '<i class="fa-solid fa-video"></i> REPLAY: ATIVO';
        btnToggleReplay.style.backgroundColor = 'var(--color-red)';
        btnToggleReplay.style.color = '#fff';
        btnToggleReplay.style.borderColor = 'var(--color-red)';
      } else {
        btnToggleReplay.innerHTML = '<i class="fa-solid fa-video"></i> REPLAY: DESATIVADO';
        btnToggleReplay.style.backgroundColor = 'rgba(228, 0, 43, 0.08)';
        btnToggleReplay.style.color = 'var(--color-red)';
        btnToggleReplay.style.borderColor = 'rgba(228, 0, 43, 0.2)';
      }
    }
  }
}

// Helpers
function updateInputValue(inputElement, value) {
  if (inputElement && document.activeElement !== inputElement) {
    inputElement.value = value;
  }
}

function updateIndicator(id, isVisible) {
  const ind = document.getElementById(`indicator-${id}`);
  if (ind) {
    if (isVisible) {
      ind.textContent = "NO AR";
      ind.className = "status-indicator showing";
    } else {
      ind.textContent = "Inativo no OBS";
      ind.className = "status-indicator";
    }
  }
}

// POST updates to sports state
function postSportsStateUpdate(payload) {
  fetch(SERVER_URL + '/api/sports/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .catch(err => console.error("Error posting sports state:", err));
}

// Show/Hide Scoreboard Overlay on Stream
function toggleSportsOverlay(visible) {
  postSportsStateUpdate({
    scoreboard: {
      visible: visible,
      team_a: selectTeamA.value,
      team_b: selectTeamB.value,
      period: selectPeriod.value
    }
  });
}

// Change Sport Mode
function changeSport(sport) {
  let payload = {
    scoreboard: {
      sport: sport,
      score_a: 0,
      score_b: 0,
      sets_a: 0,
      sets_b: 0,
      fouls_a: 0,
      fouls_b: 0
    },
    timer: {
      running: false
    }
  };

  // Default times & directions depending on sport
  if (sport === 'futsal') {
    payload.timer.duration = 20;
    payload.timer.seconds_left = 1200;
    payload.timer.direction = 'down';
    payload.scoreboard.period = "1º Tempo";
  } else if (sport === 'volley') {
    payload.scoreboard.period = "1º Set";
  } else if (sport === 'basketball') {
    payload.timer.duration = 10;
    payload.timer.seconds_left = 600;
    payload.timer.direction = 'down';
    payload.scoreboard.period = "1º Quarto";
  } else if (sport === 'handball') {
    payload.timer.duration = 30;
    payload.timer.seconds_left = 1800;
    payload.timer.direction = 'down';
    payload.scoreboard.period = "1º Tempo";
  }

  postSportsStateUpdate(payload);
}

// Update Teams and Uniform Colors
function updateTeamsState() {
  updateInitialsLabels();
  postSportsStateUpdate({
    scoreboard: {
      team_a: selectTeamA.value,
      team_b: selectTeamB.value,
      color_a: selectColorA.value,
      color_b: selectColorB.value
    }
  });
}

// Adjust Score
function adjustScore(team, val) {
  const currentVal = team === 'a' ? parseInt(scoreValA.textContent) : parseInt(scoreValB.textContent);
  const newVal = Math.max(0, currentVal + val);
  
  let payload = { scoreboard: {} };
  if (team === 'a') {
    payload.scoreboard.score_a = newVal;
  } else {
    payload.scoreboard.score_b = newVal;
  }
  
  postSportsStateUpdate(payload);
}



// Adjust Sets
function adjustSets(team, val) {
  const currentVal = team === 'a' ? parseInt(setsValA.textContent) : parseInt(setsValB.textContent);
  const newVal = Math.max(0, currentVal + val);
  
  let payload = { scoreboard: {} };
  if (team === 'a') {
    payload.scoreboard.sets_a = newVal;
  } else {
    payload.scoreboard.sets_b = newVal;
  }
  
  postSportsStateUpdate(payload);
}

// Timer direction configuration
function setTimerDirection(direction) {
  postSportsStateUpdate({
    timer: {
      direction: direction
    }
  });
}

// Timer Controls
function controlSportsTimer(action) {
  let payload = { timer: {} };
  const durationMin = parseInt(sportsTimerMinInput.value, 10) || 20;
  console.log("Timer action triggered:", action);

  if (action === 'start') {
    payload.timer.running = true;
    
    // Check if we are resuming or starting fresh
    const clockText = sportsTimerClockLabel ? sportsTimerClockLabel.textContent : "20:00";
    const parts = clockText.split(':');
    const mins = parts[0] ? parseInt(parts[0], 10) : 20;
    const secs = parts[1] ? parseInt(parts[1], 10) : 0;
    const currentSeconds = (isNaN(mins) ? 20 : mins) * 60 + (isNaN(secs) ? 0 : secs);
    
    if (timerDirection === 'down') {
      if (currentSeconds <= 0 || currentSeconds === durationMin * 60) {
        payload.timer.duration = durationMin;
        payload.timer.seconds_left = durationMin * 60;
      }
    } else {
      if (currentSeconds === 0) {
        payload.timer.seconds_elapsed = 0;
      }
    }
  } else if (action === 'pause') {
    payload.timer.running = false;
  } else if (action === 'reset') {
    payload.timer.running = false;
    payload.timer.duration = durationMin;
    payload.timer.seconds_left = durationMin * 60;
    payload.timer.seconds_elapsed = 0;
  }

  console.log("Sending timer update payload:", payload);
  postSportsStateUpdate(payload);
}

// Adjust timer duration from input
function adjustTimerDuration() {
  const durationMin = parseInt(sportsTimerMinInput.value, 10) || 20;
  postSportsStateUpdate({
    timer: {
      duration: durationMin,
      seconds_left: durationMin * 60
    }
  });
}

// Period Update
function updatePeriod() {
  postSportsStateUpdate({
    scoreboard: {
      period: selectPeriod.value
    }
  });
}

// Quick alert triggers (shows alert for 5 seconds, then hides)
function triggerQuickAlert(message) {
  let alertStyle = "alert-red";
  if (message.includes('PONTO')) alertStyle = "alert-green";
  if (message.includes('TEMPO')) alertStyle = "alert-yellow";
  if (message.includes('FIM')) alertStyle = "alert-yellow";

  // 1. Show alert
  fetch(SERVER_URL + '/api/sports/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alert: {
        visible: true,
        message: message,
        style: alertStyle
      }
    })
  });

  // 2. Auto hide after 8 seconds
  setTimeout(() => {
    fetch(SERVER_URL + '/api/sports/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: {
          visible: false
        }
      })
    });
  }, 8000);
}

// Send custom sports alert
function sendCustomSportsAlert() {
  const msg = customAlertInput.value.trim();
  if (msg) {
    triggerQuickAlert(msg.toUpperCase());
    customAlertInput.value = '';
  }
}

// ==========================================================================
// PENALTIES SHOOTOUT PANEL LOGIC
// ==========================================================================

function renderPenaltyDotsInPanel(team, kicks) {
  const container = document.getElementById(`penalty-dots-${team}`);
  if (!container) return;
  
  container.innerHTML = '';
  kicks.forEach((status, index) => {
    const btn = document.createElement('button');
    btn.className = `penalty-dot-btn ${status}`;
    
    // Icon based on status
    if (status === 'success') {
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (status === 'miss') {
      btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else {
      btn.innerHTML = index + 1;
    }
    
    // On click, cycle status
    btn.onclick = () => {
      let nextStatus = 'pending';
      if (status === 'pending') nextStatus = 'success';
      else if (status === 'success') nextStatus = 'miss';
      
      cyclePenaltyKickStatus(team, index, nextStatus);
    };
    
    container.appendChild(btn);
  });
}

function cyclePenaltyKickStatus(team, index, nextStatus) {
  let updatedKicks = team === 'a' ? [...localKicksA] : [...localKicksB];
  updatedKicks[index] = nextStatus;
  
  let payload = { penalties: {} };
  if (team === 'a') {
    payload.penalties.kicks_a = updatedKicks;
  } else {
    payload.penalties.kicks_b = updatedKicks;
  }
  
  postSportsStateUpdate(payload);
}

function adjustPenaltyKicksCount(val) {
  let updatedKicksA = [...localKicksA];
  let updatedKicksB = [...localKicksB];
  
  if (val > 0) {
    updatedKicksA.push('pending');
    updatedKicksB.push('pending');
  } else {
    if (updatedKicksA.length <= 1) return; // Keep at least one
    updatedKicksA.pop();
    updatedKicksB.pop();
  }
  
  postSportsStateUpdate({
    penalties: {
      kicks_a: updatedKicksA,
      kicks_b: updatedKicksB
    }
  });
}

function resetPenaltiesState() {
  const currentLen = localKicksA.length || 5;
  const newKicks = Array(currentLen).fill('pending');
  
  postSportsStateUpdate({
    penalties: {
      kicks_a: newKicks,
      kicks_b: newKicks
    }
  });
}

function togglePenaltiesOverlay(visible) {
  postSportsStateUpdate({
    penalties: {
      visible: visible
    }
  });
}

function toggleReplayMode() {
  postSportsStateUpdate({
    replay: {
      visible: !localReplayVisible
    }
  });
}
