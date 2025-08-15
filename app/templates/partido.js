// partido.js - Configuración de partido
import { 
  ensurePersistence, 
  getAll, 
  add,
  mountBackupToolbar 
} from './app.js';

// Referencias DOM
const gameForm = document.getElementById('game-form');
const statusMessage = document.getElementById('status-message');
const startersModal = document.getElementById('starters-modal');
const modalPlayersList = document.getElementById('modal-players-list');
const startersDisplay = document.getElementById('starters-display');
const startersCount = document.getElementById('starters-count');
const startGameBtn = document.getElementById('start-game-btn');
const confirmStartersBtn = document.getElementById('confirm-starters-btn');
const modalStatus = document.getElementById('modal-status');
const playersSummary = document.getElementById('players-summary');
const playersInfo = document.getElementById('players-info');
const backupHost = document.getElementById('backup-host');

let players = [];
let selectedStarters = [];
let gameData = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', async () => {
  await ensurePersistence();
  await loadPlayers();
  mountBackupToolbar(backupHost);
  
  gameForm.addEventListener('submit', handleSaveGameData);
  
  // Establecer fecha actual por defecto
  document.getElementById('date').valueAsDate = new Date();
});

// Cargar jugadores
async function loadPlayers() {
  try {
    players = await getAll('players');
    updatePlayersInfo();
    updateStartGameButton();
  } catch (error) {
    console.error('Error cargando jugadores:', error);
    showStatus('Error al cargar jugadores', 'error');
  }
}

// Actualizar información de jugadores
function updatePlayersInfo() {
  if (players.length === 0) {
    playersInfo.style.display = 'block';
    playersSummary.innerHTML = `
      <div class="status error">
        No hay jugadores registrados. 
        <a href="jugadores.html" style="color: var(--color-secondary);">Registra jugadores</a> 
        antes de configurar un partido.
      </div>
    `;
    return;
  }
  
  if (players.length < 5) {
    playersInfo.style.display = 'block';
    playersSummary.innerHTML = `
      <div class="status error">
        Se necesitan al menos 5 jugadores para formar una quinteta inicial. 
        Actualmente tienes ${players.length} jugador${players.length !== 1 ? 'es' : ''}.
        <a href="jugadores.html" style="color: var(--color-secondary);">Agregar más jugadores</a>
      </div>
    `;
    return;
  }
  
  playersInfo.style.display = 'block';
  const sortedPlayers = [...players].sort((a, b) => a.number - b.number);
  
  playersSummary.innerHTML = `
    <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">
      ${players.length} jugadores disponibles
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem;">
      ${sortedPlayers.map(player => `
        <div style="background: var(--color-bg); padding: 0.5rem; border-radius: 4px; text-align: center;">
          <span style="color: var(--color-secondary); font-weight: bold;">#${player.number}</span>
          <div style="font-size: 0.9rem;">${player.name}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// Manejar guardado de datos del partido
async function handleSaveGameData(e) {
  e.preventDefault();
  
  const formData = new FormData(gameForm);
  gameData = {
    opponent: formData.get('opponent').trim(),
    homeaway: formData.get('homeaway'),
    venue: formData.get('venue').trim() || null,
    date: formData.get('date')
  };
  
  showStatus('Datos del partido guardados. Ahora selecciona la quinteta inicial.', 'success');
  updateStartGameButton();
}

// Abrir modal de selección de titulares
function openStartersModal() {
  if (players.length < 5) {
    showStatus('Se necesitan al menos 5 jugadores registrados', 'error');
    return;
  }
  
  renderModalPlayers();
  
  // Usar showModal si está disponible, sino usar atributo open
  if (startersModal.showModal) {
    startersModal.showModal();
  } else {
    startersModal.setAttribute('open', '');
  }
}

// Cerrar modal
function closeStartersModal() {
  if (startersModal.close) {
    startersModal.close();
  } else {
    startersModal.removeAttribute('open');
  }
}

// Renderizar jugadores en modal
function renderModalPlayers() {
  const sortedPlayers = [...players].sort((a, b) => a.number - b.number);
  
  modalPlayersList.innerHTML = sortedPlayers.map(player => {
    const isSelected = selectedStarters.includes(player.id);
    const isDisabled = !isSelected && selectedStarters.length >= 5;
    
    return `
      <div class="player-item">
        <div class="player-info">
          <div class="player-number">${player.number}</div>
          <div class="player-name">${player.name}</div>
        </div>
        <label style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox" 
                 value="${player.id}" 
                 ${isSelected ? 'checked' : ''} 
                 ${isDisabled ? 'disabled' : ''}
                 onchange="handleStarterSelection(this, ${player.id})">
          <span style="color: var(--color-text-secondary);">
            ${isSelected ? 'Titular' : 'Suplente'}
          </span>
        </label>
      </div>
    `;
  }).join('');
  
  updateModalStatus();
}

// Manejar selección de titular
function handleStarterSelection(checkbox, playerId) {
  if (checkbox.checked) {
    if (selectedStarters.length < 5) {
      selectedStarters.push(playerId);
    } else {
      checkbox.checked = false;
      return;
    }
  } else {
    selectedStarters = selectedStarters.filter(id => id !== playerId);
  }
  
  renderModalPlayers();
}

// Actualizar estado del modal
function updateModalStatus() {
  const count = selectedStarters.length;
  
  if (count === 0) {
    modalStatus.innerHTML = '<div class="status">Selecciona 5 jugadores para la quinteta inicial</div>';
  } else if (count < 5) {
    modalStatus.innerHTML = `<div class="status">Selecciona ${5 - count} jugador${5 - count !== 1 ? 'es' : ''} más</div>`;
  } else if (count === 5) {
    modalStatus.innerHTML = '<div class="status success">Quinteta completa. Puedes confirmar la selección.</div>';
  }
  
  confirmStartersBtn.disabled = count !== 5;
}

// Confirmar selección de titulares
function confirmStarters() {
  if (selectedStarters.length !== 5) {
    return;
  }
  
  updateStartersDisplay();
  closeStartersModal();
  updateStartGameButton();
  showStatus('Quinteta inicial confirmada', 'success');
}

// Actualizar display de titulares
function updateStartersDisplay() {
  startersCount.textContent = selectedStarters.length;
  
  if (selectedStarters.length === 0) {
    startersDisplay.innerHTML = '<div style="color: var(--color-text-secondary); text-align: center; width: 100%;">No hay titulares seleccionados</div>';
    return;
  }
  
  const starterPlayers = selectedStarters.map(id => 
    players.find(p => p.id === id)
  ).filter(Boolean);
  
  // Ordenar por número
  starterPlayers.sort((a, b) => a.number - b.number);
  
  startersDisplay.innerHTML = starterPlayers.map(player => 
    `<div class="chip">#${player.number} ${player.name}</div>`
  ).join('');
}

// Actualizar botón de iniciar partido
function updateStartGameButton() {
  const hasGameData = gameData && gameData.opponent && gameData.homeaway && gameData.date;
  const hasStarters = selectedStarters.length === 5;
  
  startGameBtn.disabled = !(hasGameData && hasStarters);
  
  if (!hasGameData) {
    startGameBtn.textContent = 'Completa los datos del partido';
  } else if (!hasStarters) {
    startGameBtn.textContent = 'Selecciona quinteta inicial';
  } else {
    startGameBtn.textContent = 'Iniciar Partido';
  }
}

// Iniciar partido
async function startGame() {
  if (!gameData || selectedStarters.length !== 5) {
    showStatus('Completa todos los datos antes de iniciar', 'error');
    return;
  }
  
  try {
    const game = {
      ...gameData,
      starters: selectedStarters,
      status: 'EN_CURSO',
      currentQuarter: 1,
      createdAt: new Date().toISOString()
    };
    
    const gameId = await add('games', game);
    
    // Redirigir a live con el ID del partido
    window.location.href = `live.html?gameId=${gameId}`;
    
  } catch (error) {
    console.error('Error iniciando partido:', error);
    showStatus('Error al iniciar el partido', 'error');
  }
}

// Mostrar mensaje de estado
function showStatus(message, type) {
  statusMessage.className = `status ${type}`;
  statusMessage.textContent = message;
  statusMessage.style.display = 'block';
  
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// Hacer funciones globales para onclick
window.openStartersModal = openStartersModal;
window.closeStartersModal = closeStartersModal;
window.handleStarterSelection = handleStarterSelection;
window.confirmStarters = confirmStarters;
window.startGame = startGame;