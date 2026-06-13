// Global State inside Overlay
const urlParams = new URLSearchParams(window.location.search);
const serverIP = urlParams.get('ip') || localStorage.getItem('server_ip') || '127.0.0.1';
const SERVER_URL = window.location.hostname === 'yuriluna85.github.io' ? `http://${serverIP}:8000` : '';
let activeSponsors = [];
let sponsorRotationInterval = null;
let currentSponsorIndex = 0;
let rotationSpeedSeconds = 5;

// DOM Elements
const ltBox = document.getElementById('overlay-lower-third-box');
const ltName = document.getElementById('render-lt-name');
const ltRole = document.getElementById('render-lt-role');

const titleBox = document.getElementById('overlay-title-box');
const titleMain = document.getElementById('render-title-main');
const titleSub = document.getElementById('render-title-sub');

const timerBox = document.getElementById('overlay-timer-box');
const timerClock = document.getElementById('render-timer-val');

const alertBox = document.getElementById('overlay-alert-box');
const alertMsg = document.getElementById('render-alert-msg');

const sponsorsBox = document.getElementById('overlay-sponsors-box');
const sponsorImg = document.getElementById('render-sponsor-img');

document.addEventListener('DOMContentLoaded', () => {
  // Connect to the real-time event source
  connectEventSource();
});

// SSE connection
function connectEventSource() {
  const source = new EventSource(SERVER_URL + '/api/events');

  source.onmessage = (event) => {
    const state = JSON.parse(event.data);
    updateOverlayElements(state);
  };

  source.onerror = (err) => {
    console.error("SSE connection lost. Reconnecting...", err);
  };
}

// Update DOM elements and fire transitions based on state
function updateOverlayElements(state) {
  // 1. LOWER THIRD
  if (state.lower_third.visible) {
    // Update texts
    ltName.textContent = state.lower_third.name;
    ltRole.textContent = state.lower_third.role;
    
    // Clear previous theme classes and apply current
    ltBox.className = 'lower-third-overlay show';
    ltBox.classList.add(`theme-${state.lower_third.style}`);
  } else {
    ltBox.classList.remove('show');
  }

  // 2. HEADER TITLE BAR
  if (state.title.visible) {
    titleMain.textContent = state.title.title;
    titleSub.textContent = state.title.subtitle;
    titleBox.classList.add('show');
  } else {
    titleBox.classList.remove('show');
  }

  // 3. COUNTDOWN TIMER
  if (state.timer.visible) {
    const mins = Math.floor(state.timer.seconds_left / 60);
    const secs = state.timer.seconds_left % 60;
    timerClock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerBox.classList.add('show');
  } else {
    timerBox.classList.remove('show');
  }

  // 4. DISCUSSION / ALERT BOARD
  if (state.alert.visible) {
    alertMsg.textContent = state.alert.message;
    alertBox.classList.add('show');
  } else {
    alertBox.classList.remove('show');
  }

  // 5. SPONSORS CAROUSEL
  if (state.sponsors.visible && state.sponsors.list && state.sponsors.list.length > 0) {
    sponsorsBox.classList.add('show');
    
    // Check if the list or interval speed has changed
    const listsMatch = JSON.stringify(activeSponsors) === JSON.stringify(state.sponsors.list);
    const speedMatches = rotationSpeedSeconds === state.sponsors.interval;
    
    if (!listsMatch || !speedMatches) {
      activeSponsors = state.sponsors.list;
      rotationSpeedSeconds = state.sponsors.interval;
      currentSponsorIndex = 0;
      startSponsorsRotation();
    }
  } else {
    sponsorsBox.classList.remove('show');
    stopSponsorsRotation();
  }
}

// Start Sponsor Rotation Timer
function startSponsorsRotation() {
  stopSponsorsRotation();
  
  if (activeSponsors.length === 0) return;
  
  // Render the first logo immediately
  setSponsorLogo(activeSponsors[currentSponsorIndex]);
  
  // Set up the interval for subsequent rotation
  sponsorRotationInterval = setInterval(() => {
    currentSponsorIndex = (currentSponsorIndex + 1) % activeSponsors.length;
    
    // Fade out transition
    sponsorImg.classList.add('fade-out');
    
    // Change image source after fade-out transition completes (400ms in CSS)
    setTimeout(() => {
      setSponsorLogo(activeSponsors[currentSponsorIndex]);
      sponsorImg.classList.remove('fade-out');
    }, 400);
    
  }, rotationSpeedSeconds * 1000);
}

// Stop Sponsor Rotation Timer
function stopSponsorsRotation() {
  if (sponsorRotationInterval) {
    clearInterval(sponsorRotationInterval);
    sponsorRotationInterval = null;
  }
}

// Set Sponsor Image source safely
function setSponsorLogo(filename) {
  if (filename) {
    sponsorImg.src = SERVER_URL + `/static/sponsors/${filename}`;
  } else {
    sponsorImg.src = '';
  }
}
