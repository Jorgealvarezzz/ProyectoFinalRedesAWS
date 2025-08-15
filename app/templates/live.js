// live.js - Partido en vivo (COMPLETO - 10 MINUTOS)
import { 
  ensurePersistence, 
  getAll, 
  getById,
  add,
  put,
  mountBackupToolbar 
} from './app.js';

// Referencias DOM
const gameMeta = document.getElementById('game-meta');
const onCourtList = document.getElementById('on-court-list');
const benchList = document.getElementById('bench-list');
const activePlayerDisplay = document.getElementById('active-player-display');
const eventsContainer = document.getElementById('events-container');
const substitutionsModal = document.getElementById('substitutions-modal');
const subOutList = document.getElementById('sub-out-list');
const subInList = document.getElementById('sub-in-list');
const subStatus = document.getElementById('sub-status');
const confirmSubBtn = document.getElementById('confirm-sub-btn');
const backupHost = document.getElementById('backup-host');

// Estado del juego
let gameId = null;
let game = null;
let players = [];
let onCourt = [];
let bench = [];
let currentQuarter = 1;
let activePlayer = null;
let events = [];

// Cronómetro - FIJO 10 MINUTOS
let gameTimer = {
  isRunning: false,
  currentTime: 0,
  quarterDuration: 600, // 10 minutos = 600 segundos
  interval: null
};

// Estado de sustitución
let subOut = null;
let subIn = null;

// Estado de selección de zona de tiro
let currentShotType = null;
let selectedShotZone = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏀 Iniciando StatsBasket Live - 10 minutos por cuarto');
  
  try {
    await ensurePersistence();
    
    // Obtener gameId de la URL
    const urlParams = new URLSearchParams(window.location.search);
    gameId = parseInt(urlParams.get('gameId'));
    
    if (!gameId) {
      alert('No se especificó un partido válido');
      window.location.href = 'partido.html';
      return;
    }
    
    await loadGameData();
    setupTimer();
    
    if (backupHost) {
      mountBackupToolbar(backupHost);
    }
    
    console.log('✅ Live iniciado correctamente');
  } catch (error) {
    console.error('❌ Error iniciando:', error);
    alert('Error iniciando el partido');
  }
});

// Cargar datos del partido
async function loadGameData() {
  try {
    [game, players, events] = await Promise.all([
      getById('games', gameId),
      getAll('players'),
      getAll('events')
    ]);
    
    if (!game) {
      alert('Partido no encontrado');
      window.location.href = 'partido.html';
      return;
    }
    
    events = events.filter(e => e.gameId === gameId);
    setupInitialState();
    renderAll();
    
  } catch (error) {
    console.error('Error cargando datos:', error);
    alert('Error cargando el partido');
  }
}

// Configurar estado inicial
function setupInitialState() {
  currentQuarter = game.currentQuarter || 1;
  onCourt = game.starters.map(id => players.find(p => p.id === id)).filter(Boolean);
  bench = players.filter(p => !game.starters.includes(p.id));
  
  // Aplicar sustituciones de eventos anteriores
  events.forEach(event => {
    if (event.type === 'SUB') {
      applySub(event.payload.out, event.payload.in, false);
    }
  });
}

// Configurar cronómetro (SIEMPRE 10 MINUTOS)
function setupTimer() {
  console.log('⏰ Configurando cronómetro: 10 minutos por cuarto');
  
  gameTimer.currentTime = game.gameTime || 0;
  gameTimer.quarterDuration = 600; // 10 minutos fijos
  gameTimer.isRunning = false;
  
  if (gameTimer.interval) {
    clearInterval(gameTimer.interval);
    gameTimer.interval = null;
  }
  
  updateTimerDisplay();
  updateTimerControls();
}

// Actualizar display del cronómetro
function updateTimerDisplay() {
  const timerDisplay = document.getElementById('game-timer-display');
  const quarterInfo = document.getElementById('quarter-info');
  
  if (!timerDisplay) return;
  
  // Tiempo en el cuarto actual
  const timeInQuarter = gameTimer.currentTime % gameTimer.quarterDuration;
  const timeLeft = gameTimer.quarterDuration - timeInQuarter;
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  timerDisplay.textContent = displayTime;
  
  // Colores según tiempo restante
  if (timeLeft <= 60) {
    timerDisplay.style.color = '#dc2626'; // Rojo
  } else if (timeLeft <= 120) {
    timerDisplay.style.color = '#f59e0b'; // Naranja
  } else {
    timerDisplay.style.color = '#f2b64a'; // Dorado
  }
  
  if (quarterInfo) {
    quarterInfo.textContent = `Cuarto ${currentQuarter} - Tiempo restante: ${displayTime}`;
  }
  
  // Verificar fin de cuarto
  if (timeLeft === 0 && gameTimer.currentTime > 0) {
    endQuarter();
  }
  
  // Verificar fin de partido
  if (gameTimer.currentTime >= gameTimer.quarterDuration * 4) {
    endGame();
  }
}

// Iniciar cronómetro
function startTimer() {
  if (gameTimer.isRunning) return;
  
  console.log('▶️ Iniciando cronómetro');
  gameTimer.isRunning = true;
  
  gameTimer.interval = setInterval(() => {
    gameTimer.currentTime++;
    updateTimerDisplay();
    
    // Guardar cada 30 segundos
    if (gameTimer.currentTime % 30 === 0) {
      saveGameProgress();
    }
    
    // Alertas
    const timeInQuarter = gameTimer.currentTime % gameTimer.quarterDuration;
    const timeLeft = gameTimer.quarterDuration - timeInQuarter;
    
    if (timeLeft === 60) {
      showNotification('⏰ ¡Último minuto del cuarto!');
    } else if (timeLeft === 10) {
      showNotification('🚨 ¡10 segundos!');
    }
  }, 1000);
  
  updateTimerControls();
  showNotification('⏱️ Cronómetro iniciado');
}

// Pausar cronómetro
function pauseTimer() {
  if (!gameTimer.isRunning) return;
  
  console.log('⏸️ Pausando cronómetro');
  gameTimer.isRunning = false;
  
  if (gameTimer.interval) {
    clearInterval(gameTimer.interval);
    gameTimer.interval = null;
  }
  
  updateTimerControls();
  saveGameProgress();
  showNotification('⏸️ Cronómetro pausado');
}

// Reiniciar cronómetro
function resetTimer() {
  console.log('🔄 Reseteando cronómetro');
  
  pauseTimer();
  gameTimer.currentTime = 0;
  selectQuarter(1);
  updateTimerDisplay();
  updateTimerControls();
  saveGameProgress();
  showNotification('🔄 Cronómetro reseteado a 10:00');
}

// Actualizar controles
function updateTimerControls() {
  const playBtn = document.getElementById('timer-play-btn');
  const pauseBtn = document.getElementById('timer-pause-btn');
  const resetBtn = document.getElementById('timer-reset-btn');
  
  if (playBtn && pauseBtn) {
    if (gameTimer.isRunning) {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
    } else {
      playBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
    }
  }
  
  if (resetBtn) {
    resetBtn.disabled = gameTimer.isRunning;
  }
}

// Siguiente cuarto
function nextQuarter() {
  if (currentQuarter >= 4) {
    showNotification('Ya estás en el último cuarto');
    return;
  }
  
  if (!confirm(`¿Avanzar al Cuarto ${currentQuarter + 1}?`)) return;
  
  const nextQ = currentQuarter + 1;
  gameTimer.currentTime = (nextQ - 1) * gameTimer.quarterDuration;
  selectQuarter(nextQ);
  updateTimerDisplay();
  saveGameProgress();
  showNotification(`🏀 Cuarto ${nextQ}`);
}

// Finalizar cuarto actual
function endCurrentQuarter() {
  if (!confirm(`¿Finalizar el Cuarto ${currentQuarter}?`)) return;
  
  gameTimer.currentTime = currentQuarter * gameTimer.quarterDuration;
  updateTimerDisplay();
  pauseTimer();
  saveGameProgress();
  showNotification(`🏁 Cuarto ${currentQuarter} finalizado`);
}

// Fin de cuarto automático
function endQuarter() {
  pauseTimer();
  showNotification(`🏁 Fin del Cuarto ${currentQuarter}`);
  
  if (currentQuarter < 4) {
    setTimeout(() => {
      selectQuarter(currentQuarter + 1);
    }, 2000);
  } else {
    endGame();
  }
}

// Finalizar partido manualmente
async function finishGameManually() {
  if (!confirm('¿Finalizar este partido?')) return;
  
  try {
    pauseTimer();
    game.status = 'FINALIZADO';
    game.endTime = new Date().toISOString();
    await saveGameProgress();
    showGameEndModal();
    showNotification('🏆 Partido finalizado');
  } catch (error) {
    console.error('Error finalizando:', error);
  }
}

// Fin de partido automático
async function endGame() {
  try {
    pauseTimer();
    game.status = 'FINALIZADO';
    game.endTime = new Date().toISOString();
    await saveGameProgress();
    showGameEndModal();
    showNotification('🏆 ¡Partido completado!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Modal fin de partido
function showGameEndModal() {
  const modal = document.createElement('div');
  modal.className = 'game-end-modal';
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>🏀 ¡PARTIDO FINALIZADO!</h2>
        <p>El partido ha terminado.</p>
        <div class="final-actions">
          <button class="btn secondary" onclick="closeGameEndModal()">
            Continuar editando
          </button>
          <a href="reportes.html?gameId=${gameId}" class="btn primary">
            Ver estadísticas
          </a>
          <a href="index.html" class="btn ghost">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeGameEndModal() {
  const modal = document.querySelector('.game-end-modal');
  if (modal) document.body.removeChild(modal);
}

// Guardar progreso
async function saveGameProgress() {
  try {
    if (game) {
      game.gameTime = gameTimer.currentTime;
      game.currentQuarter = currentQuarter;
      game.lastUpdated = new Date().toISOString();
      await put('games', game);
    }
  } catch (error) {
    console.error('Error guardando:', error);
  }
}

// Renderizar todo
function renderAll() {
  renderGameMeta();
  renderPlayers();
  renderEvents();
  updateQuarterSelector();
  updateActionButtons();
}

// Meta del juego
function renderGameMeta() {
  if (!gameMeta || !game) return;
  
  const date = new Date(game.date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const venue = game.venue ? ` • ${game.venue}` : '';
  gameMeta.innerHTML = `${game.homeaway} vs ${game.opponent} • ${date}${venue}`;
}

// Renderizar jugadores
function renderPlayers() {
  if (onCourtList) {
    onCourtList.innerHTML = onCourt.map(player => `
      <div class="player-item ${activePlayer?.id === player.id ? 'active' : ''}" 
           onclick="selectActivePlayer(${player.id})">
        <div class="player-info">
          <div class="player-number">${player.number}</div>
          <div class="player-name">${player.name}</div>
        </div>
        <div style="color: var(--color-secondary); font-size: 0.8rem;">
          ${activePlayer?.id === player.id ? 'ACTIVO' : 'En cancha'}
        </div>
      </div>
    `).join('');
  }
  
  if (benchList) {
    benchList.innerHTML = bench.length > 0 ? bench.map(player => `
      <div class="player-item" onclick="selectActivePlayer(${player.id})">
        <div class="player-info">
          <div class="player-number">${player.number}</div>
          <div class="player-name">${player.name}</div>
        </div>
        <div style="color: var(--color-text-secondary); font-size: 0.8rem;">
          Suplente
        </div>
      </div>
    `).join('') : '<div style="color: var(--color-text-secondary); text-align: center; padding: 1rem;">Todos en cancha</div>';
  }
}

// Seleccionar jugador activo
function selectActivePlayer(playerId) {
  const player = players.find(p => p.id === playerId);
  if (!player) return;
  
  activePlayer = player;
  
  if (activePlayerDisplay) {
    activePlayerDisplay.innerHTML = `
      <div style="background: var(--color-secondary); color: var(--color-bg); padding: 1rem; border-radius: 8px;">
        <div style="font-size: 1.5rem; font-weight: bold;">#${player.number}</div>
        <div style="font-size: 1.1rem;">${player.name}</div>
      </div>
    `;
  }
  
  renderPlayers();
  updateActionButtons();
}

// Actualizar botones de acción
function updateActionButtons() {
  const actionBtns = document.querySelectorAll('.action-btn');
  actionBtns.forEach(btn => {
    btn.disabled = !activePlayer;
  });
}

// Registrar acción (para estadísticas que no necesitan zona)
async function recordAction(actionType) {
  if (!activePlayer) {
    alert('Selecciona un jugador primero');
    return;
  }
  
  // Auto-pausar si está marcado
  const autoPause = document.getElementById('auto-pause-checkbox')?.checked;
  if (autoPause && gameTimer.isRunning) {
    pauseTimer();
  }
  
  try {
    const event = {
      gameId: gameId,
      q: currentQuarter,
      type: actionType,
      payload: {
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        playerNumber: activePlayer.number,
        gameTime: gameTimer.currentTime
      },
      t: new Date().toISOString()
    };
    
    await add('events', event);
    events.push(event);
    renderEvents();
    showNotification(`${actionType} - #${activePlayer.number} ${activePlayer.name}`);
    
  } catch (error) {
    console.error('Error registrando:', error);
  }
}

// Abrir modal de selección de zona de tiro
function openShotModal(shotType) {
  if (!activePlayer) {
    alert('Selecciona un jugador primero');
    return;
  }
  
  currentShotType = shotType;
  selectedShotZone = null;
  
  const modal = document.getElementById('shot-zone-modal');
  const title = document.getElementById('shot-modal-title');
  const playerInfo = document.getElementById('shot-player-info');
  const confirmBtn = document.getElementById('confirm-shot-btn');
  
  if (!modal || !title || !playerInfo || !confirmBtn) {
    console.error('Modal elements not found');
    return;
  }
  
  // Títulos según el tipo de tiro
  const shotTitles = {
    '2PA': '🏀 Tiro de 2 puntos (Fallo)',
    '2PM': '🎯 Tiro de 2 puntos (Anotado)',
    '3PA': '🏀 Tiro de 3 puntos (Fallo)', 
    '3PM': '🎯 Tiro de 3 puntos (Anotado)'
  };
  
  title.textContent = shotTitles[shotType] || 'Seleccionar Zona del Tiro';
  playerInfo.textContent = `#${activePlayer.number} ${activePlayer.name}`;
  
  // Limpiar selecciones anteriores
  document.querySelectorAll('.zone-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  confirmBtn.disabled = true;
  
  // Mostrar modal
  if (modal.showModal) {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
}

// Función específica para tiros de pintura (registro directo sin modal)
async function openShotModalPintura(zona, esAnotado) {
  if (!activePlayer) {
    alert('Selecciona un jugador primero');
    return;
  }
  
  // Auto-pausar si está marcado
  const autoPause = document.getElementById('auto-pause-checkbox')?.checked;
  if (autoPause && gameTimer.isRunning) {
    pauseTimer();
  }
  
  const shotType = esAnotado ? '2PM' : '2PA';
  
  try {
    const event = {
      gameId: gameId,
      q: currentQuarter,
      type: shotType,
      payload: {
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        playerNumber: activePlayer.number,
        gameTime: gameTimer.currentTime,
        shotZone: zona,
        shotDetails: getShotZoneDetails(zona)
      },
      t: new Date().toISOString()
    };
    
    await add('events', event);
    events.push(event);
    renderEvents();
    
    const zoneText = getShotZoneText(zona);
    const actionText = esAnotado ? 'ANOTÓ' : 'FALLÓ';
    
    showNotification(`${actionText} desde ${zoneText} - #${activePlayer.number} ${activePlayer.name}`);
    
  } catch (error) {
    console.error('Error registrando tiro de pintura:', error);
    showNotification('Error al registrar el tiro');
  }
}

// Cerrar modal de zona de tiro
function closeShotModal() {
  const modal = document.getElementById('shot-zone-modal');
  if (modal) {
    if (modal.close) {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  }
  
  currentShotType = null;
  selectedShotZone = null;
}

// Seleccionar zona del tiro
function selectShotZone(zone) {
  selectedShotZone = zone;
  
  // Actualizar UI
  document.querySelectorAll('.zone-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  const selectedBtn = document.querySelector(`[data-zone="${zone}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('selected');
  }
  
  // Habilitar botón de confirmación
  const confirmBtn = document.getElementById('confirm-shot-btn');
  if (confirmBtn) {
    confirmBtn.disabled = false;
  }
}

// Confirmar tiro con zona
async function confirmShotWithZone() {
  if (!currentShotType || !selectedShotZone || !activePlayer) {
    return;
  }
  
  // Auto-pausar si está marcado
  const autoPause = document.getElementById('auto-pause-checkbox')?.checked;
  if (autoPause && gameTimer.isRunning) {
    pauseTimer();
  }
  
  try {
    const event = {
      gameId: gameId,
      q: currentQuarter,
      type: currentShotType,
      payload: {
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        playerNumber: activePlayer.number,
        gameTime: gameTimer.currentTime,
        shotZone: selectedShotZone,
        shotDetails: getShotZoneDetails(selectedShotZone)
      },
      t: new Date().toISOString()
    };
    
    await add('events', event);
    events.push(event);
    renderEvents();
    
    const zoneText = getShotZoneText(selectedShotZone);
    const actionText = currentShotType.includes('M') ? 'ANOTÓ' : 'FALLÓ';
    const pointsText = currentShotType.includes('3') ? '3PT' : '2PT';
    
    showNotification(`${actionText} ${pointsText} desde ${zoneText} - #${activePlayer.number} ${activePlayer.name}`);
    
    closeShotModal();
    
  } catch (error) {
    console.error('Error registrando tiro:', error);
    showNotification('Error al registrar el tiro');
  }
}

// Obtener detalles de la zona
function getShotZoneDetails(zone) {
  const zoneDetails = {
    'esquina-izq': { name: 'Esquina Izquierda', position: 'corner', side: 'left' },
    'ala-izq': { name: 'Ala Izquierda', position: 'wing', side: 'left' },
    'centro': { name: 'Centro', position: 'center', side: 'center' },
    'ala-der': { name: 'Ala Derecha', position: 'wing', side: 'right' },
    'esquina-der': { name: 'Esquina Derecha', position: 'corner', side: 'right' },
    'pintura': { name: 'Pintura', position: 'paint', side: 'center' },
    'pinturam': { name: 'Pintura Media', position: 'paint', side: 'center' },
    'pinta': { name: 'Pinta', position: 'paint', side: 'center' }
  };
  
  return zoneDetails[zone] || { name: 'Desconocido', position: 'unknown', side: 'unknown' };
}

// Obtener texto de la zona
function getShotZoneText(zone) {
  const zoneTexts = {
    'esquina-izq': 'Esquina Izquierda',
    'ala-izq': 'Ala Izquierda',
    'centro': 'Centro',
    'ala-der': 'Ala Derecha',
    'esquina-der': 'Esquina Derecha',
    'pintura': 'Pintura',
    'pinturam': 'Pintura Media',
    'pinta': 'Pinta'
  };
  
  return zoneTexts[zone] || 'Zona desconocida';
}

// Renderizar eventos
function renderEvents() {
  if (!eventsContainer) return;
  
  if (events.length === 0) {
    eventsContainer.innerHTML = '<div style="color: var(--color-text-secondary); text-align: center;">No hay eventos</div>';
    return;
  }
  
  const sortedEvents = [...events].sort((a, b) => new Date(b.t) - new Date(a.t));
  
  eventsContainer.innerHTML = sortedEvents.map(event => {
    const time = new Date(event.t).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let description = '';
    if (event.type === 'SUB') {
      const outPlayer = players.find(p => p.id === event.payload.out);
      const inPlayer = players.find(p => p.id === event.payload.in);
      description = `🔄 SUB: Sale #${outPlayer?.number} ${outPlayer?.name}, Entra #${inPlayer?.number} ${inPlayer?.name}`;
    } else {
      const actionNames = {
        '2PM': '🎯 Canasta 2PT',
        '2PA': '🏀 Fallo 2PT',
        '3PM': '🎯 Canasta 3PT',
        '3PA': '🏀 Fallo 3PT',
        'FTM': '🎯 Tiro libre anotado',
        'FTA': '🏀 Tiro libre fallado',
        'OREB': '🔄 Rebote ofensivo',
        'DREB': '🔄 Rebote defensivo',
        'AST': '🤝 Asistencia',
        'STL': '✋ Robo',
        'BLK': '🚫 Bloqueo',
        'TOV': '❌ Pérdida',
        'PF': '🟨 Falta personal'
      };
      
      const actionName = actionNames[event.type] || event.type;
      const playerInfo = `#${event.payload.playerNumber} ${event.payload.playerName}`;
      
      if (event.payload.shotZone) {
        const zoneName = getShotZoneText(event.payload.shotZone);
        description = `${actionName} - ${playerInfo} (${zoneName})`;
      } else {
        description = `${actionName} - ${playerInfo}`;
      }
    }
    
    return `
      <div class="event-item">
        <span class="event-quarter">Q${event.q}</span>
        ${description}
        <span style="color: var(--color-text-secondary); font-size: 0.8rem; float: right;">${time}</span>
      </div>
    `;
  }).join('');
}

// Seleccionar cuarto
function selectQuarter(quarter) {
  currentQuarter = quarter;
  updateQuarterSelector();
  if (game) {
    game.currentQuarter = quarter;
    put('games', game);
  }
}

// Actualizar selector de cuartos
function updateQuarterSelector() {
  document.querySelectorAll('.quarter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.quarter) === currentQuarter) {
      btn.classList.add('active');
    }
  });
}

// SUSTITUCIONES
function openSubstitutionsModal() {
  if (onCourt.length === 0 || bench.length === 0) {
    alert('No se pueden realizar sustituciones');
    return;
  }
  
  subOut = null;
  subIn = null;
  renderSubstitutionLists();
  
  if (substitutionsModal) {
    if (substitutionsModal.showModal) {
      substitutionsModal.showModal();
    } else {
      substitutionsModal.setAttribute('open', '');
    }
  }
}

function closeSubstitutionsModal() {
  if (substitutionsModal) {
    if (substitutionsModal.close) {
      substitutionsModal.close();
    } else {
      substitutionsModal.removeAttribute('open');
    }
  }
}

function renderSubstitutionLists() {
  if (subOutList) {
    subOutList.innerHTML = onCourt.map(player => `
      <div class="player-item ${subOut?.id === player.id ? 'active' : ''}" 
           onclick="selectSubOut(${player.id})">
        <div class="player-info">
          <div class="player-number">${player.number}</div>
          <div class="player-name">${player.name}</div>
        </div>
        <div style="color: var(--color-text-secondary); font-size: 0.8rem;">
          ${subOut?.id === player.id ? 'SALE' : 'En cancha'}
        </div>
      </div>
    `).join('');
  }
  
  if (subInList) {
    subInList.innerHTML = bench.map(player => `
      <div class="player-item ${subIn?.id === player.id ? 'active' : ''}" 
           onclick="selectSubIn(${player.id})">
        <div class="player-info">
          <div class="player-number">${player.number}</div>
          <div class="player-name">${player.name}</div>
        </div>
        <div style="color: var(--color-text-secondary); font-size: 0.8rem;">
          ${subIn?.id === player.id ? 'ENTRA' : 'Suplente'}
        </div>
      </div>
    `).join('');
  }
  
  updateSubStatus();
}

function selectSubOut(playerId) {
  subOut = onCourt.find(p => p.id === playerId);
  renderSubstitutionLists();
}

function selectSubIn(playerId) {
  subIn = bench.find(p => p.id === playerId);
  renderSubstitutionLists();
}

function updateSubStatus() {
  if (!subStatus) return;
  
  if (!subOut && !subIn) {
    subStatus.innerHTML = '<div class="status">Selecciona jugadores</div>';
  } else if (!subOut) {
    subStatus.innerHTML = '<div class="status">Selecciona quién sale</div>';
  } else if (!subIn) {
    subStatus.innerHTML = '<div class="status">Selecciona quién entra</div>';
  } else {
    subStatus.innerHTML = `
      <div class="status success">
        Sale: #${subOut.number} ${subOut.name} → 
        Entra: #${subIn.number} ${subIn.name}
      </div>
    `;
  }
  
  if (confirmSubBtn) {
    confirmSubBtn.disabled = !(subOut && subIn);
  }
}

async function confirmSubstitution() {
  if (!subOut || !subIn) return;
  
  try {
    const event = {
      gameId: gameId,
      q: currentQuarter,
      type: 'SUB',
      payload: {
        out: subOut.id,
        in: subIn.id
      },
      t: new Date().toISOString()
    };
    
    await add('events', event);
    events.push(event);
    
    applySub(subOut.id, subIn.id, true);
    
    if (activePlayer?.id === subOut.id) {
      activePlayer = null;
      if (activePlayerDisplay) {
        activePlayerDisplay.innerHTML = '<div style="color: var(--color-text-secondary);">Selecciona un jugador</div>';
      }
    }
    
    renderAll();
    closeSubstitutionsModal();
    showNotification(`🔄 SUB: Sale #${subOut.number} ${subOut.name}, Entra #${subIn.number} ${subIn.name}`);
    
  } catch (error) {
    console.error('Error en sustitución:', error);
    showNotification('Error al realizar la sustitución');
  }
}

function applySub(outId, inId, updateActiveButtons = true) {
  const outPlayer = onCourt.find(p => p.id === outId);
  const inPlayer = bench.find(p => p.id === inId);
  
  if (outPlayer && inPlayer) {
    onCourt = onCourt.filter(p => p.id !== outId);
    bench = bench.filter(p => p.id !== inId);
    bench.push(outPlayer);
    onCourt.push(inPlayer);
    
    if (updateActiveButtons) {
      updateActionButtons();
    }
  }
}

// Notificaciones
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'quick-notification';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Funciones globales para el HTML
window.selectQuarter = selectQuarter;
window.selectActivePlayer = selectActivePlayer;
window.recordAction = recordAction;
window.openSubstitutionsModal = openSubstitutionsModal;
window.closeSubstitutionsModal = closeSubstitutionsModal;
window.selectSubOut = selectSubOut;
window.selectSubIn = selectSubIn;
window.confirmSubstitution = confirmSubstitution;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.nextQuarter = nextQuarter;
window.endCurrentQuarter = endCurrentQuarter;
window.finishGameManually = finishGameManually;
window.closeGameEndModal = closeGameEndModal;
window.openShotModal = openShotModal;
window.closeShotModal = closeShotModal;
window.selectShotZone = selectShotZone;
window.confirmShotWithZone = confirmShotWithZone;
window.openShotModalPintura = openShotModalPintura;