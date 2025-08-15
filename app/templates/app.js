// app.js - Persistencia con IndexedDB y Backup/Restore

const DB_NAME = 'statsbasket_local';
const DB_VERSION = 1;

let db = null;

// Inicializar IndexedDB
export async function ensurePersistence() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // Store players
      if (!db.objectStoreNames.contains('players')) {
        const playerStore = db.createObjectStore('players', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        playerStore.createIndex('number', 'number', { unique: true });
      }
      
      // Store games
      if (!db.objectStoreNames.contains('games')) {
        const gameStore = db.createObjectStore('games', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
      }
      
      // Store events
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        eventStore.createIndex('gameId', 'gameId');
      }
    };
  });
}

// Agregar nuevo registro
export async function add(storeName, data) {
  await ensurePersistence();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Actualizar registro existente
export async function put(storeName, data) {
  await ensurePersistence();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Obtener todos los registros
export async function getAll(storeName) {
  await ensurePersistence();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Obtener un registro por ID
export async function getById(storeName, id) {
  await ensurePersistence();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Eliminar registro
export async function del(storeName, id) {
  await ensurePersistence();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Limpiar store completo
export async function clear(storeName) {
  await ensurePersistence();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Guardar en store (add o put automático)
export async function store(storeName, data) {
  try {
    if (data.id) {
      return await put(storeName, data);
    } else {
      return await add(storeName, data);
    }
  } catch (error) {
    console.error(`Error storing in ${storeName}:`, error);
    throw error;
  }
}

// BACKUP Y RESTORE

// Exportar todos los datos a JSON
export async function exportJSON() {
  try {
    const [players, games, events] = await Promise.all([
      getAll('players'),
      getAll('games'),
      getAll('events')
    ]);
    
    const data = {
      players,
      games,
      events,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statsbasket-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Backup exportado exitosamente');
  } catch (error) {
    console.error('Error al exportar backup:', error);
    alert('Error al exportar backup. Ver consola para detalles.');
  }
}

// Importar datos desde archivo JSON
export async function importJSON(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validar estructura básica
    if (!data.players || !data.games || !data.events) {
      throw new Error('Archivo JSON inválido - faltan stores requeridos');
    }
    
    // Limpiar stores existentes
    await Promise.all([
      clear('players'),
      clear('games'),
      clear('events')
    ]);
    
    // Importar datos
    const promises = [];
    
    // Importar players
    data.players.forEach(player => {
      promises.push(store('players', player));
    });
    
    // Importar games
    data.games.forEach(game => {
      promises.push(store('games', game));
    });
    
    // Importar events
    data.events.forEach(event => {
      promises.push(store('events', event));
    });
    
    await Promise.all(promises);
    
    console.log('Backup restaurado exitosamente');
    alert('Backup restaurado exitosamente. La página se recargará.');
    
    // Recargar página para reflejar cambios
    window.location.reload();
    
  } catch (error) {
    console.error('Error al importar backup:', error);
    alert('Error al importar backup. Verifica que el archivo sea válido.');
  }
}

// Montar toolbar de backup en un elemento host
export function mountBackupToolbar(hostElement) {
  const toolbar = document.createElement('div');
  toolbar.className = 'backup-toolbar';
  
  // Botón de backup
  const backupBtn = document.createElement('button');
  backupBtn.className = 'btn secondary';
  backupBtn.textContent = 'Backup JSON';
  backupBtn.onclick = exportJSON;
  
  // Input file oculto
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (confirm('¿Estás seguro? Esto reemplazará todos los datos actuales.')) {
        importJSON(file);
      }
    }
    // Limpiar input para permitir seleccionar el mismo archivo again
    e.target.value = '';
  };
  
  // Botón de restore
  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'btn ghost';
  restoreBtn.textContent = 'Restaurar JSON';
  restoreBtn.onclick = () => fileInput.click();
  
  toolbar.appendChild(backupBtn);
  toolbar.appendChild(restoreBtn);
  toolbar.appendChild(fileInput);
  
  hostElement.appendChild(toolbar);
  
  return toolbar;
}