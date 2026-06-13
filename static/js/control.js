// Global Variables
const urlParams = new URLSearchParams(window.location.search);
const serverIP = urlParams.get('ip') || localStorage.getItem('server_ip') || '127.0.0.1';
const SERVER_URL = window.location.hostname === 'yuriluna85.github.io' ? `http://${serverIP}:8000` : '';
let currentStyle = 'green';
let activeSponsorsList = [];

// DOM Elements
const ltNameInput = document.getElementById('lt-name');
const ltRoleInput = document.getElementById('lt-role');
const titleMainInput = document.getElementById('title-main');
const titleSubInput = document.getElementById('title-sub');
const timerMinInput = document.getElementById('timer-min');
const timerClockLabel = document.getElementById('current-timer-val');
const btnTimerStart = document.getElementById('btn-timer-start');
const btnTimerPause = document.getElementById('btn-timer-pause');
const alertMsgInput = document.getElementById('alert-msg');
const sponsorIntervalInput = document.getElementById('sponsor-interval');
const uploadZone = document.getElementById('upload-zone');
const sponsorFileInput = document.getElementById('sponsor-file-input');

document.addEventListener('DOMContentLoaded', () => {
  // Update OBS URL in instructions card
  document.getElementById('obs-url').textContent = `${window.location.protocol}//${window.location.host}${window.location.pathname.replace('control.html', 'overlay.html')}`;

  
  // Setup Sidebar navigation active states
  setupNavScrollSpy();
  
  // Setup Style selector click listeners for Lower Third
  setupThemeSelector();
  
  // Setup Sponsors list and drag-and-drop upload
  loadSponsors();
  setupSponsorUpload();
  
  // Start Real-time State Synchronization via Server-Sent Events (SSE)
  connectEventSource();
});

// Theme Button selection
function setupThemeSelector() {
  const btns = document.querySelectorAll('.theme-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStyle = btn.getAttribute('data-style');
    });
  });
}

// Sidebar Scrollspy
function setupNavScrollSpy() {
  const links = document.querySelectorAll('.nav-item');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

// SSE Connection to receive real-time updates from Server
function connectEventSource() {
  const source = new EventSource(SERVER_URL + '/api/events');
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
    updateControlPanelUI(state);
  };
}

// Update UI Inputs & Indicators based on state (only if they are not focused)
function updateControlPanelUI(state) {
  // 1. Lower Third
  updateIndicator('lower-third', state.lower_third.visible);
  updateInputValue(ltNameInput, state.lower_third.name);
  updateInputValue(ltRoleInput, state.lower_third.role);
  if (state.lower_third.style !== currentStyle) {
    currentStyle = state.lower_third.style;
    document.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.getAttribute('data-style') === currentStyle) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // 2. Title Overlay
  updateIndicator('title', state.title.visible);
  updateInputValue(titleMainInput, state.title.title);
  updateInputValue(titleSubInput, state.title.subtitle);

  // 3. Timer
  updateIndicator('timer', state.timer.visible);
  updateInputValue(timerMinInput, state.timer.duration);
  
  // Format Clock display
  const mins = Math.floor(state.timer.seconds_left / 60);
  const secs = state.timer.seconds_left % 60;
  timerClockLabel.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  // Update Start/Pause Buttons state
  if (state.timer.running) {
    btnTimerStart.setAttribute('disabled', 'true');
    btnTimerPause.removeAttribute('disabled');
    timerClockLabel.style.color = '#10b981';
  } else {
    btnTimerStart.removeAttribute('disabled');
    btnTimerPause.setAttribute('disabled', 'true');
    timerClockLabel.style.color = 'var(--color-warning)';
  }

  // 4. Alert / Notices
  updateIndicator('alert', state.alert.visible);
  updateInputValue(alertMsgInput, state.alert.message);

  // 5. Sponsors
  updateIndicator('sponsors', state.sponsors.visible);
  updateInputValue(sponsorIntervalInput, state.sponsors.interval);
  activeSponsorsList = state.sponsors.list;
  
  // Sync checkbox checks in the list
  document.querySelectorAll('.sponsor-checkbox').forEach(cb => {
    const filename = cb.getAttribute('data-filename');
    cb.checked = activeSponsorsList.includes(filename);
  });
}

// Helper to update input value only if user is not actively typing
function updateInputValue(inputElement, value) {
  if (inputElement && document.activeElement !== inputElement) {
    inputElement.value = value;
  }
}

// Helper to toggle active indicators in card headers
function updateIndicator(id, isVisible) {
  const ind = document.getElementById(`indicator-${id}`);
  if (ind) {
    if (isVisible) {
      ind.textContent = "NO AR";
      ind.className = "status-indicator showing";
    } else {
      ind.textContent = "Inativo";
      ind.className = "status-indicator";
    }
  }
}

// POST updates to server state
function postStateUpdate(payload) {
  fetch(SERVER_URL + '/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .catch(err => console.error("Error posting state update:", err));
}

// Toggle overlays visibility and send values
function toggleOverlay(module, visible) {
  let payload = {};
  
  if (module === 'lower_third') {
    payload.lower_third = {
      visible: visible,
      name: ltNameInput.value,
      role: ltRoleInput.value,
      style: currentStyle
    };
  } else if (module === 'title') {
    payload.title = {
      visible: visible,
      title: titleMainInput.value,
      subtitle: titleSubInput.value
    };
  } else if (module === 'timer') {
    payload.timer = {
      visible: visible
    };
  } else if (module === 'alert') {
    payload.alert = {
      visible: visible,
      message: alertMsgInput.value
    };
  } else if (module === 'sponsors') {
    payload.sponsors = {
      visible: visible,
      list: activeSponsorsList
    };
  }

  postStateUpdate(payload);
}

// Timer Controls
function controlTimer(action) {
  let payload = { timer: {} };
  const durationMin = parseInt(timerMinInput.value, 10) || 5;

  if (action === 'start') {
    payload.timer.running = true;
    
    // Check if we are resuming or starting fresh
    const clockText = timerClockLabel.textContent;
    const currentSeconds = parseInt(clockText.split(':')[0]) * 60 + parseInt(clockText.split(':')[1]);
    
    // If clock is at 0 or matches original duration, start fresh; otherwise resume
    if (currentSeconds <= 0 || currentSeconds === durationMin * 60) {
      payload.timer.duration = durationMin;
      payload.timer.seconds_left = durationMin * 60;
    }
  } else if (action === 'pause') {
    payload.timer.running = false;
  } else if (action === 'reset') {
    payload.timer.running = false;
    payload.timer.duration = durationMin;
    payload.timer.seconds_left = durationMin * 60;
  }

  postStateUpdate(payload);
}

// ==========================================================================
// SPONSORS MANAGEMENT
// ==========================================================================

// Load list of sponsor files from API
function loadSponsors() {
  const container = document.getElementById('sponsors-container');
  
  fetch(SERVER_URL + '/api/sponsors')
    .then(res => res.json())
    .then(files => {
      if (files.length === 0) {
        container.innerHTML = `
          <div class="loading-state" style="padding: 20px;">
            <i class="fa-solid fa-triangle-exclamation" style="color: var(--text-muted);"></i>
            <p style="font-size: 12.5px; color: var(--text-muted);">Nenhuma logo cadastrada ainda.</p>
          </div>
        `;
        return;
      }
      
      container.innerHTML = files.map(filename => {
        const isChecked = activeSponsorsList.includes(filename);
        return `
          <div class="sponsor-item-card" onclick="toggleSponsorCheckbox('${filename}')">
            <div class="sponsor-img-wrapper">
              <img src="/static/sponsors/${filename}" alt="${filename}">
            </div>
            <div class="sponsor-card-footer" onclick="event.stopPropagation()">
              <div class="sponsor-checkbox-wrapper">
                <input type="checkbox" 
                       class="sponsor-checkbox" 
                       data-filename="${filename}" 
                       ${isChecked ? 'checked' : ''} 
                       onchange="handleSponsorCheckbox(this, '${filename}')">
              </div>
              <button class="delete-sponsor-btn" onclick="deleteSponsor('${filename}')" title="Excluir logo">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    })
    .catch(err => {
      container.innerHTML = `<div class="loading-state">Erro ao carregar logos.</div>`;
      console.error(err);
    });
}

// Click on sponsor card selects checkbox
function toggleSponsorCheckbox(filename) {
  const cb = document.querySelector(`.sponsor-checkbox[data-filename="${filename}"]`);
  if (cb) {
    cb.checked = !cb.checked;
    handleSponsorCheckbox(cb, filename);
  }
}

// Handle checkbox toggle
function handleSponsorCheckbox(element, filename) {
  if (element.checked) {
    if (!activeSponsorsList.includes(filename)) {
      activeSponsorsList.push(filename);
    }
  } else {
    activeSponsorsList = activeSponsorsList.filter(f => f !== filename);
  }
  
  // Update sponsors list immediately in state
  postStateUpdate({
    sponsors: {
      list: activeSponsorsList
    }
  });
}

// Update rotation interval
function updateSponsorInterval() {
  const interval = parseInt(sponsorIntervalInput.value, 10) || 5;
  postStateUpdate({
    sponsors: {
      interval: interval
    }
  });
}

// Delete sponsor logo file
function deleteSponsor(filename) {
  if (!confirm(`Tem certeza que deseja excluir a logo "${filename}"?`)) return;
  
  fetch(SERVER_URL + `/api/sponsors/delete/${filename}`, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      activeSponsorsList = activeSponsorsList.filter(f => f !== filename);
      loadSponsors();
    }
  })
  .catch(err => console.error("Error deleting sponsor:", err));
}

// Drag & Drop / File Upload logic
function setupSponsorUpload() {
  uploadZone.addEventListener('click', () => {
    sponsorFileInput.click();
  });
  
  sponsorFileInput.addEventListener('change', () => {
    if (sponsorFileInput.files.length > 0) {
      uploadFile(sponsorFileInput.files[0]);
    }
  });
  
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  });
}

// Upload file to server API
function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const originalText = uploadZone.querySelector('p').innerHTML;
  uploadZone.querySelector('p').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;
  
  fetch(SERVER_URL + '/api/sponsors/upload', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    uploadZone.querySelector('p').innerHTML = originalText;
    if (data.status === 'success') {
      // Reload sponsor logos list
      loadSponsors();
    } else {
      alert("Erro no upload: " + (data.error || "Formato inválido."));
    }
  })
  .catch(err => {
    uploadZone.querySelector('p').innerHTML = originalText;
    console.error("Error uploading file:", err);
  });
}
