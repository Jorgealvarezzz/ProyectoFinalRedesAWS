// reportes.js - Sistema de reportes con descarga automática de PDF
import { 
  ensurePersistence, 
  getAll, 
  getById,
  del,
  clear,
  mountBackupToolbar 
} from './app.js';

// Referencias DOM
const gameSelector = document.getElementById('game-selector');
const gameInfoCard = document.getElementById('game-info-card');
const gameTitle = document.getElementById('game-title');
const gameDetails = document.getElementById('game-details');
const coachingInsights = document.getElementById('coaching-insights');
const shotAnalysis = document.getElementById('shot-analysis');
const startersStats = document.getElementById('starters-stats');
const benchStats = document.getElementById('bench-stats');
const teamTotals = document.getElementById('team-totals');
const quarterStats = document.getElementById('quarter-stats');
const gameTimeline = document.getElementById('game-timeline');
const backToLive = document.getElementById('back-to-live');
const backupHost = document.getElementById('backup-host');

// Estado global
let games = [];
let players = [];
let events = [];
let selectedGame = null;
let isManagementMode = false;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📊 Iniciando sistema de reportes');
  
  try {
    await ensurePersistence();
    await loadData();
    
    if (backupHost) {
      mountBackupToolbar(backupHost);
    }
    
    // Verificar si viene de un partido específico
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    if (gameId) {
      selectGame(parseInt(gameId));
    }
    
    console.log('✅ Reportes iniciado correctamente');
  } catch (error) {
    console.error('❌ Error iniciando reportes:', error);
  }
});

// Cargar datos
async function loadData() {
  try {
    [games, players, events] = await Promise.all([
      getAll('games'),
      getAll('players'),
      getAll('events')
    ]);
    
    console.log('Datos cargados:', { 
      games: games.length, 
      players: players.length, 
      events: events.length 
    });
    
    renderGameSelector();
  } catch (error) {
    console.error('Error cargando datos:', error);
    showNotification('Error cargando datos', 'error');
  }
}

// Renderizar selector de partidos
function renderGameSelector() {
  if (!gameSelector) return;

  if (games.length === 0) {
    gameSelector.innerHTML = `
      <div class="status">
        No hay partidos registrados. 
        <a href="partido.html" style="color: var(--color-secondary);">Crear nuevo partido</a>
      </div>
    `;
    return;
  }
  
  // Ordenar por fecha (más reciente primero)
  const sortedGames = [...games].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  gameSelector.innerHTML = `
    <div class="games-grid">
      ${sortedGames.map(game => {
        const gameEvents = events.filter(e => e.gameId === game.id);
        const hasStats = gameEvents.length > 0;
        
        return `
          <div class="game-card ${!hasStats ? 'no-stats' : ''}" 
               onclick="selectGame(${game.id})">
            <div class="game-card-header">
              <h3>${game.homeaway} vs ${game.opponent}</h3>
              <div class="game-date">
                ${new Date(game.date).toLocaleDateString('es-ES')}
              </div>
            </div>
            
            <div class="game-card-info">
              ${game.venue ? `<div class="game-venue">📍 ${game.venue}</div>` : ''}
              <div class="game-status ${game.status?.toLowerCase() || 'sin_empezar'}">
                ${getStatusText(game.status)}
              </div>
            </div>
            
            <div class="game-card-stats">
              ${hasStats ? `${gameEvents.length} eventos registrados` : 'Sin estadísticas'}
            </div>
            
            ${isManagementMode ? `
              <div class="game-card-actions">
                <button class="btn danger" onclick="event.stopPropagation(); deleteGame(${game.id})">
                  🗑️ Eliminar
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Obtener texto del estado
function getStatusText(status) {
  const statusTexts = {
    'EN_CURSO': 'En curso',
    'FINALIZADO': 'Completado',
    'PAUSADO': 'Pausado'
  };
  return statusTexts[status] || 'Sin empezar';
}

// Seleccionar partido
function selectGame(gameId) {
  selectedGame = games.find(g => g.id === gameId);
  if (!selectedGame) {
    console.error('Partido no encontrado:', gameId);
    return;
  }
  
  // Filtrar eventos del partido
  const gameEvents = events.filter(e => e.gameId === gameId);
  console.log('Eventos del partido:', gameEvents.length);
  
  if (gameEvents.length === 0) {
    showNotification('Este partido no tiene estadísticas registradas', 'warning');
    hideAllSections();
    return;
  }
  
  renderGameInfo();
  generateCompleteReport(gameEvents);
  
  // Mostrar botón para volver al partido si está en curso
  if (selectedGame.status === 'EN_CURSO' && backToLive) {
    backToLive.style.display = 'inline-block';
    backToLive.href = `live.html?gameId=${gameId}`;
  } else if (backToLive) {
    backToLive.style.display = 'none';
  }
}

// Renderizar información del partido
function renderGameInfo() {
  if (!gameInfoCard || !selectedGame) return;
  
  gameInfoCard.style.display = 'block';
  
  const date = new Date(selectedGame.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  if (gameTitle) {
    gameTitle.textContent = `${selectedGame.homeaway} vs ${selectedGame.opponent}`;
  }
  
  if (gameDetails) {
    gameDetails.innerHTML = `
      <div class="game-meta-grid">
        <div><strong>Fecha:</strong> ${date}</div>
        <div><strong>Modalidad:</strong> ${selectedGame.homeaway}</div>
        ${selectedGame.venue ? `<div><strong>Lugar:</strong> ${selectedGame.venue}</div>` : ''}
        <div><strong>Estado:</strong> ${getStatusText(selectedGame.status)}</div>
      </div>
    `;
  }
}

// Generar reporte completo
function generateCompleteReport(gameEvents) {
  console.log('Generando reporte completo...');
  
  const playerStats = calculatePlayerStats(gameEvents);
  const shotAnalysisData = calculateShotAnalysis(gameEvents);
  const hotStreakData = calculateHotStreaks(gameEvents);
  const quarterBreakdown = calculateQuarterStats(gameEvents);
  const insights = generateCoachingInsights(shotAnalysisData, hotStreakData);
  
  renderCoachingInsights(insights);
  renderShotAnalysis(shotAnalysisData); // <- ahora pinta en el DOM
  renderBoxScore(playerStats);
  renderQuarterStats(quarterBreakdown);
  renderTimeline(gameEvents);
  
  // Mostrar todas las secciones
  [coachingInsights, shotAnalysis, startersStats, benchStats, teamTotals, quarterStats, gameTimeline]
    .forEach(el => { if (el) el.style.display = 'block'; });
}

// Calcular estadísticas de jugadores
function calculatePlayerStats(gameEvents) {
  const playerStats = {};
  const starters = (selectedGame?.starters || []);

  // Inicializar stats para jugadores que participaron
  players.forEach(player => {
    if (starters.includes(player.id) || 
        gameEvents.some(e => e.payload?.playerId === player.id)) {
      playerStats[player.id] = {
        player,
        isStarter: starters.includes(player.id),
        minutes: 0,
        fg2_made: 0, fg2_att: 0,
        fg3_made: 0, fg3_att: 0,
        ft_made: 0, ft_att: 0,
        oreb: 0, dreb: 0,
        ast: 0, stl: 0, blk: 0, tov: 0, pf: 0,
        plusMinus: 0,
        points: 0
      };
    }
  });
  
  // Procesar eventos
  gameEvents.forEach(event => {
    const playerId = event.payload?.playerId;
    if (!playerId || !playerStats[playerId]) return;
    
    const stats = playerStats[playerId];
    
    switch (event.type) {
      case '2PM':
        stats.fg2_made++; stats.fg2_att++; stats.points += 2; break;
      case '2PA':
        stats.fg2_att++; break;
      case '3PM':
        stats.fg3_made++; stats.fg3_att++; stats.points += 3; break;
      case '3PA':
        stats.fg3_att++; break;
      case 'FTM':
        stats.ft_made++; stats.ft_att++; stats.points += 1; break;
      case 'FTA':
        stats.ft_att++; break;
      case 'OREB':
        stats.oreb++; break;
      case 'DREB':
        stats.dreb++; break;
      case 'AST':
        stats.ast++; break;
      case 'STL':
        stats.stl++; break;
      case 'BLK':
        stats.blk++; break;
      case 'TOV':
        stats.tov++; break;
      case 'PF':
        stats.pf++; break;
    }
  });
  
  return playerStats;
}

// Calcular análisis de tiros
function calculateShotAnalysis(gameEvents) {
  const shotEvents = gameEvents.filter(e => 
    ['2PM', '2PA', '3PM', '3PA'].includes(e.type) && e.payload?.shotZone
  );
  
  const zoneStats = {};
  
  // Zonas disponibles
  const availableZones = [
    'esquina-izq', 'ala-izq', 'centro', 'ala-der', 'esquina-der', 'pintura'
  ];
  
  // Inicializar zonas
  availableZones.forEach(zone => {
    zoneStats[zone] = {
      zone,
      name: getZoneDisplayName(zone),
      made2: 0, att2: 0,
      made3: 0, att3: 0,
      totalMade: 0, totalAtt: 0
    };
  });
  
  // Procesar tiros
  shotEvents.forEach(event => {
    const zone = event.payload.shotZone;
    const isMade = event.type.includes('M');
    const is3pt = event.type.includes('3');
    
    if (!zoneStats[zone]) return;
    
    if (is3pt) {
      zoneStats[zone].att3++;
      if (isMade) zoneStats[zone].made3++;
    } else {
      zoneStats[zone].att2++;
      if (isMade) zoneStats[zone].made2++;
    }
    
    zoneStats[zone].totalAtt++;
    if (isMade) zoneStats[zone].totalMade++;
  });
  
  // Calcular porcentajes
  Object.values(zoneStats).forEach(zone => {
    zone.pct2 = zone.att2 > 0 ? (zone.made2 / zone.att2 * 100) : 0;
    zone.pct3 = zone.att3 > 0 ? (zone.made3 / zone.att3 * 100) : 0;
    zone.totalPct = zone.totalAtt > 0 ? (zone.totalMade / zone.totalAtt * 100) : 0;
  });
  
  // Encontrar mejor y peor zona
  const qualifiedZones = Object.values(zoneStats).filter(z => z.totalAtt >= 3);
  const bestZone = qualifiedZones.reduce((best, zone) => 
    !best || zone.totalPct > best.totalPct ? zone : best, null);
  const worstZone = qualifiedZones.reduce((worst, zone) => 
    !worst || zone.totalPct < worst.totalPct ? zone : worst, null);
  
  return {
    zones: zoneStats,
    bestZone,
    worstZone,
    shotEvents
  };
}

// Calcular rachas calientes
function calculateHotStreaks(gameEvents) {
  const shotEvents = gameEvents.filter(e => 
    ['2PM', '2PA', '3PM', '3PA'].includes(e.type)
  ).sort((a, b) => new Date(a.t) - new Date(b.t));
  
  const playerStreaks = {};
  
  shotEvents.forEach(event => {
    const playerId = event.payload.playerId;
    const isMade = event.type.includes('M');
    
    if (!playerStreaks[playerId]) {
      playerStreaks[playerId] = {
        player: players.find(p => p.id === playerId),
        recentShots: [],
        currentStreak: 0,
        hotStreak: false
      };
    }
    
    const streak = playerStreaks[playerId];
    streak.recentShots.push({ made: isMade, type: event.type });
    
    // Mantener solo últimos 5 tiros
    if (streak.recentShots.length > 5) {
      streak.recentShots.shift();
    }
    
    // Calcular si está en racha (3+ de últimos 4)
    if (streak.recentShots.length >= 4) {
      const last4 = streak.recentShots.slice(-4);
      const made4 = last4.filter(s => s.made).length;
      streak.hotStreak = made4 >= 3;
    }
  });
  
  const hotPlayers = Object.values(playerStreaks)
    .filter(p => p.hotStreak && p.recentShots.length >= 3);
  
  return { playerStreaks, hotPlayers };
}

// Calcular estadísticas por cuarto
function calculateQuarterStats(gameEvents) {
  const quarterData = { 1: {}, 2: {}, 3: {}, 4: {} };
  
  [1, 2, 3, 4].forEach(q => {
    const qEvents = gameEvents.filter(e => e.q === q);
    
    quarterData[q] = {
      points: 0,
      fg2_made: qEvents.filter(e => e.type === '2PM').length,
      fg2_att: qEvents.filter(e => ['2PM', '2PA'].includes(e.type)).length,
      fg3_made: qEvents.filter(e => e.type === '3PM').length,
      fg3_att: qEvents.filter(e => ['3PM', '3PA'].includes(e.type)).length,
      rebounds: qEvents.filter(e => ['OREB', 'DREB'].includes(e.type)).length,
      assists: qEvents.filter(e => e.type === 'AST').length,
      steals: qEvents.filter(e => e.type === 'STL').length,
      blocks: qEvents.filter(e => e.type === 'BLK').length,
      turnovers: qEvents.filter(e => e.type === 'TOV').length,
      fouls: qEvents.filter(e => e.type === 'PF').length
    };
    
    // Calcular puntos
    quarterData[q].points = 
      (qEvents.filter(e => e.type === '2PM').length * 2) +
      (qEvents.filter(e => e.type === '3PM').length * 3) +
      qEvents.filter(e => e.type === 'FTM').length;
  });
  
  return quarterData;
}

// Generar insights para coaching
function generateCoachingInsights(shotData, hotStreakData) {
  const insights = {
    critical: [],
    opportunities: [],
    tactical: []
  };
  
  const { zones, bestZone, worstZone } = shotData;
  const { hotPlayers } = hotStreakData;
  
  // Análisis crítico
  Object.values(zones).forEach(zone => {
    if (zone.totalAtt >= 5 && zone.totalPct < 25) {
      insights.critical.push({
        message: `Muy mal desde ${zone.name}: ${zone.totalPct.toFixed(1)}% en ${zone.totalAtt} intentos`,
        action: `EVITAR tiros desde ${zone.name}. Buscar mejores selecciones.`
      });
    }
  });
  
  // Oportunidades
  Object.values(zones).forEach(zone => {
    if (zone.totalAtt >= 4 && zone.totalPct >= 60) {
      insights.opportunities.push({
        message: `¡${zone.name} está caliente! ${zone.totalPct.toFixed(1)}% en ${zone.totalAtt} intentos`,
        action: `EXPLOTAR ${zone.name}. Diseñar jugadas para esta zona.`
      });
    }
  });
  
  // Jugadores en racha
  hotPlayers.forEach(player => {
    const recentMakes = player.recentShots.filter(s => s.made).length;
    const recentAttempts = player.recentShots.length;
    insights.opportunities.push({
      message: `#${player.player.number} ${player.player.name} está en racha: ${recentMakes}/${recentAttempts}`,
      action: `BUSCAR a #${player.player.number}. Darle más tiros.`
    });
  });
  
  // Mejor zona infrautilizada
  if (bestZone && bestZone.totalAtt < 6 && bestZone.totalPct >= 50) {
    insights.opportunities.push({
      message: `${bestZone.name} es nuestra mejor zona (${bestZone.totalPct.toFixed(1)}%) pero solo ${bestZone.totalAtt} intentos`,
      action: `AUMENTAR tiros desde ${bestZone.name}. Diseñar más jugadas.`
    });
  }
  
  return insights;
}

// Renderizar insights de coaching
function renderCoachingInsights(insights) {
  if (!coachingInsights) return;
  
  const insightsContainer = document.getElementById('insights-container');
  if (!insightsContainer) return;
  
  if (insights.critical.length === 0 && insights.opportunities.length === 0 && insights.tactical.length === 0) {
    insightsContainer.innerHTML = '<div style="color: var(--color-text-secondary);">Sin insights disponibles</div>';
    return;
  }
  
  insightsContainer.innerHTML = `
    ${insights.critical.length > 0 ? `
      <div class="insight-category critical">
        <h3>🚨 CRÍTICO - Acción inmediata</h3>
        ${insights.critical.map(insight => `
          <div class="insight-item critical">
            <div class="insight-text">${insight.message}</div>
            <div class="insight-action">${insight.action}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    ${insights.opportunities.length > 0 ? `
      <div class="insight-category opportunities">
        <h3>🎯 OPORTUNIDADES - Explotar fortalezas</h3>
        ${insights.opportunities.map(insight => `
          <div class="insight-item opportunity">
            <div class="insight-text">${insight.message}</div>
            <div class="insight-action">${insight.action}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    ${insights.tactical.length > 0 ? `
      <div class="insight-category tactical">
        <h3>📋 TÁCTICO - Ajustes recomendados</h3>
        ${insights.tactical.map(insight => `
          <div class="insight-item tactical">
            <div class="insight-text">${insight.message}</div>
            <div class="insight-action">${insight.action}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

// Renderizar análisis de tiros (FIX: ahora actualiza el DOM)
function renderShotAnalysis(shotData) {
  if (!shotAnalysis) return;
  
  const { zones, bestZone, worstZone } = shotData;
  
  // Calcular totales para 2PT y 3PT
  const total2Made = Object.values(zones).reduce((sum, zone) => sum + zone.made2, 0);
  const total2Att = Object.values(zones).reduce((sum, zone) => sum + zone.att2, 0);
  const total3Made = Object.values(zones).reduce((sum, zone) => sum + zone.made3, 0);
  const total3Att = Object.values(zones).reduce((sum, zone) => sum + zone.att3, 0);
  
  const twoPointPct = total2Att > 0 ? (total2Made / total2Att * 100) : 0;
  const threePointPct = total3Att > 0 ? (total3Made / total3Att * 100) : 0;

  // Actualizar resumen
  const elements = {
    'two-point-percentage': `${twoPointPct.toFixed(1)}%`,
    'two-point-detail': `${total2Made}/${total2Att}`,
    'three-point-percentage': `${threePointPct.toFixed(1)}%`,
    'three-point-detail': `${total3Made}/${total3Att}`,
    'best-zone-name': bestZone ? bestZone.name : '-',
    'best-zone-stat': bestZone ? `${bestZone.totalPct.toFixed(1)}%` : '0%',
    'worst-zone-name': worstZone ? worstZone.name : '-',
    'worst-zone-stat': worstZone ? `${worstZone.totalPct.toFixed(1)}%` : '0%'
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
  
  // Renderizar desglose por zonas
  const zonesBreakdown = document.getElementById('zones-breakdown');
  if (zonesBreakdown) {
    zonesBreakdown.innerHTML = Object.values(zones).map(zone => {
      const efficiency = zone.totalAtt > 0 ? zone.totalPct : 0;
      const efficiencyClass = efficiency >= 50 ? 'excellent' : efficiency >= 40 ? 'good' : efficiency >= 30 ? 'average' : 'poor';
      
      return `
        <div class="zone-breakdown-card ${efficiencyClass}">
          <h4>${zone.name}</h4>
          <div class="zone-overall">
            <div class="zone-pct">${zone.totalPct.toFixed(1)}%</div>
            <div class="zone-attempts">${zone.totalMade}/${zone.totalAtt}</div>
          </div>
          <div class="zone-details">
            <div class="zone-detail-row">
              <span>2PT:</span>
              <span>${zone.att2 > 0 ? `${zone.pct2.toFixed(1)}% (${zone.made2}/${zone.att2})` : '-'}</span>
            </div>
            <div class="zone-detail-row">
              <span>3PT:</span>
              <span>${zone.att3 > 0 ? `${zone.pct3.toFixed(1)}% (${zone.made3}/${zone.att3})` : '-'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Renderizar mapa de calor
  renderCourtHeatmap(zones);

  // Mostrar sección
  shotAnalysis.style.display = 'block';
}

// Renderizar mapa de calor
function renderCourtHeatmap(zones) {
  const heatmapContainer = document.getElementById('court-heatmap');
  if (!heatmapContainer) return;
  
  heatmapContainer.innerHTML = `
    <div class="court-zones">
      ${Object.values(zones).map(zone => {
        const efficiency = zone.totalAtt > 0 ? zone.totalPct : 0;
        const heatLevel = getHeatLevel(efficiency);
        
        return `
          <div class="court-zone ${zone.zone} heat-${heatLevel}" 
               title="${zone.name}: ${efficiency.toFixed(1)}% (${zone.totalMade}/${zone.totalAtt})">
            <div class="zone-label">${zone.name.split(' ')[0]}</div>
            <div class="zone-stat">${efficiency.toFixed(1)}%</div>
            <div class="zone-attempts">${zone.totalMade}/${zone.totalAtt}</div>
          </div>
        `;
      }).join('')}
    </div>
    
    <div class="heat-legend">
      <div class="legend-item">
        <div class="heat-sample heat-5"></div>
        <span>Excelente (≥50%)</span>
      </div>
      <div class="legend-item">
        <div class="heat-sample heat-4"></div>
        <span>Bueno (40-49%)</span>
      </div>
      <div class="legend-item">
        <div class="heat-sample heat-3"></div>
        <span>Regular (30-39%)</span>
      </div>
      <div class="legend-item">
        <div class="heat-sample heat-2"></div>
        <span>Malo (20-29%)</span>
      </div>
      <div class="legend-item">
        <div class="heat-sample heat-1"></div>
        <span>Muy malo (&lt;20%)</span>
      </div>
    </div>
  `;
}

// Obtener nivel de calor
function getHeatLevel(efficiency) {
  if (efficiency >= 50) return 5;
  if (efficiency >= 40) return 4;
  if (efficiency >= 30) return 3;
  if (efficiency >= 20) return 2;
  return 1;
}

// Verificar si html2pdf está disponible
function checkHtml2PdfAvailability() {
  if (typeof html2pdf === 'undefined') {
    console.error('html2pdf no está disponible');
    showNotification('Error: Librería PDF no cargada. Recarga la página.', 'error');
    return false;
  }
  return true;
}

// Renderizar box score
function renderBoxScore(playerStats) {
  const starters = Object.values(playerStats).filter(s => s.isStarter);
  const bench = Object.values(playerStats).filter(s => !s.isStarter);
  
  renderStatsTable('starters-table', starters);
  renderStatsTable('bench-table', bench);
  renderTeamTotals(Object.values(playerStats));
}

// Renderizar tabla de estadísticas
function renderStatsTable(tableId, playersData) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  tbody.innerHTML = playersData.map(stat => {
    const fg2Pct = stat.fg2_att > 0 ? (stat.fg2_made / stat.fg2_att * 100).toFixed(1) : '0.0';
    const fg3Pct = stat.fg3_att > 0 ? (stat.fg3_made / stat.fg3_att * 100).toFixed(1) : '0.0';
    const ftPct = stat.ft_att > 0 ? (stat.ft_made / stat.ft_att * 100).toFixed(1) : '0.0';
    const totalReb = stat.oreb + stat.dreb;
    
    return `
      <tr>
        <td class="player-cell">
          <div class="player-info">
            <div class="player-number">${stat.player.number}</div>
            <div class="player-name">${stat.player.name}</div>
          </div>
        </td>
        <td>${stat.minutes}</td>
        <td>${stat.fg2_made}/${stat.fg2_att}</td>
        <td>${fg2Pct}%</td>
        <td>${stat.fg3_made}/${stat.fg3_att}</td>
        <td>${fg3Pct}%</td>
        <td>${stat.ft_made}/${stat.ft_att}</td>
        <td>${ftPct}%</td>
        <td>${stat.oreb}</td>
        <td>${stat.dreb}</td>
        <td>${totalReb}</td>
        <td>${stat.ast}</td>
        <td>${stat.stl}</td>
        <td>${stat.blk}</td>
        <td>${stat.tov}</td>
        <td>${stat.pf}</td>
        <td>${stat.plusMinus}</td>
        <td class="points-cell">${stat.points}</td>
      </tr>
    `;
  }).join('');
}

// Renderizar totales del equipo
function renderTeamTotals(allStats) {
  const table = document.getElementById('team-table');
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  const totals = allStats.reduce((acc, stat) => ({
    fg2_made: acc.fg2_made + stat.fg2_made,
    fg2_att: acc.fg2_att + stat.fg2_att,
    fg3_made: acc.fg3_made + stat.fg3_made,
    fg3_att: acc.fg3_att + stat.fg3_att,
    ft_made: acc.ft_made + stat.ft_made,
    ft_att: acc.ft_att + stat.ft_att,
    oreb: acc.oreb + stat.oreb,
    dreb: acc.dreb + stat.dreb,
    ast: acc.ast + stat.ast,
    stl: acc.stl + stat.stl,
    blk: acc.blk + stat.blk,
    tov: acc.tov + stat.tov,
    pf: acc.pf + stat.pf,
    points: acc.points + stat.points
  }), {
    fg2_made: 0, fg2_att: 0, fg3_made: 0, fg3_att: 0,
    ft_made: 0, ft_att: 0, oreb: 0, dreb: 0,
    ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, points: 0
  });
  
  const fg2Pct = totals.fg2_att > 0 ? (totals.fg2_made / totals.fg2_att * 100).toFixed(1) : '0.0';
  const fg3Pct = totals.fg3_att > 0 ? (totals.fg3_made / totals.fg3_att * 100).toFixed(1) : '0.0';
  const ftPct = totals.ft_att > 0 ? (totals.ft_made / totals.ft_att * 100).toFixed(1) : '0.0';
  const totalReb = totals.oreb + totals.dreb;
  
  tbody.innerHTML = `
    <tr class="team-totals-row">
      <td class="player-cell"><strong>EQUIPO</strong></td>
      <td>-</td>
      <td><strong>${totals.fg2_made}/${totals.fg2_att}</strong></td>
      <td><strong>${fg2Pct}%</strong></td>
      <td><strong>${totals.fg3_made}/${totals.fg3_att}</strong></td>
      <td><strong>${fg3Pct}%</strong></td>
      <td><strong>${totals.ft_made}/${totals.ft_att}</strong></td>
      <td><strong>${ftPct}%</strong></td>
      <td><strong>${totals.oreb}</strong></td>
      <td><strong>${totals.dreb}</strong></td>
      <td><strong>${totalReb}</strong></td>
      <td><strong>${totals.ast}</strong></td>
      <td><strong>${totals.stl}</strong></td>
      <td><strong>${totals.blk}</strong></td>
      <td><strong>${totals.tov}</strong></td>
      <td><strong>${totals.pf}</strong></td>
      <td><strong>-</strong></td>
      <td class="points-cell"><strong>${totals.points}</strong></td>
    </tr>
  `;
}

// Renderizar estadísticas por cuarto
function renderQuarterStats(quarterData) {
  [1, 2, 3, 4].forEach(q => {
    const container = document.getElementById(`q${q}-stats`);
    if (!container) return;
    
    const data = quarterData[q];
    
    if (Object.values(data).every(val => val === 0)) {
      container.innerHTML = '<div class="no-stats">Sin actividad</div>';
      return;
    }
    
    const fg2Pct = data.fg2_att > 0 ? (data.fg2_made / data.fg2_att * 100).toFixed(1) : '0.0';
    const fg3Pct = data.fg3_att > 0 ? (data.fg3_made / data.fg3_att * 100).toFixed(1) : '0.0';
    
    container.innerHTML = `
      <div class="quarter-stat">
        <span class="stat-label">Puntos</span>
        <span class="stat-value">${data.points}</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">FG 2PT</span>
        <span class="stat-value">${data.fg2_made}/${data.fg2_att} (${fg2Pct}%)</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">FG 3PT</span>
        <span class="stat-value">${data.fg3_made}/${data.fg3_att} (${fg3Pct}%)</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">Rebotes</span>
        <span class="stat-value">${data.rebounds}</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">Asistencias</span>
        <span class="stat-value">${data.assists}</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">Robos</span>
        <span class="stat-value">${data.steals}</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">Bloqueos</span>
        <span class="stat-value">${data.blocks}</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">Pérdidas</span>
        <span class="stat-value">${data.turnovers}</span>
      </div>
      <div class="quarter-stat">
        <span class="stat-label">Faltas</span>
        <span class="stat-value">${data.fouls}</span>
      </div>
    `;
  });
}

// Renderizar timeline
function renderTimeline(gameEvents) {
  const timelineContent = document.getElementById('timeline-content');
  if (!timelineContent) return;
  
  if (gameEvents.length === 0) {
    timelineContent.innerHTML = '<div class="no-events">No hay eventos registrados</div>';
    return;
  }
  
  // Agrupar por cuarto
  const eventsByQuarter = {};
  [1, 2, 3, 4].forEach(q => {
    eventsByQuarter[q] = gameEvents.filter(e => e.q === q)
      .sort((a, b) => new Date(b.t) - new Date(a.t));
  });
  
  timelineContent.innerHTML = [1, 2, 3, 4].map(q => {
    const qEvents = eventsByQuarter[q];
    
    if (qEvents.length === 0) {
      return `
        <div class="quarter-timeline">
          <h4>Cuarto ${q}</h4>
          <div class="no-events">Sin eventos</div>
        </div>
      `;
    }
    
    return `
      <div class="quarter-timeline">
        <h4>Cuarto ${q}</h4>
        <div class="timeline-events">
          ${qEvents.map(event => {
            const time = new Date(event.t).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
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
                const zoneName = getZoneDisplayName(event.payload.shotZone);
                description = `${actionName} - ${playerInfo} (${zoneName})`;
              } else {
                description = `${actionName} - ${playerInfo}`;
              }
            }
            
            return `
              <div class="timeline-event">
                <div class="event-time">${time}</div>
                <div class="event-description">${description}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Obtener nombre de zona para mostrar
function getZoneDisplayName(zone) {
  const zoneNames = {
    'esquina-izq': 'Esquina Izquierda',
    'ala-izq': 'Ala Izquierda',
    'centro': 'Centro',
    'ala-der': 'Ala Derecha',
    'esquina-der': 'Esquina Derecha',
    'pintura': 'Pintura'
  };
  return zoneNames[zone] || zone;
}

// EXPORTACIÓN A PDF CON DESCARGA AUTOMÁTICA
async function exportPDF() {
  if (!selectedGame) {
    showNotification('Selecciona un partido primero', 'warning');
    return;
  }
  
  showNotification('Generando PDF...', 'info');
  
  try {
    // Preparar contenido para PDF
    const pdfContainer = document.getElementById('pdf-content');
    if (!pdfContainer) {
      console.error('Contenedor PDF no encontrado');
      printReport();
      return;
    }
    
    // Crear contenido optimizado para PDF
    const pdfContent = createPDFContent();
    pdfContainer.innerHTML = pdfContent;
    pdfContainer.style.display = 'block';
    pdfContainer.style.width = '210mm';
    pdfContainer.style.padding = '20px';
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    
    // Limpiar nombre del rival para el archivo
    const cleanOpponent = selectedGame.opponent.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const cleanHomeaway = selectedGame.homeaway.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const dateStr = new Date(selectedGame.date).toISOString().split('T')[0];
    
    // Nombre del archivo
    const fileName = `${cleanHomeaway}_vs_${cleanOpponent}_${dateStr}`;
    
    // Verificar si html2pdf está disponible
    if (typeof html2pdf !== 'undefined') {
      // Usar html2pdf si está disponible
      const options = {
        margin: [15, 10, 15, 10],
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        },
        pagebreak: { mode: 'avoid-all' }
      };
      
      await html2pdf()
        .set(options)
        .from(pdfContainer)
        .save();
        
      showNotification(`PDF "${fileName}.pdf" descargado correctamente`, 'success');
      
    } else if (typeof jsPDF !== 'undefined') {
      // Fallback con jsPDF básico
      const pdf = new jsPDF.jsPDF('p', 'mm', 'a4');
      
      // Agregar contenido texto básico
      pdf.setFontSize(16);
      pdf.text(`${selectedGame.homeaway} vs ${selectedGame.opponent}`, 20, 30);
      pdf.setFontSize(12);
      pdf.text(`Fecha: ${new Date(selectedGame.date).toLocaleDateString('es-ES')}`, 20, 45);
      pdf.text('Reporte generado por StatsBasket', 20, 60);
      
      // Guardar
      pdf.save(`${fileName}.pdf`);
      showNotification(`PDF básico "${fileName}.pdf" descargado`, 'success');
      
    } else {
      // Fallback final: abrir ventana de impresión
      console.warn('Librerías PDF no disponibles, usando impresión');
      printReport();
      return;
    }
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    showNotification('Error al generar PDF. Usando impresión...', 'warning');
    printReport();
  } finally {
    // Limpiar contenedor PDF
    const pdfContainer = document.getElementById('pdf-content');
    if (pdfContainer) {
      pdfContainer.style.display = 'none';
      pdfContainer.innerHTML = '';
    }
  }
}

// Crear contenido HTML para PDF
function createPDFContent() {
  const gameEvents = events.filter(e => e.gameId === selectedGame.id);
  const playerStats = calculatePlayerStats(gameEvents);
  const shotData = calculateShotAnalysis(gameEvents);
  const quarterData = calculateQuarterStats(gameEvents);
  const insights = generateCoachingInsights(shotData, calculateHotStreaks(gameEvents));
  
  const date = new Date(selectedGame.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const allStats = Object.values(playerStats);
  const starters = allStats.filter(s => s.isStarter);
  const bench = allStats.filter(s => !s.isStarter);
  
  return `
    <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d22b2b; padding-bottom: 20px;">
        <h1 style="color: #d22b2b; font-size: 24px; margin-bottom: 10px;">🏀 GALLOS AGUASCALIENTES</h1>
        <h2 style="color: #f2b64a; font-size: 18px; margin-bottom: 5px;">${selectedGame.homeaway} vs ${selectedGame.opponent}</h2>
        <div style="color: #666; font-size: 14px;">
          ${date}${selectedGame.venue ? ` • ${selectedGame.venue}` : ''} • ${getStatusText(selectedGame.status)}
        </div>
      </div>

      <!-- Insights -->
      ${generateInsightsPDFSection(insights)}
      
      <!-- Análisis de tiros -->
      ${generateShotAnalysisPDFSection(shotData)}
      
      <!-- Box Score Titulares -->
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <h3 style="color: #d22b2b; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">📋 TITULARES</h3>
        ${generateStatsTablePDF(starters)}
      </div>
      
      <!-- Box Score Suplentes -->
      ${bench.length > 0 ? `
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <h3 style="color: #d22b2b; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">📋 SUPLENTES</h3>
          ${generateStatsTablePDF(bench)}
        </div>
      ` : ''}
      
      <!-- Totales del equipo -->
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <h3 style="color: #d22b2b; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">📊 TOTALES DEL EQUIPO</h3>
        ${generateTeamTotalsPDF(allStats)}
      </div>
      
      <!-- Estadísticas por cuarto -->
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <h3 style="color: #d22b2b; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">📈 ESTADÍSTICAS POR CUARTO</h3>
        ${generateQuarterStatsPDF(quarterData)}
      </div>
      
      <!-- Footer -->
      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
        Reporte generado por StatsBasket • ${new Date().toLocaleString('es-ES')}
      </div>
    </div>
  `;
}

// Generar tabla de estadísticas para PDF
function generateStatsTablePDF(playersData) {
  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
      <thead>
        <tr style="background: #d22b2b; color: white;">
          <th style="padding: 8px 4px; text-align: left; font-weight: bold; font-size: 9px;">JUGADOR</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">MIN</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">FG</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">%2PT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">3P</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">%3PT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">FT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">%FT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">OREB</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">DREB</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">REB</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">AST</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">STL</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">BLK</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">TOV</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">PF</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">+/-</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">PTS</th>
        </tr>
      </thead>
      <tbody>
        ${playersData.map(stat => {
          const fg2Pct = stat.fg2_att > 0 ? (stat.fg2_made / stat.fg2_att * 100).toFixed(1) : '0.0';
          const fg3Pct = stat.fg3_att > 0 ? (stat.fg3_made / stat.fg3_att * 100).toFixed(1) : '0.0';
          const ftPct = stat.ft_att > 0 ? (stat.ft_made / stat.ft_att * 100).toFixed(1) : '0.0';
          const totalReb = stat.oreb + stat.dreb;
          
          return `
            <tr style="border: 1px solid #ddd;">
              <td style="padding: 6px 4px; text-align: left; font-weight: 500;">#${stat.player.number} ${stat.player.name}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.minutes}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.fg2_made}/${stat.fg2_att}</td>
              <td style="padding: 6px 4px; text-align: center;">${fg2Pct}%</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.fg3_made}/${stat.fg3_att}</td>
              <td style="padding: 6px 4px; text-align: center;">${fg3Pct}%</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.ft_made}/${stat.ft_att}</td>
              <td style="padding: 6px 4px; text-align: center;">${ftPct}%</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.oreb}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.dreb}</td>
              <td style="padding: 6px 4px; text-align: center;">${totalReb}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.ast}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.stl}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.blk}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.tov}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.pf}</td>
              <td style="padding: 6px 4px; text-align: center;">${stat.plusMinus}</td>
              <td style="padding: 6px 4px; text-align: center; background: #f2b64a; font-weight: bold;">${stat.points}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Generar totales del equipo para PDF
function generateTeamTotalsPDF(allStats) {
  const totals = allStats.reduce((acc, stat) => ({
    fg2_made: acc.fg2_made + stat.fg2_made,
    fg2_att: acc.fg2_att + stat.fg2_att,
    fg3_made: acc.fg3_made + stat.fg3_made,
    fg3_att: acc.fg3_att + stat.fg3_att,
    ft_made: acc.ft_made + stat.ft_made,
    ft_att: acc.ft_att + stat.ft_att,
    oreb: acc.oreb + stat.oreb,
    dreb: acc.dreb + stat.dreb,
    ast: acc.ast + stat.ast,
    stl: acc.stl + stat.stl,
    blk: acc.blk + stat.blk,
    tov: acc.tov + stat.tov,
    pf: acc.pf + stat.pf,
    points: acc.points + stat.points
  }), {
    fg2_made: 0, fg2_att: 0, fg3_made: 0, fg3_att: 0,
    ft_made: 0, ft_att: 0, oreb: 0, dreb: 0,
    ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, points: 0
  });
  
  const fg2Pct = totals.fg2_att > 0 ? (totals.fg2_made / totals.fg2_att * 100).toFixed(1) : '0.0';
  const fg3Pct = totals.fg3_att > 0 ? (totals.fg3_made / totals.fg3_att * 100).toFixed(1) : '0.0';
  const ftPct = totals.ft_att > 0 ? (totals.ft_made / totals.ft_att * 100).toFixed(1) : '0.0';
  const totalReb = totals.oreb + totals.dreb;
  
  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      <thead>
        <tr style="background: #d22b2b; color: white;">
          <th style="padding: 8px 4px; text-align: left; font-weight: bold; font-size: 9px;">TOTALES</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">MIN</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">FG</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">%2PT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">3P</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">%3PT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">FT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">%FT</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">OREB</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">DREB</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">REB</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">AST</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">STL</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">BLK</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">TOV</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">PF</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">+/-</th>
          <th style="padding: 8px 4px; text-align: center; font-weight: bold; font-size: 9px;">PTS</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #f5f5f5; font-weight: bold; border: 1px solid #ddd;">
          <td style="padding: 6px 4px; text-align: left;"><strong>EQUIPO</strong></td>
          <td style="padding: 6px 4px; text-align: center;">-</td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.fg2_made}/${totals.fg2_att}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${fg2Pct}%</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.fg3_made}/${totals.fg3_att}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${fg3Pct}%</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.ft_made}/${totals.ft_att}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${ftPct}%</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.oreb}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.dreb}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totalReb}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.ast}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.stl}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.blk}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.tov}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>${totals.pf}</strong></td>
          <td style="padding: 6px 4px; text-align: center;"><strong>-</strong></td>
          <td style="padding: 6px 4px; text-align: center; background: #f2b64a; font-weight: bold;"><strong>${totals.points}</strong></td>
        </tr>
      </tbody>
    </table>
  `;
}

// Generar estadísticas por cuarto para PDF
function generateQuarterStatsPDF(quarterData) {
  return `
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
      ${[1, 2, 3, 4].map(q => {
        const data = quarterData[q];
        
        if (Object.values(data).every(val => val === 0)) {
          return `
            <div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; text-align: center;">
              <h4 style="color: #f2b64a; margin-bottom: 8px; font-size: 12px;">Cuarto ${q}</h4>
              <div style="text-align: center; color: #666; font-style: italic;">Sin actividad</div>
            </div>
          `;
        }
        
        const fg2Pct = data.fg2_att > 0 ? (data.fg2_made / data.fg2_att * 100).toFixed(1) : '0.0';
        const fg3Pct = data.fg3_att > 0 ? (data.fg3_made / data.fg3_att * 100).toFixed(1) : '0.0';
        
        return `
          <div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px;">
            <h4 style="color: #f2b64a; margin-bottom: 8px; font-size: 12px; text-align: center;">Cuarto ${q}</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9px;">
              <span>Puntos</span>
              <span><strong>${data.points}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9px;">
              <span>FG 2PT</span>
              <span>${data.fg2_made}/${data.fg2_att} (${fg2Pct}%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9px;">
              <span>FG 3PT</span>
              <span>${data.fg3_made}/${data.fg3_att} (${fg3Pct}%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9px;">
              <span>Rebotes</span>
              <span>${data.rebounds}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9px;">
              <span>Asistencias</span>
              <span>${data.assists}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9px;">
              <span>Robos</span>
              <span>${data.steals}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px;">
              <span>Pérdidas</span>
              <span>${data.turnovers}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Generar sección de insights para PDF
function generateInsightsPDFSection(insights) {
  if (insights.critical.length === 0 && insights.opportunities.length === 0 && insights.tactical.length === 0) {
    return '';
  }
  
  return `
    <div style="margin-bottom: 25px; page-break-inside: avoid;">
      <h3 style="color: #d22b2b; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">💡 INSIGHTS PARA EL COACH</h3>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
        ${insights.critical.length > 0 ? `
          <h4 style="color: #ef4444; margin-bottom: 10px; font-size: 14px;">🚨 CRÍTICO - Acción inmediata</h4>
          ${insights.critical.map(insight => `
            <div style="margin-bottom: 10px; padding: 8px; border-left: 3px solid #ef4444; background: white; border-radius: 3px;">
              <div style="font-weight: 500; margin-bottom: 3px; font-size: 11px;">${insight.message}</div>
              <div style="font-size: 10px; color: #666; font-style: italic;">${insight.action}</div>
            </div>
          `).join('')}
        ` : ''}
        
        ${insights.opportunities.length > 0 ? `
          <h4 style="color: #22c55e; margin-bottom: 10px; font-size: 14px;">🎯 OPORTUNIDADES - Explotar fortalezas</h4>
          ${insights.opportunities.map(insight => `
            <div style="margin-bottom: 10px; padding: 8px; border-left: 3px solid #22c55e; background: white; border-radius: 3px;">
              <div style="font-weight: 500; margin-bottom: 3px; font-size: 11px;">${insight.message}</div>
              <div style="font-size: 10px; color: #666; font-style: italic;">${insight.action}</div>
            </div>
          `).join('')}
        ` : ''}
      </div>
    </div>
  `;
}

// Generar sección de análisis de tiros para PDF (FIX completa)
function generateShotAnalysisPDFSection(shotData) {
  const { zones, bestZone, worstZone } = shotData;
  
  const total2Made = Object.values(zones).reduce((sum, zone) => sum + zone.made2, 0);
  const total2Att = Object.values(zones).reduce((sum, zone) => sum + zone.att2, 0);
  const total3Made = Object.values(zones).reduce((sum, zone) => sum + zone.made3, 0);
  const total3Att = Object.values(zones).reduce((sum, zone) => sum + zone.att3, 0);
  
  const twoPointPct = total2Att > 0 ? (total2Made / total2Att * 100) : 0;
  const threePointPct = total3Att > 0 ? (total3Made / total3Att * 100) : 0;
  
  return `
    <div style="margin-bottom: 25px; page-break-inside: avoid;">
      <h3 style="color: #d22b2b; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">🎯 ANÁLISIS DE TIROS POR ZONA</h3>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
        <div>
          <strong>2 Puntos:</strong> ${twoPointPct.toFixed(1)}% (${total2Made}/${total2Att})
        </div>
        <div>
          <strong>3 Puntos:</strong> ${threePointPct.toFixed(1)}% (${total3Made}/${total3Att})
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
        <div>
          <strong>Mejor Zona:</strong> ${bestZone ? `${bestZone.name} (${bestZone.totalPct.toFixed(1)}%)` : 'N/A'}
        </div>
        <div>
          <strong>Zona a Mejorar:</strong> ${worstZone ? `${worstZone.name} (${worstZone.totalPct.toFixed(1)}%)` : 'N/A'}
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
        ${Object.values(zones).map(zone => {
          const efficiency = zone.totalAtt > 0 ? zone.totalPct : 0;
          const efficiencyClass = efficiency >= 50 ? '#22c55e' : efficiency >= 40 ? '#84cc16' : efficiency >= 30 ? '#f59e0b' : '#ef4444';
          
          return `
            <div style="border: 1px solid ${efficiencyClass}; border-radius: 5px; padding: 10px; text-align: center;">
              <h4 style="color: #d22b2b; margin-bottom: 5px; font-size: 11px;">${zone.name}</h4>
              <div style="font-size: 18px; font-weight: bold; color: #f2b64a; margin: 5px 0;">${zone.totalPct.toFixed(1)}%</div>
              <div style="font-size: 9px; color: #666;">${zone.totalMade}/${zone.totalAtt} intentos</div>
              ${zone.att2 > 0 ? `<div style="font-size: 9px; margin-top: 5px;">2PT: ${zone.pct2.toFixed(1)}%</div>` : ''}
              ${zone.att3 > 0 ? `<div style="font-size: 9px;">3PT: ${zone.pct3.toFixed(1)}%</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Funciones de notificación
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  `;
  
  // Colores según tipo
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  notification.style.backgroundColor = colors[type] || colors.success;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// FUNCIONES DE GESTIÓN
function toggleGameManagement() {
  isManagementMode = !isManagementMode;
  renderGameSelector();
  showNotification(`Modo gestión ${isManagementMode ? 'activado' : 'desactivado'}`);
}

async function deleteGame(gameId) {
  if (!confirm('¿Eliminar este partido permanentemente?')) return;
  
  try {
    console.log('Eliminando partido:', gameId);
    
    // Eliminar el juego
    await del('games', gameId);
    
    // Eliminar eventos asociados
    const gameEvents = events.filter(e => e.gameId === gameId);
    for (const event of gameEvents) {
      await del('events', event.id);
    }
    
    // Recargar datos
    await loadData();
    
    // Limpiar vista si era el juego seleccionado
    if (selectedGame?.id === gameId) {
      selectedGame = null;
      hideAllSections();
    }
    
    showNotification('Partido eliminado correctamente');
    
  } catch (error) {
    console.error('Error eliminando partido:', error);
    showNotification('Error al eliminar el partido', 'error');
  }
}

async function clearAllGames() {
  if (!confirm('¿Eliminar TODOS los partidos? Esta acción no se puede deshacer.')) return;
  
  try {
    await Promise.all([
      clear('games'),
      clear('events')
    ]);
    
    await loadData();
    selectedGame = null;
    hideAllSections();
    showNotification('Todos los partidos eliminados');
    
  } catch (error) {
    console.error('Error limpiando partidos:', error);
    showNotification('Error al eliminar partidos', 'error');
  }
}

async function deleteCompletedGames() {
  const completedGames = games.filter(g => g.status === 'FINALIZADO');
  
  if (completedGames.length === 0) {
    showNotification('No hay partidos completados para eliminar', 'warning');
    return;
  }
  
  if (!confirm(`¿Eliminar ${completedGames.length} partido(s) completado(s)?`)) return;
  
  try {
    for (const game of completedGames) {
      await del('games', game.id);
      
      const gameEvents = events.filter(e => e.gameId === game.id);
      for (const event of gameEvents) {
        await del('events', event.id);
      }
    }
    
    await loadData();
    
    if (selectedGame && completedGames.some(g => g.id === selectedGame.id)) {
      selectedGame = null;
      hideAllSections();
    }
    
    showNotification(`${completedGames.length} partido(s) completado(s) eliminado(s)`);
    
  } catch (error) {
    console.error('Error eliminando partidos completados:', error);
    showNotification('Error al eliminar partidos completados', 'error');
  }
}

function hideAllSections() {
  [gameInfoCard, coachingInsights, shotAnalysis, startersStats, benchStats, teamTotals, quarterStats, gameTimeline]
    .forEach(el => { if (el) el.style.display = 'none'; });
}

function exportExcel() {
  if (!selectedGame) {
    showNotification('Selecciona un partido primero', 'warning');
    return;
  }
  showNotification('Función de exportación Excel en desarrollo', 'info');
}

function printReport() {
  if (!selectedGame) {
    showNotification('Selecciona un partido primero', 'warning');
    return;
  }
  
  try {
    // Crear ventana de impresión con contenido optimizado
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      showNotification('No se pudo abrir ventana de impresión. Verifica el bloqueador de ventanas.', 'error');
      return;
    }
    
    const pdfContent = createPDFContent();
    
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte - ${selectedGame.homeaway} vs ${selectedGame.opponent}</title>
        <style>
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        ${pdfContent}
      </body>
      </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Esperar a que se cargue y luego imprimir
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
        // Cerrar ventana después de imprimir
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };
    
    showNotification('Abriendo ventana de impresión...', 'info');
    
  } catch (error) {
    console.error('Error en impresión:', error);
    showNotification('Error al imprimir', 'error');
  }
}

// Funciones globales (exponer al scope de la página)
window.selectGame = selectGame;
window.toggleGameManagement = toggleGameManagement;
window.deleteGame = deleteGame;
window.clearAllGames = clearAllGames;
window.deleteCompletedGames = deleteCompletedGames;
window.exportPDF = exportPDF;
window.exportExcel = exportExcel;
window.printReport = printReport;
