import { Player } from './player';
import { Dot, Enemy, Obstacle } from './enemy';
import { io, Socket } from 'socket.io-client';
import { Item } from './item'

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private socket!: Socket;  // Using the definite assignment assertion
  private players: Map<string, Player> = new Map();
  private playerSprite: HTMLImageElement;
  private dots: Dot[] = [];
  private readonly DOT_SIZE = 5;
  private readonly DOT_COUNT = 20;
  // Reduce these values for even slower movement
  private readonly PLAYER_ACCELERATION = 0.2;  // Reduced from 0.5 to 0.2
  private readonly MAX_SPEED = 4;             // Reduced from 8 to 4
  private readonly FRICTION = 0.92;           // Increased friction from 0.95 to 0.92 for even quicker deceleration
  private cameraX = 0;
  private cameraY = 0;
  private readonly WORLD_WIDTH = 10000;  // Increased from 2000 to 10000
  private readonly WORLD_HEIGHT = 2000;  // Keep height the same
  private keysPressed: Set<string> = new Set();
  private enemies: Map<string, Enemy> = new Map();
  private octopusSprite: HTMLImageElement;
  private fishSprite: HTMLImageElement;
  private readonly PLAYER_MAX_HEALTH = 100;
  private readonly ENEMY_MAX_HEALTH: Record<Enemy['tier'], number> = {
      common: 20,
      uncommon: 40,
      rare: 60,
      epic: 80,
      legendary: 100,
      mythic: 150
  };
  private readonly PLAYER_DAMAGE = 10;
  private readonly ENEMY_DAMAGE = 5;
  private readonly DAMAGE_COOLDOWN = 1000; // 1 second cooldown
  private lastDamageTime: number = 0;
  private readonly ENEMY_COLORS = {
      common: '#808080',
      uncommon: '#008000',
      rare: '#0000FF',
      epic: '#800080',
      legendary: '#FFA500',
      mythic: '#FF0000'
  };
  private obstacles: Obstacle[] = [];
  private coralSprite: HTMLImageElement;
  private readonly ENEMY_CORAL_MAX_HEALTH = 50;
  private items: Item[] = [];
  private itemSprites: Record<string, HTMLImageElement> = {};
  private isInventoryOpen: boolean = false;
  private isSinglePlayer: boolean = false;
  private worker: Worker | null = null;
  private gameLoopId: number | null = null;
  private socketHandlers: Map<string, Function> = new Map();
  private readonly BASE_XP_REQUIREMENT = 100;
  private readonly XP_MULTIPLIER = 1.5;
  private readonly MAX_LEVEL = 50;
  private readonly HEALTH_PER_LEVEL = 10;
  private readonly DAMAGE_PER_LEVEL = 2;
  // Add this property to store floating texts
  private floatingTexts: Array<{
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
      alpha: number;
      lifetime: number;
  }> = [];
  // Add enemy size multipliers as a class property
  private readonly ENEMY_SIZE_MULTIPLIERS: Record<Enemy['tier'], number> = {
      common: 1.0,
      uncommon: 1.2,
      rare: 1.4,
      epic: 1.6,
      legendary: 1.8,
      mythic: 2.0
  };
  // Add property to track if player is dead
  private isPlayerDead: boolean = false;
  // Add minimap properties
  private readonly MINIMAP_WIDTH = 200;
  private readonly MINIMAP_HEIGHT = 40;
  private readonly MINIMAP_PADDING = 10;
  // Add decoration-related properties
  private palmSprite: HTMLImageElement;
  private decorations: Array<{
      x: number;
      y: number;
      scale: number;
  }> = [];
  // Add sand property
  private sands: Array<{
      x: number;
      y: number;
      radius: number;
      rotation: number;
  }> = [];
  // Add control mode property
  private useMouseControls: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private showHitboxes: boolean = true;  // Set to true to show hitboxes

  constructor(isSinglePlayer: boolean = false) {
      //console.log('Game constructor called');
      this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
      this.ctx = this.canvas.getContext('2d')!;
      
      // Set initial canvas size
      this.resizeCanvas();
      
      // Add resize listener
      window.addEventListener('resize', () => this.resizeCanvas());
      
      this.isSinglePlayer = isSinglePlayer;

      // Initialize sprites and other resources with relative paths
      this.playerSprite = new Image();
      this.playerSprite.src = './assets/player.png';
      this.playerSprite.onload = () => {
          console.log('Player sprite loaded successfully');
          this.gameLoop();
      };
      this.playerSprite.onerror = (e) => {
          console.error('Error loading player sprite:', e);
      };
      this.octopusSprite = new Image();
      this.octopusSprite.src = './assets/octopus.png';
      this.fishSprite = new Image();
      this.fishSprite.src = './assets/fish.png';
      this.coralSprite = new Image();
      this.coralSprite.src = './assets/coral.png';

      // Load palm sprite
      this.palmSprite = new Image();
      this.palmSprite.src = './assets/palm.png';
      this.palmSprite.onerror = (e) => {
          console.error('Error loading palm sprite:', e);
      };

      this.setupEventListeners();
      this.setupItemSprites();

      // Initialize game mode after resource loading
      if (this.isSinglePlayer) {
          this.initSinglePlayerMode();
      } else {
          this.initMultiPlayerMode();
      }

      // Add respawn button listener
      const respawnButton = document.getElementById('respawnButton');
      respawnButton?.addEventListener('click', () => {
          if (this.isPlayerDead) {
              this.socket.emit('requestRespawn');
          }
      });

      // Add mouse move listener
      this.canvas.addEventListener('mousemove', (event) => {
          if (this.useMouseControls) {
              const rect = this.canvas.getBoundingClientRect();
              this.mouseX = event.clientX - rect.left + this.cameraX;
              this.mouseY = event.clientY - rect.top + this.cameraY;
          }
      });
  }

  private initSinglePlayerMode() {
      console.log('Initializing single player mode');
      try {
          // Create inline worker with the worker code
          const workerBlob = new Blob([`
              // Worker code starts here
              const WORLD_WIDTH = 10000;  // Changed from 2000 to 10000
              const WORLD_HEIGHT = 2000;
              const ENEMY_COUNT = 100;
              const OBSTACLE_COUNT = 20;
              const ENEMY_CORAL_PROBABILITY = 0.3;
              const ENEMY_CORAL_HEALTH = 50;
              const ENEMY_CORAL_DAMAGE = 5;
              const PLAYER_MAX_HEALTH = 100;
              const PLAYER_DAMAGE = 10;
              const ITEM_COUNT = 10;
              const MAX_INVENTORY_SIZE = 5;
              const PLAYER_SIZE = 40;
              const COLLISION_RADIUS = PLAYER_SIZE / 2;
              const ENEMY_SIZE = 40;
              const RESPAWN_INVULNERABILITY_TIME = 3000;
              const KNOCKBACK_FORCE = 20;
              const KNOCKBACK_RECOVERY_SPEED = 0.9;
              const DECORATION_COUNT = 100;  // Number of palms to spawn
              var BASE_XP_REQUIREMENT = 100;
              var XP_MULTIPLIER = 1.5;
              var MAX_LEVEL = 50;
              var HEALTH_PER_LEVEL = 10;
              var DAMAGE_PER_LEVEL = 2;
              var DROP_CHANCES = {
                  common: 0.1, // 10% chance
                  uncommon: 0.2, // 20% chance
                  rare: 0.3, // 30% chance
                  epic: 0.4, // 40% chance
                  legendary: 0.5, // 50% chance
                  mythic: 0.75 // 75% chance
              };

              const ENEMY_TIERS = {
                  common: { health: 20, speed: 0.5, damage: 5, probability: 0.4 },
                  uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3 },
                  rare: { health: 60, speed: 1, damage: 15, probability: 0.15 },
                  epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1 },
                  legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04 },
                  mythic: { health: 150, speed: 2, damage: 30, probability: 0.01 }
              };
              var ZONE_BOUNDARIES = {
                  common: { start: 0, end: 2000 },
                  uncommon: { start: 2000, end: 4000 },
                  rare: { start: 4000, end: 6000 },
                  epic: { start: 6000, end: 8000 },
                  legendary: { start: 8000, end: 9000 },
                  mythic: { start: 9000, end: WORLD_WIDTH }
              };
              var ENEMY_SIZE_MULTIPLIERS = {
                  common: 1.0,
                  uncommon: 1.2,
                  rare: 1.4,
                  epic: 1.6,
                  legendary: 1.8,
                  mythic: 2.0
              };

              const players = {};
              const enemies = [];
              const obstacles = [];
              const items = [];
              const dots = [];
              const decorations = [];
              const sands = [];

              // Helper function to get random position in a specific zone
              function getRandomPositionInZone(zoneIndex) {
                  const zoneWidth = WORLD_WIDTH / 6;  // 6 zones
                  const startX = zoneIndex * zoneWidth;
                  
                  // For legendary and mythic zones, ensure they're in the rightmost areas
                  if (zoneIndex >= 4) {  // Legendary and Mythic zones
                      const adjustedStartX = WORLD_WIDTH - (6 - zoneIndex) * (zoneWidth / 2);  // Start from right side
                      return {
                          x: adjustedStartX + Math.random() * (WORLD_WIDTH - adjustedStartX),
                          y: Math.random() * WORLD_HEIGHT
                      };
                  }
                  
                  return {
                      x: startX + Math.random() * zoneWidth,
                      y: Math.random() * WORLD_HEIGHT
                  };
              }
              function getXPFromEnemy(enemy) {
                  var tierMultipliers = {
                      common: 10,
                      uncommon: 20,
                      rare: 40,
                      epic: 80,
                      legendary: 160,
                      mythic: 320
                  };
                  return tierMultipliers[enemy.tier];
              }
              function addXPToPlayer(player, xp) {
                  if (player.level >= MAX_LEVEL)
                      return;
                  player.xp += xp;
                  while (player.xp >= player.xpToNextLevel && player.level < MAX_LEVEL) {
                      player.xp -= player.xpToNextLevel;
                      player.level++;
                      player.xpToNextLevel = calculateXPRequirement(player.level);
                      handleLevelUp(player);
                  }
                  if (player.level >= MAX_LEVEL) {
                      player.xp = 0;
                      player.xpToNextLevel = 0;
                  }
                  socket.emit('xpGained', {
                      playerId: player.id,
                      xp: xp,
                      totalXp: player.xp,
                      level: player.level,
                      xpToNextLevel: player.xpToNextLevel,
                      maxHealth: player.maxHealth,
                      damage: player.damage
                  });
              }
              function handleLevelUp(player) {
                  player.maxHealth += HEALTH_PER_LEVEL;
                  player.health = player.maxHealth;
                  player.damage += DAMAGE_PER_LEVEL;
                  socket.emit('levelUp', {
                      playerId: player.id,
                      level: player.level,
                      maxHealth: player.maxHealth,
                      damage: player.damage
                  });
              }
              function respawnPlayer(player) {
                  // Determine spawn zone based on player level without losing levels
                  var spawnX;
                  if (player.level <= 5) {
                      spawnX = Math.random() * ZONE_BOUNDARIES.common.end;
                  }
                  else if (player.level <= 10) {
                      spawnX = ZONE_BOUNDARIES.uncommon.start + Math.random() * (ZONE_BOUNDARIES.uncommon.end - ZONE_BOUNDARIES.uncommon.start);
                  }
                  else if (player.level <= 15) {
                      spawnX = ZONE_BOUNDARIES.rare.start + Math.random() * (ZONE_BOUNDARIES.rare.end - ZONE_BOUNDARIES.rare.start);
                  }
                  else if (player.level <= 25) {
                      spawnX = ZONE_BOUNDARIES.epic.start + Math.random() * (ZONE_BOUNDARIES.epic.end - ZONE_BOUNDARIES.epic.start);
                  }
                  else if (player.level <= 40) {
                      spawnX = ZONE_BOUNDARIES.legendary.start + Math.random() * (ZONE_BOUNDARIES.legendary.end - ZONE_BOUNDARIES.legendary.start);
                  }
                  else {
                      spawnX = ZONE_BOUNDARIES.mythic.start + Math.random() * (ZONE_BOUNDARIES.mythic.end - ZONE_BOUNDARIES.mythic.start);
                  }
                  // Reset health and position but keep level and stats
                  player.health = player.maxHealth;
                  player.x = spawnX;
                  player.y = Math.random() * WORLD_HEIGHT;
                  player.score = Math.max(0, player.score - 10); // Still lose some score
                  player.inventory = [];
                  player.isInvulnerable = true;
                  // Just notify about respawn without level loss
                  socket.emit('playerRespawned', player);
                  setTimeout(function () {
                      player.isInvulnerable = false;
                  }, RESPAWN_INVULNERABILITY_TIME);
              }
              function moveEnemies() {
                  if (!enemies || !enemies.length) return;  // Guard against undefined enemies array
                  
                  enemies.forEach(enemy => {
                      if (!enemy) return;  // Guard against undefined enemy objects
                      
                      try {
                          // Apply knockback if it exists
                          if (enemy.knockbackX) {
                              enemy.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
                              enemy.x += enemy.knockbackX;
                              if (Math.abs(enemy.knockbackX) < 0.1) enemy.knockbackX = 0;
                          }
                          if (enemy.knockbackY) {
                              enemy.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
                              enemy.y += enemy.knockbackY;
                              if (Math.abs(enemy.knockbackY) < 0.1) enemy.knockbackY = 0;
                          }

                          // Different movement patterns based on enemy type
                          if (enemy.type === 'octopus') {
                              // Random movement for octopus
                              enemy.x += (Math.random() * 4 - 2) * (enemy.speed || 1);
                              enemy.y += (Math.random() * 4 - 2) * (enemy.speed || 1);
                          } else {
                              // Directional movement for fish
                              enemy.x += Math.cos(enemy.angle || 0) * 2 * (enemy.speed || 1);
                              enemy.y += Math.sin(enemy.angle || 0) * 2 * (enemy.speed || 1);
                          }

                          // Keep enemies in their respective zones
                          const zoneWidth = WORLD_WIDTH / 6;
                          const tierZones = {
                              common: 0,
                              uncommon: 1,
                              rare: 2,
                              epic: 3,
                              legendary: 4,
                              mythic: 5
                          };
                          
                          const zoneIndex = tierZones[enemy.tier] || 0;
                          const zoneStartX = zoneIndex * zoneWidth;
                          const zoneEndX = (zoneIndex + 1) * zoneWidth;
                          
                          // Add some overlap between zones (10% on each side)
                          const overlap = zoneWidth * 0.1;
                          const minX = Math.max(0, zoneStartX - overlap);
                          const maxX = Math.min(WORLD_WIDTH, zoneEndX + overlap);
                          
                          // Constrain enemy position to its zone
                          enemy.x = Math.max(minX, Math.min(maxX, enemy.x));
                          enemy.y = Math.max(0, Math.min(WORLD_HEIGHT, enemy.y));

                          // Randomly change fish direction occasionally
                          if (enemy.type === 'fish' && Math.random() < 0.02) {
                              enemy.angle = Math.random() * Math.PI * 2;
                          }
                      } catch (error) {
                          console.error('Error moving enemy:', error, enemy);
                      }
                  });

                  try {
                      // Filter out any undefined enemies before emitting
                      const validEnemies = enemies.filter(enemy => enemy !== undefined);
                      socket.emit('enemiesUpdate', validEnemies);
                  } catch (error) {
                      console.error('Error emitting enemies update:', error);
                  }
              }

              // Update creation functions to use zones
              function createDecoration() {
                  const zoneIndex = Math.floor(Math.random() * 6);  // 6 zones
                  const pos = getRandomPositionInZone(zoneIndex);
                  return {
                      x: pos.x,
                      y: pos.y,
                      scale: 0.5 + Math.random() * 1.5
                  };
              }

              function createEnemy() {
                  const tierRoll = Math.random();
                  let tier = 'common';
                  let cumulativeProbability = 0;
                  for (const [t, data] of Object.entries(ENEMY_TIERS)) {
                      cumulativeProbability += data.probability;
                      if (tierRoll < cumulativeProbability) {
                          tier = t;
                          break;
                      }
                  }
                  const tierData = ENEMY_TIERS[tier];
                  
                  // Map tiers to specific zones, ensuring legendary and mythic are in the rightmost areas
                  const tierZones = {
                      common: 0,
                      uncommon: 1,
                      rare: 2,
                      epic: 3,
                      legendary: 4,
                      mythic: 5
                  };
                  
                  const pos = getRandomPositionInZone(tierZones[tier]);
                  
                  return {
                      id: Math.random().toString(36).substr(2, 9),
                      type: Math.random() < 0.5 ? 'octopus' : 'fish',
                      tier,
                      x: pos.x,
                      y: pos.y,
                      angle: Math.random() * Math.PI * 2,
                      health: tierData.health,
                      speed: tierData.speed,
                      damage: tierData.damage,
                      knockbackX: 0,
                      knockbackY: 0
                  };
              }

              function createObstacle() {
                  const zoneIndex = Math.floor(Math.random() * 6);
                  const pos = getRandomPositionInZone(zoneIndex);
                  const isEnemy = Math.random() < ENEMY_CORAL_PROBABILITY;
                  return {
                      id: Math.random().toString(36).substr(2, 9),
                      x: pos.x,
                      y: pos.y,
                      width: 50 + Math.random() * 50,
                      height: 50 + Math.random() * 50,
                      type: 'coral',
                      isEnemy,
                      health: isEnemy ? ENEMY_CORAL_HEALTH : undefined
                  };
              }

              function createItem() {
                  const zoneIndex = Math.floor(Math.random() * 6);
                  const pos = getRandomPositionInZone(zoneIndex);
                  return {
                      id: Math.random().toString(36).substr(2, 9),
                      type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
                      x: pos.x,
                      y: pos.y
                  };
              }

              function initializeGame(messageData) {
                  console.log('Initializing game state in worker');
                  
                  // Start player in the first zone (common)
                  players[socket.id] = {
                      id: socket.id,
                      x: WORLD_WIDTH / 12,  // Center of first zone
                      y: WORLD_HEIGHT / 2,
                      angle: 0,
                      score: 0,
                      velocityX: 0,
                      velocityY: 0,
                      health: PLAYER_MAX_HEALTH,
                      inventory: [],
                      isInvulnerable: true,
                      level: 1,
                      xp: 0,
                      xpToNextLevel: 100,
                      maxHealth: PLAYER_MAX_HEALTH,
                      damage: PLAYER_DAMAGE
                  };

                  // Ensure specific number of legendary and mythic enemies
                  const legendaryCount = Math.floor(ENEMY_COUNT * 0.04);  // 4% of total
                  const mythicCount = Math.floor(ENEMY_COUNT * 0.01);     // 1% of total
                  
                  // Spawn legendary enemies
                  for (let i = 0; i < legendaryCount; i++) {
                      const enemy = createEnemy();
                      enemy.tier = 'legendary';
                      const pos = getRandomPositionInZone(4);  // Zone 4 for legendary
                      enemy.x = pos.x;
                      enemy.y = pos.y;
                      enemies.push(enemy);
                  }
                  
                  // Spawn mythic enemies
                  for (let i = 0; i < mythicCount; i++) {
                      const enemy = createEnemy();
                      enemy.tier = 'mythic';
                      const pos = getRandomPositionInZone(5);  // Zone 5 for mythic
                      enemy.x = pos.x;
                      enemy.y = pos.y;
                      enemies.push(enemy);
                  }
                  
                  // Spawn remaining enemies
                  const remainingCount = ENEMY_COUNT - legendaryCount - mythicCount;
                  for (let i = 0; i < remainingCount; i++) {
                      enemies.push(createEnemy());
                  }

                  for (let i = 0; i < OBSTACLE_COUNT; i++) {
                      obstacles.push(createObstacle());
                  }

                  for (let i = 0; i < ITEM_COUNT; i++) {
                      items.push(createItem());
                  }

                  for (let i = 0; i < DECORATION_COUNT; i++) {
                      decorations.push(createDecoration());
                  }

                  // Emit initial state
                  socket.emit('currentPlayers', players);
                  socket.emit('enemiesUpdate', enemies);
                  socket.emit('obstaclesUpdate', obstacles);
                  socket.emit('itemsUpdate', items);
                  socket.emit('decorationsUpdate', decorations);
                  socket.emit('playerMoved', players[socket.id]);
              }

              // Mock Socket class implementation
              class MockSocket {
                  constructor() {
                      this.eventHandlers = new Map();
                      this.id = 'player1';
                  }
                  on(event, handler) {
                      if (!this.eventHandlers.has(event)) {
                          this.eventHandlers.set(event, []);
                      }
                      this.eventHandlers.get(event)?.push(handler);
                  }
                  emit(event, data) {
                      self.postMessage({
                          type: 'socketEvent',
                          event,
                          data
                      });
                  }
                  getId() {
                      return this.id;
                  }
              }

              const socket = new MockSocket();

              // Message handler
              self.onmessage = function(event) {
                  const { type, event: socketEvent, data } = event.data;
                  
                  switch (type) {
                      case 'init':
                          initializeGame(event.data);
                          break;
                      case 'socketEvent':
                          switch (socketEvent) {
              case 'playerMovement':
                  const player = players[socket.id];
                  if (player) {
                      let newX = data.x;
                      let newY = data.y;

                      // Apply knockback to player position if it exists
                      if (player.knockbackX) {
                          player.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
                          newX += player.knockbackX;
                          if (Math.abs(player.knockbackX) < 0.1) player.knockbackX = 0;
                      }
                      if (player.knockbackY) {
                          player.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
                          newY += player.knockbackY;
                          if (Math.abs(player.knockbackY) < 0.1) player.knockbackY = 0;
                      }

                      let collision = false;

                      // Check collision with enemies first
                      for (const enemy of enemies) {
                          const enemySize = ENEMY_SIZE * ENEMY_SIZE_MULTIPLIERS[enemy.tier];
                          
                          if (
                              newX < enemy.x + enemySize &&
                              newX + PLAYER_SIZE > enemy.x &&
                              newY < enemy.y + enemySize &&
                              newY + PLAYER_SIZE > enemy.y
                          ) {
                              collision = true;
                              console.log(enemy);
                              if (true) {
                                  // Enemy damages player
                                  player.health -= enemy.damage;
                                  socket.emit('playerDamaged', { playerId: player.id, health: player.health });

                                  // Player damages enemy
                                  enemy.health -= player.damage;  // Use player.damage instead of PLAYER_DAMAGE
                                  socket.emit('enemyDamaged', { enemyId: enemy.id, health: enemy.health });

                                  // Calculate knockback direction
                                  const dx = enemy.x - newX;
                                  const dy = enemy.y - newY;
                                  const distance = Math.sqrt(dx * dx + dy * dy);
                                  const normalizedDx = dx / distance;
                                  const normalizedDy = dy / distance;

                                  // Apply knockback to player's position immediately
                                  newX -= normalizedDx * KNOCKBACK_FORCE;
                                  newY -= normalizedDy * KNOCKBACK_FORCE;
                                  
                                  // Store knockback for gradual recovery
                                  player.knockbackX = -normalizedDx * KNOCKBACK_FORCE;
                                  player.knockbackY = -normalizedDy * KNOCKBACK_FORCE;

                                  // Check if enemy dies
                                  if (enemy.health <= 0) {
                                      const index = enemies.findIndex(e => e.id === enemy.id);
                                      if (index !== -1) {
                                          // Award XP before removing the enemy
                                          const xpGained = getXPFromEnemy(enemy);
                                          addXPToPlayer(player, xpGained);
                                          
                                          // Check for item drop and add directly to inventory
                                          const dropChance = DROP_CHANCES[enemy.tier];
                                          if (Math.random() < dropChance && player.inventory.length < MAX_INVENTORY_SIZE) {
                                              // Create item and add directly to player's inventory
                                              const newItem = {
                                                  id: Math.random().toString(36).substr(2, 9),
                                                  type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
                                                  x: enemy.x,
                                                  y: enemy.y
                                              };
                                              player.inventory.push(newItem);
                                              
                                              // Notify about item pickup
                                              socket.emit('inventoryUpdate', player.inventory);
                                              socket.emit('itemCollected', { 
                                                  playerId: player.id, 
                                                  itemId: newItem.id,
                                                  itemType: newItem.type 
                                              });
                                          }
                                          
                                          // Remove the dead enemy and create a new one
                                          enemies.splice(index, 1);
                                          socket.emit('enemyDestroyed', enemy.id);
                                          enemies.push(createEnemy());
                                      }
                                  }

                                  // Check if player dies
                                  if (player.health <= 0) {
                                      respawnPlayer(player);
                                      socket.emit('playerDied', player.id);
                                      socket.emit('playerRespawned', player);
                                      return;
                                  }
                              }
                              break;
                          }
                      }

                      // Check collision with obstacles
                      for (const obstacle of obstacles) {
                          if (
                              newX + PLAYER_SIZE > obstacle.x && 
                              newX < obstacle.x + obstacle.width &&
                              newY + PLAYER_SIZE > obstacle.y &&
                              newY < obstacle.y + obstacle.height
                          ) {
                              collision = true;
                              if (obstacle.isEnemy) {
                                  player.health -= ENEMY_CORAL_DAMAGE;
                                  socket.emit('playerDamaged', { playerId: player.id, health: player.health });

                                  if (player.health <= 0) {
                                      respawnPlayer(player);
                                      socket.emit('playerDied', player.id);
                                      socket.emit('playerRespawned', player);
                                      return; // Exit early if player dies
                                  }
                              }
                              break;
                          }
                      }

                      // Update player position
                      // Even if there was a collision, we want to apply the knockback
                      player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, newX));
                      player.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, newY));
                      player.angle = data.angle;
                      player.velocityX = data.velocityX;
                      player.velocityY = data.velocityY;

                      // Always emit the player's position
                      socket.emit('playerMoved', player);
                  }
                  break;

              case 'collectItem':
                  var itemIndex = items.findIndex(function (item) { return item.id === data.itemId; });
                  if (itemIndex !== -1 && players[socket.id].inventory.length < MAX_INVENTORY_SIZE) {
                      var item = items[itemIndex];
                      players[socket.id].inventory.push(item);
                      items.splice(itemIndex, 1);
                      items.push(createItem());
                      socket.emit('itemCollected', { playerId: socket.id, itemId: data.itemId });
                  }
                  break;
              case 'useItem':
                  var playerUsingItem = players[socket.id];
                  var inventoryIndex = playerUsingItem.inventory.findIndex(function (item) { return item.id === data.itemId; });
                  if (inventoryIndex !== -1) {
                      var item = playerUsingItem.inventory[inventoryIndex];
                      playerUsingItem.inventory.splice(inventoryIndex, 1);
                      switch (item.type) {
                          case 'health_potion':
                              playerUsingItem.health = Math.min(playerUsingItem.health + 50, PLAYER_MAX_HEALTH);
                              break;
                          case 'speed_boost':
                              // Implement speed boost
                              break;
                          case 'shield':
                              // Implement shield
                              break;
                      }
                      socket.emit('itemUsed', { playerId: socket.id, itemId: data.itemId });
                  }
                  break;
              case 'requestRespawn':
                  var deadPlayer = players[socket.id];
                  if (deadPlayer) {
                      respawnPlayer(deadPlayer);
                  }
                  break;
              // ... (handle other socket events)
          }
          break;
      }
  };

              // Start enemy movement interval
  setInterval(() => {
      try {
          moveEnemies();
      } catch (error) {
          console.error('Error in moveEnemies interval:', error);
      }
  }, 100);
          `], { type: 'application/javascript' });

          // Create worker from blob
          this.worker = new Worker(URL.createObjectURL(workerBlob));
          
          // Load saved progress
          const savedProgress = this.loadPlayerProgress();
          console.log('Loaded saved progress:', savedProgress);

          // Create mock socket
          const mockSocket = {
              id: 'player1',
              emit: (event: string, data: any) => {
                  console.log('Emitting event:', event, data);
                  this.worker?.postMessage({
                      type: 'socketEvent',
                      event,
                      data
                  });
              },
              on: (event: string, handler: Function) => {
                  console.log('Registering handler for event:', event);
                  this.socketHandlers.set(event, handler);
              },
              disconnect: () => {
                  this.worker?.terminate();
              }
          };

          // Use mock socket
          this.socket = mockSocket as any;

          // Set up socket listeners
          this.setupSocketListeners();

          // Handle worker messages
          this.worker.onmessage = (event) => {
              const { type, event: socketEvent, data } = event.data;
              //console.log('Received message from worker:', type, socketEvent, data);
              
              if (type === 'socketEvent') {
                  const handler = this.socketHandlers.get(socketEvent);
                  if (handler) {
                      handler(data);
                  }
              }
          };

          // Initialize game
          console.log('Sending init message to worker with saved progress');
          this.worker.postMessage({ 
              type: 'init',
              savedProgress
          });

      } catch (error) {
          console.error('Error initializing worker:', error);
      }
  }

  private initMultiPlayerMode() {
      this.socket = io(prompt("Enter the server URL eg https://localhost:3000: \n Join a public server: https://54.151.123.177:3000/") || "", { 
          secure: true,
          rejectUnauthorized: false,
          withCredentials: true
      });
      this.setupSocketListeners();
  }

  private setupSocketListeners() {
      this.socket.on('connect', () => {
          //console.log('Connected to server with ID:', this.socket.id);
      });

      this.socket.on('currentPlayers', (players: Record<string, Player>) => {
          //console.log('Received current players:', players);
          this.players.clear();
          Object.values(players).forEach(player => {
              this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH});
          });
      });

      this.socket.on('newPlayer', (player: Player) => {
          //console.log('New player joined:', player);
          this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH});
      });

      this.socket.on('playerMoved', (player: Player) => {
          //console.log('Player moved:', player);
          const existingPlayer = this.players.get(player.id);
          if (existingPlayer) {
              Object.assign(existingPlayer, player);
      } else {
              this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH});
          }
      });

      this.socket.on('playerDisconnected', (playerId: string) => {
          //console.log('Player disconnected:', playerId);
          this.players.delete(playerId);
      });

      this.socket.on('dotCollected', (data: { playerId: string, dotIndex: number }) => {
          const player = this.players.get(data.playerId);
          if (player) {
              player.score++;
          }
          this.dots.splice(data.dotIndex, 1);
          this.generateDot();
      });

      this.socket.on('enemiesUpdate', (enemies: Enemy[]) => {
          this.enemies.clear();
          enemies.forEach(enemy => this.enemies.set(enemy.id, enemy));
      });

      this.socket.on('enemyMoved', (enemy: Enemy) => {
          this.enemies.set(enemy.id, enemy);
      });

      this.socket.on('playerDamaged', (data: { playerId: string, health: number }) => {
          const player = this.players.get(data.playerId);
          if (player) {
              player.health = data.health;
          }
      });

      this.socket.on('enemyDamaged', (data: { enemyId: string, health: number }) => {
          const enemy = this.enemies.get(data.enemyId);
          if (enemy) {
              enemy.health = data.health;
          }
      });

      this.socket.on('enemyDestroyed', (enemyId: string) => {
          this.enemies.delete(enemyId);
      });

      this.socket.on('obstaclesUpdate', (obstacles: Obstacle[]) => {
          this.obstacles = obstacles;
      });

      this.socket.on('obstacleDamaged', (data: { obstacleId: string, health: number }) => {
          const obstacle = this.obstacles.find(o => o.id === data.obstacleId);
          if (obstacle && obstacle.isEnemy) {
              obstacle.health = data.health;
          }
      });

      this.socket.on('obstacleDestroyed', (obstacleId: string) => {
          const index = this.obstacles.findIndex(o => o.id === obstacleId);
          if (index !== -1) {
              this.obstacles.splice(index, 1);
          }
      });

      this.socket.on('itemsUpdate', (items: Item[]) => {
          this.items = items;
      });

      this.socket.on('itemCollected', (data: { playerId: string, itemId: string }) => {
          this.items = this.items.filter(item => item.id !== data.itemId);
      });

      this.socket.on('inventoryUpdate', (inventory: Item[]) => {
          const socketId = this.socket.id;
          if (socketId) {
              const player = this.players.get(socketId);
              if (player) {
                  player.inventory = inventory;
              }
          }
      });

      this.socket.on('xpGained', (data: { 
          playerId: string; 
          xp: number; 
          totalXp: number; 
          level: number; 
          xpToNextLevel: number;
          maxHealth: number;
          damage: number;
      }) => {
          //console.log('XP gained:', data);  // Add logging
          const player = this.players.get(data.playerId);
          if (player) {
              player.xp = data.totalXp;
              player.level = data.level;
              player.xpToNextLevel = data.xpToNextLevel;
              player.maxHealth = data.maxHealth;
              player.damage = data.damage;
              this.showFloatingText(player.x, player.y - 20, '+' + data.xp + ' XP', '#32CD32', 16);
              this.savePlayerProgress(player);
          }
      });

      this.socket.on('levelUp', (data: {
          playerId: string;
          level: number;
          maxHealth: number;
          damage: number;
      }) => {
          //console.log('Level up:', data);  // Add logging
          const player = this.players.get(data.playerId);
          if (player) {
              player.level = data.level;
              player.maxHealth = data.maxHealth;
              player.damage = data.damage;
              this.showFloatingText(
                  player.x, 
                  player.y - 30, 
                  'Level Up! Level ' + data.level, 
                  '#FFD700', 
                  24
              );
              this.savePlayerProgress(player);
          }
      });

      this.socket.on('playerLostLevel', (data: {
          playerId: string;
          level: number;
          maxHealth: number;
          damage: number;
          xp: number;
          xpToNextLevel: number;
      }) => {
          //console.log('Player lost level:', data);
          const player = this.players.get(data.playerId);
          if (player) {
              player.level = data.level;
              player.maxHealth = data.maxHealth;
              player.damage = data.damage;
              player.xp = data.xp;
              player.xpToNextLevel = data.xpToNextLevel;
              
              // Show level loss message
              this.showFloatingText(
                  player.x, 
                  player.y - 30, 
                  'Level Lost! Level ' + data.level, 
                  '#FF0000', 
                  24
              );
              
              // Save the new progress
              this.savePlayerProgress(player);
          }
      });

      this.socket.on('playerRespawned', (player: Player) => {
          const existingPlayer = this.players.get(player.id);
          if (existingPlayer) {
              Object.assign(existingPlayer, player);
              if (player.id === this.socket.id) {
                  this.isPlayerDead = false;
                  this.hideDeathScreen();
              }
              // Show respawn message
              this.showFloatingText(
                  player.x,
                  player.y - 50,
                  'Respawned!',
                  '#FFFFFF',
                  20
              );
          }
      });

      this.socket.on('playerDied', (playerId: string) => {
          if (playerId === this.socket.id) {
              this.isPlayerDead = true;
              this.showDeathScreen();
          }
      });

      this.socket.on('decorationsUpdate', (decorations: Array<{
          x: number;
          y: number;
          scale: number;
      }>) => {
          this.decorations = decorations;
      });

      this.socket.on('sandsUpdate', (sands: Array<{
          x: number;
          y: number;
          radius: number;
          rotation: number;
      }>) => {
          this.sands = sands;
      });
  }

  private setupEventListeners() {
      document.addEventListener('keydown', (event) => {
          if (event.key === 'i' || event.key === 'I') {
              this.toggleInventory();
              return;
          }

          // Add control toggle with 'C' key
          if (event.key === 'c' || event.key === 'C') {
              this.useMouseControls = !this.useMouseControls;
              this.showFloatingText(
                  this.canvas.width / 2,
                  50,
                  `Controls: ${this.useMouseControls ? 'Mouse' : 'Keyboard'}`,
                  '#FFFFFF',
                  20
              );
              return;
          }

          if (this.isInventoryOpen) {
              if (event.key >= '1' && event.key <= '5') {
                  const index = parseInt(event.key) - 1;
                  this.useItemFromInventory(index);
              }
              return;
          }

          this.keysPressed.add(event.key);
          this.updatePlayerVelocity();
      });

      document.addEventListener('keyup', (event) => {
          this.keysPressed.delete(event.key);
          this.updatePlayerVelocity();
      });

      // Add hitbox toggle with 'H' key
      document.addEventListener('keydown', (event) => {
          if (event.key === 'h' || event.key === 'H') {
              this.showHitboxes = !this.showHitboxes;
              this.showFloatingText(
                  this.canvas.width / 2,
                  50,
                  `Hitboxes: ${this.showHitboxes ? 'ON' : 'OFF'}`,
                  '#FFFFFF',
                  20
              );
          }
      });
  }

  private updatePlayerVelocity() {
      const player = this.isSinglePlayer ? 
          this.players.get('player1') : 
          this.players.get(this.socket?.id || '');

      if (player) {
          if (this.useMouseControls) {
              // Mouse controls
              const dx = this.mouseX - player.x;
              const dy = this.mouseY - player.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance > 5) {  // Add dead zone to prevent jittering
                  player.velocityX += (dx / distance) * this.PLAYER_ACCELERATION;
                  player.velocityY += (dy / distance) * this.PLAYER_ACCELERATION;
                  player.angle = Math.atan2(dy, dx);
              } else {
                  player.velocityX *= this.FRICTION;
                  player.velocityY *= this.FRICTION;
              }
          } else {
              // Keyboard controls (existing code)
              let dx = 0;
              let dy = 0;

              if (this.keysPressed.has('ArrowUp')) dy -= 1;
              if (this.keysPressed.has('ArrowDown')) dy += 1;
              if (this.keysPressed.has('ArrowLeft')) dx -= 1;
              if (this.keysPressed.has('ArrowRight')) dx += 1;

              if (dx !== 0 || dy !== 0) {
                  player.angle = Math.atan2(dy, dx);

                  if (dx !== 0 && dy !== 0) {
                      const length = Math.sqrt(dx * dx + dy * dy);
                      dx /= length;
                      dy /= length;
                  }

                  player.velocityX += dx * this.PLAYER_ACCELERATION;
                  player.velocityY += dy * this.PLAYER_ACCELERATION;
              } else {
                  player.velocityX *= this.FRICTION;
                  player.velocityY *= this.FRICTION;
              }
          }

          // Limit speed
          const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
          if (speed > this.MAX_SPEED) {
              const ratio = this.MAX_SPEED / speed;
              player.velocityX *= ratio;
              player.velocityY *= ratio;
          }

          // Update position
          const newX = player.x + player.velocityX;
          const newY = player.y + player.velocityY;

          // Check world bounds
          player.x = Math.max(0, Math.min(this.WORLD_WIDTH, newX));
          player.y = Math.max(0, Math.min(this.WORLD_HEIGHT, newY));

          // Send update to server/worker
          if (this.isSinglePlayer) {
              this.worker?.postMessage({
                  type: 'socketEvent',
                  event: 'playerMovement',
                  data: {
                      x: player.x,
                      y: player.y,
                      angle: player.angle,
                      velocityX: player.velocityX,
                      velocityY: player.velocityY
                  }
              });
          } else {
              this.socket.emit('playerMovement', {
                  x: player.x,
                  y: player.y,
                  angle: player.angle,
                  velocityX: player.velocityX,
                  velocityY: player.velocityY
              });
          }
      }
  }

  private updateCamera(player: Player) {
      // Center camera on player
      this.cameraX = player.x - this.canvas.width / 2;
      this.cameraY = player.y - this.canvas.height / 2;

      // Clamp camera to world bounds
      this.cameraX = Math.max(0, Math.min(this.WORLD_WIDTH - this.canvas.width, this.cameraX));
      this.cameraY = Math.max(0, Math.min(this.WORLD_HEIGHT - this.canvas.height, this.cameraY));
  }

  private updatePlayerPosition(player: Player) {
      // Calculate new position
      const newX = player.x + player.velocityX;
      const newY = player.y + player.velocityY;

      // Check collision with obstacles
      let collision = false;
      for (const obstacle of this.obstacles) {
          if (
              newX < obstacle.x + obstacle.width &&
              newX + 40 > obstacle.x && // Assuming player width is 40
              newY < obstacle.y + obstacle.height &&
              newY + 40 > obstacle.y // Assuming player height is 40
          ) {
              collision = true;
                          break;
                      }
                  }

      if (!collision) {
          // Update position if no collision
          player.x = newX;
          player.y = newY;
      } else {
          // Stop movement if collision occurs
          player.velocityX = 0;
          player.velocityY = 0;
      }

      // Update player angle based on velocity
      if (player.velocityX !== 0 || player.velocityY !== 0) {
          player.angle = Math.atan2(player.velocityY, player.velocityX);
      }

      // Apply friction only if no keys are pressed
      if (this.keysPressed.size === 0) {
          player.velocityX *= this.FRICTION;
          player.velocityY *= this.FRICTION;
      }

      // Constrain to world bounds
      player.x = Math.max(0, Math.min(this.WORLD_WIDTH, player.x));
      player.y = Math.max(0, Math.min(this.WORLD_HEIGHT, player.y));

      // Update server
      this.socket.emit('playerMovement', { 
          x: player.x, 
          y: player.y, 
          angle: player.angle, 
          velocityX: player.velocityX, 
          velocityY: player.velocityY 
      });

      this.checkDotCollision(player);
      this.checkEnemyCollision(player);
      this.updateCamera(player);
      this.checkItemCollision(player);
  }

  private generateDots() {
      for (let i = 0; i < this.DOT_COUNT; i++) {
          this.generateDot();
      }
  }

  private generateDot() {
      const dot: Dot = {
          x: Math.random() * this.WORLD_WIDTH,
          y: Math.random() * this.WORLD_HEIGHT
      };
      this.dots.push(dot);
  }

  private checkDotCollision(player: Player) {
      for (let i = this.dots.length - 1; i >= 0; i--) {
          const dot = this.dots[i];
          const dx = player.x - dot.x;
          const dy = player.y - dot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < this.DOT_SIZE + 20) {
              this.socket.emit('collectDot', i);
              player.score++;
              this.dots.splice(i, 1);
              this.generateDot();
          }
      }
  }

  private checkEnemyCollision(player: Player) {
      const currentTime = Date.now();
      if (currentTime - this.lastDamageTime < this.DAMAGE_COOLDOWN) {
          return;
      }

      this.enemies.forEach((enemy, enemyId) => {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 40) { // Assuming both player and enemy are 40x40 pixels
              this.lastDamageTime = currentTime;
              this.socket.emit('collision', { enemyId });
          }
      });
  }

  private checkItemCollision(player: Player) {
      this.items.forEach(item => {
          const dx = player.x - item.x;
          const dy = player.y - item.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 40) { // Assuming player radius is 20
              this.socket.emit('collectItem', item.id);
          }
      });
  }

  private toggleInventory() {
      this.isInventoryOpen = !this.isInventoryOpen;
  }

  private useItemFromInventory(index: number) {
      const socketId = this.socket.id;
      if (socketId) {
          const player = this.players.get(socketId);
          if (player && player.inventory[index]) {
              this.socket.emit('useItem', player.inventory[index].id);
          }
      }
  }

  private renderInventoryMenu() {
      const socketId = this.socket.id;
      if (!socketId) return;

      const player = this.players.get(socketId);
      if (!player) return;

      // Darken the background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw inventory background
      this.ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
      this.ctx.fillRect(200, 100, 400, 400);

      // Draw inventory title
      this.ctx.fillStyle = 'black';
      this.ctx.font = '24px Arial';
      this.ctx.fillText('Inventory', 350, 140);

      // Draw inventory slots
      player.inventory.forEach((item, index) => {
          const x = 250 + (index % 3) * 100;
          const y = 200 + Math.floor(index / 3) * 100;

          this.ctx.fillStyle = 'white';
          this.ctx.fillRect(x, y, 80, 80);

          const sprite = this.itemSprites[item.type];
          this.ctx.drawImage(sprite, x + 10, y + 10, 60, 60);

          this.ctx.fillStyle = 'black';
          this.ctx.font = '16px Arial';
          this.ctx.fillText(`${index + 1}`, x + 5, y + 20);
      });

      // Draw instructions
      this.ctx.fillStyle = 'black';
      this.ctx.font = '16px Arial';
      this.ctx.fillText('Press 1-5 to use an item', 300, 480);
      this.ctx.fillText('Press I to close inventory', 300, 510);
  }

  private handlePlayerMoved(playerData: Player) {
      // Update player position in single-player mode
      const player = this.players.get(playerData.id);
      if (player) {
          Object.assign(player, playerData);
          // Update camera position for the local player
          if (this.isSinglePlayer) {
              this.updateCamera(player);
          }
      }
  }

  private handleEnemiesUpdate(enemiesData: Enemy[]) {
      // Update enemies in single-player mode
      this.enemies.clear();
      enemiesData.forEach(enemy => this.enemies.set(enemy.id, enemy));
  }

  private gameLoop() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw ocean background
      this.ctx.fillStyle = '#00FFFF';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (!this.isInventoryOpen) {
          // Get current player for camera
          const currentSocketId = this.socket?.id;  // Changed variable name
          if (currentSocketId) {
              const currentPlayer = this.players.get(currentSocketId);
              if (currentPlayer) {
                  this.updateCamera(currentPlayer);
              }
          }

          this.ctx.save();
          this.ctx.translate(-this.cameraX, -this.cameraY);

          // Draw world bounds
          this.ctx.strokeStyle = 'black';
          this.ctx.strokeRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

          // Draw zone indicators with updated colors
          const zones = [
              { name: 'Common', end: 2000, color: 'rgba(128, 128, 128, 0.1)' },    // Lighter gray
              { name: 'Uncommon', end: 4000, color: 'rgba(144, 238, 144, 0.1)' },  // Light green (LightGreen)
              { name: 'Rare', end: 6000, color: 'rgba(0, 0, 255, 0.1)' },          // Blue
              { name: 'Epic', end: 8000, color: 'rgba(128, 0, 128, 0.1)' },        // Purple
              { name: 'Legendary', end: 9000, color: 'rgba(255, 165, 0, 0.1)' },   // Orange
              { name: 'Mythic', end: this.WORLD_WIDTH, color: 'rgba(255, 0, 0, 0.1)' }  // Red
          ];

          let start = 0;
          zones.forEach(zone => {
              // Draw zone background
              this.ctx.fillStyle = zone.color;
              this.ctx.fillRect(start, 0, zone.end - start, this.WORLD_HEIGHT);
              
              // Draw zone name
              this.ctx.fillStyle = 'black';
              this.ctx.font = '20px Arial';
              this.ctx.fillText(zone.name, start + 10, 30);
              
              start = zone.end;
          });

          // Draw dots
          this.ctx.fillStyle = 'yellow';
          this.dots.forEach(dot => {
              this.ctx.beginPath();
              this.ctx.arc(dot.x, dot.y, this.DOT_SIZE, 0, Math.PI * 2);
              this.ctx.fill();
          });

          // Draw sand first
          this.sands.forEach(sand => {
              this.ctx.save();
              this.ctx.translate(sand.x, sand.y);
              
              // Draw sand blob with opaque color
              this.ctx.fillStyle = '#FFE4B5';  // Moccasin color, fully opaque
              this.ctx.beginPath();
              
              // Draw static blob shape using the saved rotation
              this.ctx.moveTo(sand.radius * 0.8, 0);
              for (let angle = 0; angle <= Math.PI * 2; angle += Math.PI / 8) {
                  // Use the sand's saved rotation for consistent shape
                  const currentAngle = angle + sand.rotation;
                  const randomRadius = sand.radius * 0.9; // Less variation for more consistent shape
                  const x = Math.cos(currentAngle) * randomRadius;
                  const y = Math.sin(currentAngle) * randomRadius;
                  this.ctx.lineTo(x, y);
              }
              
              this.ctx.closePath();
              this.ctx.fill();
              
              this.ctx.restore();
          });

          // Draw decorations (palm trees)
          this.decorations.forEach(decoration => {
              this.ctx.save();
              this.ctx.translate(decoration.x, decoration.y);
              this.ctx.scale(decoration.scale, decoration.scale);
              
              // Draw palm tree
              this.ctx.drawImage(
                  this.palmSprite,
                  -this.palmSprite.width / 2,
                  -this.palmSprite.height / 2
              );
              
              this.ctx.restore();
          });

          // Draw players BEFORE decorations
          this.players.forEach((player, id) => {
              this.ctx.save();
              this.ctx.translate(player.x, player.y);
              this.ctx.rotate(player.angle);
              
              // Draw the sprite
              this.ctx.drawImage(this.playerSprite, -this.playerSprite.width / 2, -this.playerSprite.height / 2);
              
              this.ctx.restore();

              // Draw UI elements above player
              this.ctx.fillStyle = 'black';
              this.ctx.font = '16px Arial';

              // Draw health bar
              this.ctx.fillStyle = 'black';
              this.ctx.fillRect(player.x - 25, player.y - 40, 50, 5);
              this.ctx.fillStyle = 'lime';
              this.ctx.fillRect(player.x - 25, player.y - 40, 50 * (player.health / player.maxHealth), 5);

              // Draw XP bar and level
              if (player.level < this.MAX_LEVEL) {
                  const xpBarWidth = 50;
                  const xpBarHeight = 3;
                  const xpPercentage = player.xp / player.xpToNextLevel;
                  
                  this.ctx.fillStyle = '#4169E1';
                  this.ctx.fillRect(player.x - 25, player.y - 45, xpBarWidth, xpBarHeight);
                  this.ctx.fillStyle = '#00FFFF';
                  this.ctx.fillRect(player.x - 25, player.y - 45, xpBarWidth * xpPercentage, xpBarHeight);
              }

              // Draw level
              this.ctx.fillStyle = '#FFD700';
              this.ctx.font = '12px Arial';
              this.ctx.fillText('Lv.' + player.level, player.x - 25, player.y - 50);
          });

          // Draw enemies
          this.enemies.forEach(enemy => {
              const sizeMultiplier = this.ENEMY_SIZE_MULTIPLIERS[enemy.tier];
              const enemySize = 40 * sizeMultiplier;  // Base size * multiplier
              
              this.ctx.save();
              this.ctx.translate(enemy.x, enemy.y);
              this.ctx.rotate(enemy.angle);
              
              // Draw hitbox if enabled
              if (this.showHitboxes) {
                  this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';  // Semi-transparent red
                  this.ctx.lineWidth = 2;
                  
                  // Draw rectangular hitbox
                  this.ctx.strokeRect(-enemySize/2, -enemySize/2, enemySize, enemySize);
                  
                  // Draw center point
                  this.ctx.beginPath();
                  this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
                  this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';  // Yellow dot for center
                  this.ctx.fill();
                  
                  // Draw hitbox dimensions
                  this.ctx.fillStyle = 'white';
                  this.ctx.font = '12px Arial';
                  this.ctx.fillText(`${Math.round(enemySize)}x${Math.round(enemySize)}`, 0, enemySize/2 + 20);
              }

              // Draw enemy with color based on tier
              this.ctx.fillStyle = this.ENEMY_COLORS[enemy.tier];
              this.ctx.beginPath();
              this.ctx.arc(0, 0, enemySize/2, 0, Math.PI * 2);
              this.ctx.fill();

              if (enemy.type === 'octopus') {
                  this.ctx.drawImage(this.octopusSprite, -enemySize/2, -enemySize/2, enemySize, enemySize);
              } else {
                  this.ctx.drawImage(this.fishSprite, -enemySize/2, -enemySize/2, enemySize, enemySize);
              }
              
              this.ctx.restore();

              // Draw health bar and tier indicator - adjust position based on size
              const maxHealth = this.ENEMY_MAX_HEALTH[enemy.tier];
              const healthBarWidth = 50 * sizeMultiplier;
              
              // Health bar
              this.ctx.fillStyle = 'black';
              this.ctx.fillRect(enemy.x - healthBarWidth/2, enemy.y - enemySize/2 - 10, healthBarWidth, 5);
              this.ctx.fillStyle = 'lime';
              this.ctx.fillRect(enemy.x - healthBarWidth/2, enemy.y - enemySize/2 - 10, healthBarWidth * (enemy.health / maxHealth), 5);
              
              // Tier text
              this.ctx.fillStyle = 'white';
              this.ctx.font = (12 * sizeMultiplier) + 'px Arial';
              this.ctx.fillText(enemy.tier.toUpperCase(), enemy.x - healthBarWidth/2, enemy.y + enemySize/2 + 15);
          });

          // Draw obstacles
          this.obstacles.forEach(obstacle => {
              if (obstacle.type === 'coral') {
                  this.ctx.save();
                  this.ctx.translate(obstacle.x, obstacle.y);
                  
                  if (obstacle.isEnemy) {
                      // Draw enemy coral with a reddish tint
                      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                      this.ctx.fillRect(0, 0, obstacle.width, obstacle.height);
                  }
                  
                  this.ctx.drawImage(this.coralSprite, 0, 0, obstacle.width, obstacle.height);
                  
                  if (obstacle.isEnemy && obstacle.health !== undefined) {
                      // Draw health bar for enemy coral
                      this.ctx.fillStyle = 'red';
                      this.ctx.fillRect(0, -10, obstacle.width, 5);
                      this.ctx.fillStyle = 'green';
                      this.ctx.fillRect(0, -10, obstacle.width * (obstacle.health / this.ENEMY_CORAL_MAX_HEALTH), 5);
                  }
                  
                  this.ctx.restore();
              }
          });

          // Draw items
          this.items.forEach(item => {
              const sprite = this.itemSprites[item.type];
              this.ctx.drawImage(sprite, item.x - 15, item.y - 15, 30, 30);
          });

          // Draw player inventory
          const playerSocketId = this.socket.id;  // Changed variable name
          if (playerSocketId) {
              const player = this.players.get(playerSocketId);
              if (player) {
                  player.inventory.forEach((item, index) => {
                      const sprite = this.itemSprites[item.type];
                      this.ctx.drawImage(sprite, 10 + index * 40, 10, 30, 30);
                  });
              }
          }

          this.ctx.restore();

          // Draw minimap (after restoring context)
          this.drawMinimap();
      } else {
          this.renderInventoryMenu();
      }

      // Draw floating texts
      this.floatingTexts = this.floatingTexts.filter(text => {
          text.y -= 1;
          text.alpha -= 1 / text.lifetime;
          
          if (text.alpha <= 0) return false;
          
          this.ctx.globalAlpha = text.alpha;
          this.ctx.fillStyle = text.color;
          this.ctx.font = text.fontSize + 'px Arial';
          this.ctx.fillText(text.text, text.x, text.y);
          this.ctx.globalAlpha = 1;
          
          return true;
      });

      // Don't process player input if dead
      if (!this.isPlayerDead) {
          // Process player movement and input
          this.updatePlayerVelocity();
      }

      this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  private setupItemSprites() {
      const itemTypes = ['health_potion', 'speed_boost', 'shield'];
      itemTypes.forEach(type => {
          const sprite = new Image();
          sprite.src = `./assets/${type}.png`;
          this.itemSprites[type] = sprite;
      });
  }

  private resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      
      // Update any viewport-dependent calculations here
      // For example, you might want to adjust the camera bounds
     // console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
  }

  public cleanup() {
      // Save progress before cleanup if in single player mode
      if (this.isSinglePlayer && this.socket?.id) {  // Add null check for socket.id
          const player = this.players.get(this.socket.id);
          if (player) {
              this.savePlayerProgress(player);
          }
      }

      // Stop the game loop
      if (this.gameLoopId) {
          cancelAnimationFrame(this.gameLoopId);
      }

      // Terminate the web worker if it exists
      if (this.worker) {
          this.worker.terminate();
          this.worker = null;
      }

      // Disconnect socket if it exists
      if (this.socket) {
          this.socket.disconnect();
      }

      // Clear all game data
      this.players.clear();
      this.enemies.clear();
      this.dots = [];
      this.obstacles = [];
      this.items = [];

      // Clear the canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Hide game canvas and show title screen
      const titleScreen = document.getElementById('titleScreen');
      const canvas = document.getElementById('gameCanvas');
      const exitButton = document.getElementById('exitButton');
      
      if (titleScreen && canvas && exitButton) {
          titleScreen.style.display = 'flex';
          canvas.style.display = 'none';
          exitButton.style.display = 'none';
      }
  }

  private loadPlayerProgress(): { level: number; xp: number; maxHealth: number; damage: number } {
      const savedProgress = localStorage.getItem('playerProgress');
      if (savedProgress) {
          return JSON.parse(savedProgress);
      }
                  return {
          level: 1,
          xp: 0,
          maxHealth: this.PLAYER_MAX_HEALTH,
          damage: this.PLAYER_DAMAGE
      };
  }

  private savePlayerProgress(player: Player) {
      const progress = {
          level: player.level,
          xp: player.xp,
          maxHealth: player.maxHealth,
          damage: player.damage
      };
      localStorage.setItem('playerProgress', JSON.stringify(progress));
  }

  private calculateXPRequirement(level: number): number {
      return Math.floor(this.BASE_XP_REQUIREMENT * Math.pow(this.XP_MULTIPLIER, level - 1));
  }

  // Add the showFloatingText method
  private showFloatingText(x: number, y: number, text: string, color: string, fontSize: number) {
      this.floatingTexts.push({
          x,
          y,
          text,
          color,
          fontSize,
          alpha: 1,
          lifetime: 60 // frames
      });
  }

  private showDeathScreen() {
      const deathScreen = document.getElementById('deathScreen');
      if (deathScreen) {
          deathScreen.style.display = 'flex';
      }
  }

  private hideDeathScreen() {
      const deathScreen = document.getElementById('deathScreen');
      if (deathScreen) {
          deathScreen.style.display = 'none';
      }
  }

  // Add minimap drawing
  private drawMinimap() {
      const minimapX = this.canvas.width - this.MINIMAP_WIDTH - this.MINIMAP_PADDING;
      const minimapY = this.MINIMAP_PADDING;

      // Draw minimap background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(minimapX, minimapY, this.MINIMAP_WIDTH, this.MINIMAP_HEIGHT);

      // Draw zones on minimap with matching colors
      const zones = [
          { color: 'rgba(128, 128, 128, 0.5)' },    // Gray
          { color: 'rgba(144, 238, 144, 0.5)' },    // Light green
          { color: 'rgba(0, 0, 255, 0.5)' },        // Blue
          { color: 'rgba(128, 0, 128, 0.5)' },      // Purple
          { color: 'rgba(255, 165, 0, 0.5)' },      // Orange
          { color: 'rgba(255, 0, 0, 0.5)' }         // Red
      ];

      zones.forEach((zone, index) => {
          const zoneWidth = (this.MINIMAP_WIDTH / 6);
          this.ctx.fillStyle = zone.color;
          this.ctx.fillRect(
              minimapX + index * zoneWidth,
              minimapY,
              zoneWidth,
              this.MINIMAP_HEIGHT
          );
      });

      // Draw player position on minimap
      const minimapSocketId = this.socket?.id;  // Changed variable name
      if (minimapSocketId) {
          const player = this.players.get(minimapSocketId);
          if (player) {
              const playerMinimapX = minimapX + (player.x / this.WORLD_WIDTH) * this.MINIMAP_WIDTH;
              const playerMinimapY = minimapY + (player.y / this.WORLD_HEIGHT) * this.MINIMAP_HEIGHT;
              
              this.ctx.fillStyle = 'yellow';
              this.ctx.beginPath();
              this.ctx.arc(playerMinimapX, playerMinimapY, 2, 0, Math.PI * 2);
              this.ctx.fill();
          }
      }
  }
              }