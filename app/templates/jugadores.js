// jugadores.js - Gestión de jugadores
import { 
  ensurePersistence, 
  getAll, 
  add, 
  del, 
  clear,
  mountBackupToolbar 
} from './app.js';

const MAX_PLAYERS = 17;

// Referencias DOM
const playerForm = document.getElementById('player-form');
const playersList = document.getElementById('players-list');
const playerCounter = document.getElementById('player-counter');
const statusMessage = document.getElementById('status-message');
const emptyMessage = document.getElementById('empty-message');
const clearAllBtn = document.getElementById('clear-all-btn');
const backupHost = document.getElementById('backup-host');

let players = [];

// Inicializar página
document.addEventListener('DOMContentLoaded', async () => {
  await ensurePersistence();
  await loadPlayers();
  mountBackupToolbar(backupHost);
  
  playerForm.addEventListener('submit', handleAddPlayer);
});

// Cargar jugadores desde IndexedDB
async function loadPlayers() {
  try {
    players = await getAll('players');
    renderPlayers();
    updateCounter();
  } catch (error) {
    console.error('Error cargando jugadores:', error);
    showStatus('Error al cargar jugadores', 'error');
  }
}

// Renderizar lista de jugadores
function renderPlayers() {
  if (players.length === 0) {
    playersList.style.display = 'none';
    emptyMessage.style.display = 'block';
    clearAllBtn.disabled = true;
    return;
  }
  
  playersList.style.display = 'block';
  emptyMessage.style.display = 'none';
  clearAllBtn.disabled = false;
  
  // Ordenar por número
  const sortedPlayers = [...players].sort((a, b) => a.number - b.number);
  
  playersList.innerHTML = sortedPlayers.map(player => `
    <div class="player-item">
      <div class="player-info">
        <div class="player-number">${player.number}</div>
        <div class="player-name">${player.name}</div>
      </div>
      <button class="btn danger" onclick="removePlayer(${player.id})">
        Eliminar
      </button>
    </div>
  `).join('');
}

// Actualizar contador
function updateCounter() {
  playerCounter.textContent = `Jugadores: ${players.length}/${MAX_PLAYERS}`;
  
  // Deshabilitar formulario si se alcanzó el límite
  const nameInput = document.getElementById('player-name');
  const numberInput = document.getElementById('player-number');
  const submitBtn = playerForm.querySelector('button[type="submit"]');
  
  if (players.length >= MAX_PLAYERS) {
    nameInput.disabled = true;
    numberInput.disabled = true;
    submitBtn.disabled = true;
    showStatus(`Límite alcanzado: máximo ${MAX_PLAYERS} jugadores`, 'error');
  } else {
    nameInput.disabled = false;
    numberInput.disabled = false;
    submitBtn.disabled = false;
  }
}

// Manejar envío del formulario
async function handleAddPlayer(e) {
  e.preventDefault();
  
  const formData = new FormData(playerForm);
  const name = formData.get('name').trim();
  const number = parseInt(formData.get('number'));
  
  // Validaciones
  if (!validatePlayerData(name, number)) {
    return;
  }
  
  try {
    const newPlayer = { name, number };
    const id = await add('players', newPlayer);
    
    // Agregar a la lista local con el ID asignado
    players.push({ ...newPlayer, id });
    
    renderPlayers();
    updateCounter();
    playerForm.reset();
    showStatus('Jugador agregado exitosamente', 'success');
    
  } catch (error) {
    console.error('Error agregando jugador:', error);
    if (error.name === 'ConstraintError') {
      showStatus('Error: Ya existe un jugador con ese número', 'error');
    } else {
      showStatus('Error al agregar jugador', 'error');
    }
  }
}

// Validar datos del jugador
function validatePlayerData(name, number) {
  // Validar nombre
  if (name.length < 2) {
    showStatus('El nombre debe tener al menos 2 letras', 'error');
    return false;
  }
  
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
    showStatus('El nombre solo puede contener letras y espacios', 'error');
    return false;
  }
  
  // Validar número
  if (isNaN(number) || number < 0 || number > 99) {
    showStatus('El número debe estar entre 0 y 99', 'error');
    return false;
  }
  
  // Verificar número único
  if (players.some(player => player.number === number)) {
    showStatus('Ya existe un jugador con ese número', 'error');
    return false;
  }
  
  // Verificar límite de jugadores
  if (players.length >= MAX_PLAYERS) {
    showStatus(`No se pueden agregar más de ${MAX_PLAYERS} jugadores`, 'error');
    return false;
  }
  
  return true;
}

// Eliminar jugador
async function removePlayer(id) {
  if (!confirm('¿Estás seguro de eliminar este jugador?')) {
    return;
  }
  
  try {
    await del('players', id);
    players = players.filter(player => player.id !== id);
    
    renderPlayers();
    updateCounter();
    showStatus('Jugador eliminado', 'success');
    
  } catch (error) {
    console.error('Error eliminando jugador:', error);
    showStatus('Error al eliminar jugador', 'error');
  }
}

// Limpiar todos los jugadores
async function clearAllPlayers() {
  if (!confirm('¿Estás seguro de eliminar TODOS los jugadores? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    await clear('players');
    players = [];
    
    renderPlayers();
    updateCounter();
    showStatus('Todos los jugadores eliminados', 'success');
    
  } catch (error) {
    console.error('Error limpiando jugadores:', error);
    showStatus('Error al eliminar jugadores', 'error');
  }
}

// Mostrar mensaje de estado
function showStatus(message, type) {
  statusMessage.className = `status ${type}`;
  statusMessage.textContent = message;
  statusMessage.style.display = 'block';
  
  // Auto-ocultar después de 3 segundos
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// Hacer funciones globales para los onclick
window.removePlayer = removePlayer;
window.clearAllPlayers = clearAllPlayers;