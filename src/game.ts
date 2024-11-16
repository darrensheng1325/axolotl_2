import { Player } from './player';
import { Dot, Enemy, Obstacle } from './enemy';
import { io, Socket } from 'socket.io-client';
import { Item } from './item';
import { workerBlob } from './workerblob';
import { IMAGE_ASSETS } from './imageAssets';

// Add these interfaces at the top of the file
interface SandboxedScript {
    id: string;
    code: string;
    sender: string;
}

// Add this interface to properly type our sandbox window
interface SandboxWindow extends Window {
    safeContext?: any;
    eval?: (code: string) => any;
}

// Add these interfaces near the top of the file where other interfaces are defined
interface ItemRarityColors {
    common: string;
    uncommon: string;
    rare: string;
    epic: string;
    legendary: string;
    mythic: string;
}

// Add after other interfaces at the top
interface CraftingSlot {
    index: number;
    item: Item | null;
}

export class Game {
  private speedBoostActive: boolean = false;
  private shieldActive: boolean = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private socket!: Socket;  // Using the definite assignment assertion
  private players: Map<string, Player> = new Map();
  private playerSprite: HTMLImageElement = new Image();
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
  private octopusSprite: HTMLImageElement = new Image();
  private fishSprite: HTMLImageElement = new Image();
  private coralSprite: HTMLImageElement = new Image();
  private palmSprite: HTMLImageElement = new Image();
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
  private titleScreen: HTMLElement | null;
  private nameInput: HTMLInputElement | null;
  private exitButton: HTMLElement | null;
  private exitButtonContainer: HTMLElement | null;
  private playerHue: number = 0;
  private playerColor: string = 'hsl(0, 100%, 50%)';
  private colorPreviewCanvas: HTMLCanvasElement;
  private readonly LOADOUT_SLOTS = 10;
  private readonly LOADOUT_KEY_BINDINGS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  // Add to class properties
  private inventoryPanel: HTMLDivElement | null = null;
  private saveIndicator: HTMLDivElement | null = null;
  private saveIndicatorTimeout: NodeJS.Timeout | null = null;
  // Add to class properties
  private chatContainer: HTMLDivElement | null = null;
  private chatInput: HTMLInputElement | null = null;
  private chatMessages: HTMLDivElement | null = null;
  private isChatFocused: boolean = false;
  // Add to Game class properties
  private pendingScripts: Map<string, SandboxedScript> = new Map();
  // Add to Game class properties
  private readonly ITEM_RARITY_COLORS: Record<string, string> = {
      common: '#808080',      // Gray
      uncommon: '#008000',    // Green
      rare: '#0000FF',       // Blue
      epic: '#800080',       // Purple
      legendary: '#FFA500',   // Orange
      mythic: '#FF0000'      // Red
  };
  // Add to Game class properties
  private craftingPanel: HTMLDivElement | null = null;
  private craftingSlots: CraftingSlot[] = Array(4).fill(null).map((_, i) => ({ index: i, item: null }));
  private isCraftingOpen: boolean = false;

  constructor(isSinglePlayer: boolean = false) {
      //console.log('Game constructor called');
      this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
      this.ctx = this.canvas.getContext('2d')!;
      
      // Set initial canvas size
      this.resizeCanvas();
      
      // Add resize listener
      window.addEventListener('resize', () => this.resizeCanvas());
      
      this.isSinglePlayer = isSinglePlayer;

      // Initialize sprites with CORS settings and wait for them to load
      Promise.all([
          this.initializeSprites(),
          this.setupItemSprites()
      ]).then(() => {
          console.log('All sprites loaded successfully');
          this.updateColorPreview();
          this.gameLoop();
      }).catch(console.error);

      // Create and set up preview canvas
      this.colorPreviewCanvas = document.createElement('canvas');
      this.colorPreviewCanvas.width = 64;  // Set fixed size for preview
      this.colorPreviewCanvas.height = 64;
      this.colorPreviewCanvas.style.width = '64px';
      this.colorPreviewCanvas.style.height = '64px';
      this.colorPreviewCanvas.style.imageRendering = 'pixelated';
      
      // Add preview canvas to the color picker
      const previewContainer = document.createElement('div');
      previewContainer.style.display = 'flex';
      previewContainer.style.justifyContent = 'center';
      previewContainer.style.marginTop = '10px';
      previewContainer.appendChild(this.colorPreviewCanvas);
      document.querySelector('.color-picker')?.appendChild(previewContainer);

      // Set up color picker functionality
      const hueSlider = document.getElementById('hueSlider') as HTMLInputElement;
      const colorPreview = document.getElementById('colorPreview');
      
      if (hueSlider && colorPreview) {
          // Load saved hue from localStorage
          const savedHue = localStorage.getItem('playerHue');
          if (savedHue !== null) {
              this.playerHue = parseInt(savedHue);
              hueSlider.value = savedHue;
              this.playerColor = `hsl(${this.playerHue}, 100%, 50%)`;
              colorPreview.style.backgroundColor = this.playerColor;
              this.updateColorPreview();
          }

          // Preview color while sliding without saving
          hueSlider.addEventListener('input', (e) => {
              const value = (e.target as HTMLInputElement).value;
              colorPreview.style.backgroundColor = `hsl(${value}, 100%, 50%)`;
          });

          // Add update color button handler
          const updateColorButton = document.getElementById('updateColorButton');
          if (updateColorButton) {
            console.log('Update color button found');
              updateColorButton.addEventListener('click', () => {
                  const value = hueSlider.value;
                  localStorage.setItem('playerHue', value);
                  console.log('Player hue saved:', value);
                  
                  // Update game state after saving
                  this.playerHue = parseInt(value);
                  this.playerColor = `hsl(${this.playerHue}, 100%, 50%)`;
                  
                  if (this.playerSprite.complete) {
                      this.updateColorPreview();
                  }
                  
                  // Show confirmation message
                  this.showFloatingText(
                      this.canvas.width / 2,
                      50,
                      'Color Updated!',
                      '#4CAF50',
                      20
                  );
              });
          }
      }

      this.setupEventListeners();

      // Get title screen elements
      this.titleScreen = document.querySelector('.center_text');
      this.nameInput = document.getElementById('nameInput') as HTMLInputElement;

      // Initialize game mode after resource loading
      if (this.isSinglePlayer) {
          this.initSinglePlayerMode();
          this.hideTitleScreen();
      } else {
          this.initMultiPlayerMode();
      }

      // Move authentication to after socket initialization
      this.authenticate();

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

      // Initialize exit button
      this.exitButton = document.getElementById('exitButton');
      this.exitButtonContainer = document.getElementById('exitButtonContainer');
      
      // Add exit button click handler
      this.exitButton?.addEventListener('click', () => this.handleExit());

      // Create loadout bar HTML element
      const loadoutBar = document.createElement('div');
      loadoutBar.id = 'loadoutBar';
      loadoutBar.style.position = 'fixed';
      loadoutBar.style.bottom = '20px';
      loadoutBar.style.left = '50%';
      loadoutBar.style.transform = 'translateX(-50%)';
      loadoutBar.style.display = 'flex';
      loadoutBar.style.gap = '5px';
      loadoutBar.style.zIndex = '1000';

      // Create slots
      for (let i = 0; i < this.LOADOUT_SLOTS; i++) {
          const slot = document.createElement('div');
          slot.className = 'loadout-slot';
          slot.dataset.slot = i.toString();
          slot.style.width = '50px';
          slot.style.height = '50px';
          slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          slot.style.border = '2px solid #666';
          slot.style.borderRadius = '5px';
          loadoutBar.appendChild(slot);
      }

      document.body.appendChild(loadoutBar);

      // Set up item sprites
      this.setupItemSprites();

      // Add drag-and-drop event listeners
      this.setupDragAndDrop();

      // Create inventory panel
      this.inventoryPanel = document.createElement('div');
      this.inventoryPanel.id = 'inventoryPanel';
      this.inventoryPanel.className = 'inventory-panel';
      this.inventoryPanel.style.display = 'none';
      
      // Create inventory content
      const inventoryContent = document.createElement('div');
      inventoryContent.className = 'inventory-content';
      this.inventoryPanel.appendChild(inventoryContent);
      
      document.body.appendChild(this.inventoryPanel);

      // Create save indicator
      this.saveIndicator = document.createElement('div');
      this.saveIndicator.className = 'save-indicator';
      this.saveIndicator.textContent = 'Progress Saved';
      this.saveIndicator.style.display = 'none';
      document.body.appendChild(this.saveIndicator);

      if (!isSinglePlayer) {
          this.initializeChat();
      }

      // Add this to the constructor after creating the loadout bar
      const style = document.createElement('style');
      style.textContent = `
          .loadout-slot.on-cooldown {
              position: relative;
              overflow: hidden;
          }
          .loadout-slot.on-cooldown::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.5);
              animation: cooldown 10s linear;
          }
          @keyframes cooldown {
              from { height: 100%; }
              to { height: 0%; }
          }
      `;
      document.head.appendChild(style);

      // Add to constructor after other UI initialization
      this.initializeCrafting();
  }

  private async initializeSprites(): Promise<void> {
    const loadSprite = async (sprite: HTMLImageElement, filename: string): Promise<void> => {
        try {
            sprite.crossOrigin = "anonymous";
            sprite.src = await this.getAssetUrl(filename);
            
            return new Promise((resolve, reject) => {
                sprite.onload = () => resolve();
                sprite.onerror = (e) => {
                    console.error(`Failed to load sprite: ${filename}`, e);
                    reject(e);
                };
            });
        } catch (error) {
            console.error(`Error loading sprite ${filename}:`, error);
            // Don't throw error, just log it and continue
        }
    };

    try {
        await Promise.allSettled([
            loadSprite(this.playerSprite, 'player.png'),
            loadSprite(this.octopusSprite, 'octopus.png'),
            loadSprite(this.fishSprite, 'fish.png'),
            loadSprite(this.coralSprite, 'coral.png'),
            loadSprite(this.palmSprite, 'palm.png')
        ]);
    } catch (error) {
        console.error('Error loading sprites:', error);
        // Continue even if some sprites fail to load
    }
}

  private authenticate() {
      // Get credentials from AuthUI or localStorage
      const credentials = {
          username: localStorage.getItem('username') || 'player1',
          password: localStorage.getItem('password') || 'password123',
          playerName: this.nameInput?.value || 'Anonymous'
      };

      this.socket.emit('authenticate', credentials);

      this.socket.on('authenticated', (response: { success: boolean; error?: string; player?: any }) => {
          if (response.success) {
              console.log('Authentication successful');
              if (response.player) {
                if (this.socket.id) {
                    // Update player data with saved progress
                    const player = this.players.get(this.socket.id);
                    if (player) {
                          Object.assign(player, response.player);
                    }
                }
              }
          } else {
              console.error('Authentication failed:', response.error);
              alert('Authentication failed: ' + response.error);
              localStorage.removeItem('currentUser');
              window.location.reload();
          }
      });
  }

  private initSinglePlayerMode() {
      console.log('Initializing single player mode');
      try {
          // Create inline worker with the worker code

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
            savedProgress: {
                level: savedProgress['level'],
                xp: savedProgress['xp'],
                maxHealth: savedProgress['maxHealth'],
                damage: savedProgress['damage']
            }
        });

      } catch (error) {
          console.error('Error initializing worker:', error);
      }

      this.showExitButton();
  }

  private initMultiPlayerMode() {
      this.socket = io(prompt("Enter the server URL eg https://localhost:3000: \n Join a public server: https://54.151.123.177:3000/") || "", { 
          secure: true,
          rejectUnauthorized: false,
          withCredentials: true
      });

      this.socket.on('connect', () => {
          this.hideTitleScreen();
          this.showExitButton();
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
          const player = this.players.get(data.playerId);
          if (player) {
              this.items = this.items.filter(item => item.id !== data.itemId);
              if (data.playerId === this.socket.id) {
                  // Update inventory display if it's open
                  if (this.isInventoryOpen) {
                      this.updateInventoryDisplay();
                  }
              }
          }
      });

      this.socket.on('inventoryUpdate', (inventory: Item[]) => {
          const player = this.players.get(this.socket?.id || '');
          if (player) {
              player.inventory = inventory;
              // Update inventory display if it's open
              if (this.isInventoryOpen) {
                  this.updateInventoryDisplay();
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

      this.socket.on('playerUpdated', (updatedPlayer: Player) => {
          const player = this.players.get(updatedPlayer.id);
          if (player) {
              Object.assign(player, updatedPlayer);
              // Update displays if this is the current player
              if (updatedPlayer.id === this.socket?.id) {
                  if (this.isInventoryOpen) {
                      this.updateInventoryDisplay();
                  }
                  this.updateLoadoutDisplay();  // Always update loadout display
              }
          }
      });
      this.socket.on('speedBoostActive', (playerId: string) => {
        console.log('Speed boost active:', playerId);
          if (playerId === this.socket.id) {
              this.speedBoostActive = true;
              console.log('Speed boost active for client');
          }
      });

      this.socket.on('savePlayerProgress', () => {
          this.showSaveIndicator();
      });

      this.socket.on('chatMessage', (message: { sender: string; content: string; timestamp: number }) => {
          this.addChatMessage(message);
      });

      this.socket.on('chatHistory', (history: Array<{ sender: string; content: string; timestamp: number }>) => {
          history.forEach(message => this.addChatMessage(message));
      });
  }

  private setupEventListeners() {
      document.addEventListener('keydown', (event) => {
          // Skip keyboard controls if chat is focused
          if (this.isChatFocused) {
              if (event.key === 'Escape') {
                  this.chatInput?.blur();
              }
              return;
          }
          
          // Add chat toggle
          if (event.key === 'Enter' && !this.isSinglePlayer) {
              this.chatInput?.focus();
              return;
          }
          
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

          // Add crafting toggle with 'R' key
          if (event.key === 'r' || event.key === 'R') {
              this.toggleCrafting();
          }

          this.keysPressed.add(event.key);
          this.updatePlayerVelocity();

          // Handle loadout key bindings
          const key = event.key;
          const slotIndex = this.LOADOUT_KEY_BINDINGS.indexOf(key);
          
          if (slotIndex !== -1) {
              this.useLoadoutItem(slotIndex);
          }
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

      // Add name input change listener
      this.nameInput?.addEventListener('change', () => {
          if (this.socket && this.nameInput) {
              this.socket.emit('updateName', this.nameInput.value);
          }
      });

      // Add drag and drop handlers for loadout
      const loadoutBar = document.getElementById('loadoutBar');
      if (loadoutBar) {
          loadoutBar.addEventListener('dragover', (e) => {
              e.preventDefault();
          });

          loadoutBar.addEventListener('drop', (e) => {
              e.preventDefault();
              const itemIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
              const slot = (e.target as HTMLElement).dataset.slot;
              
              if (itemIndex >= 0 && slot) {
                  this.equipItemToLoadout(itemIndex, parseInt(slot));
              }
          });
      }
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
                  player.velocityX += (dx / distance) * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
                  player.velocityY += (dy / distance) * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
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

                  player.velocityX += dx * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
                  player.velocityY += dy * this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
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
          if (distance < 40) {
              this.socket.emit('collectItem', item.id);
              // Update displays immediately for better responsiveness
              if (this.isInventoryOpen) {
                  this.updateInventoryDisplay();
              }
          }
      });
  }

  private toggleInventory() {
      if (!this.inventoryPanel) return;
      
      const isOpen = this.inventoryPanel.style.display === 'block';
      if (!isOpen) {
          this.inventoryPanel.style.display = 'block';
          setTimeout(() => {
              this.inventoryPanel?.classList.add('open');
          }, 10);
          this.updateInventoryDisplay();
      } else {
          this.inventoryPanel.classList.remove('open');
          setTimeout(() => {
              if (this.inventoryPanel) {
                  this.inventoryPanel.style.display = 'none';
              }
          }, 300); // Match transition duration
      }
      this.isInventoryOpen = !isOpen;
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

      // Get current player for camera
      const currentSocketId = this.socket?.id;
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

      // Draw players
      this.players.forEach((player, id) => {
          this.ctx.save();
          this.ctx.translate(player.x, player.y);
          this.ctx.rotate(player.angle);
          
          // Apply hue rotation if it's the current player
          if (id === this.socket?.id) {
              const offscreen = document.createElement('canvas');
              offscreen.width = this.playerSprite.width;
              offscreen.height = this.playerSprite.height;
              const offCtx = offscreen.getContext('2d')!;
              
              offCtx.drawImage(this.playerSprite, 0, 0);
              const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
              this.applyHueRotation(offCtx, imageData);
              offCtx.putImageData(imageData, 0, 0);
              
              this.ctx.drawImage(
                  offscreen,
                  -this.playerSprite.width / 2,
                  -this.playerSprite.height / 2
              );
          } else {
              this.ctx.drawImage(
                  this.playerSprite,
                  -this.playerSprite.width / 2,
                  -this.playerSprite.height / 2
              );
          }
          
          this.ctx.restore();

          // Draw player name above player
          this.ctx.fillStyle = 'white';
          this.ctx.strokeStyle = 'black';
          this.ctx.lineWidth = 2;
          this.ctx.font = '16px Arial';
          this.ctx.textAlign = 'center';
          const nameText = player.name || 'Anonymous';
          
          // Draw text stroke
          this.ctx.strokeText(nameText, player.x, player.y - 50);
          // Draw text fill
          this.ctx.fillText(nameText, player.x, player.y - 50);

          // Draw stats on the left side if this is the current player
          if (id === this.socket?.id) {
              // Save the current transform
              this.ctx.save();
              
              // Reset transform for UI elements
              this.ctx.setTransform(1, 0, 0, 1, 0, 0);
              
              const statsX = 20;  // Distance from left edge
              const statsY = 100; // Distance from top
              const barWidth = 200; // Wider bars
              const barHeight = 20; // Taller bars
              const spacing = 30;  // Space between elements

              // Draw health bar
              this.ctx.fillStyle = 'black';
              this.ctx.fillRect(statsX, statsY, barWidth, barHeight);
              this.ctx.fillStyle = 'lime';
              this.ctx.fillRect(statsX, statsY, barWidth * (player.health / player.maxHealth), barHeight);
              
              // Draw health text
              this.ctx.fillStyle = 'white';
              this.ctx.font = '16px Arial';
              this.ctx.textAlign = 'left';
              this.ctx.fillText(`Health: ${Math.round(player.health)}/${player.maxHealth}`, statsX + 5, statsY + 15);

              // Draw XP bar
              if (player.level < this.MAX_LEVEL) {
                  this.ctx.fillStyle = '#4169E1';
                  this.ctx.fillRect(statsX, statsY + spacing, barWidth, barHeight);
                  this.ctx.fillStyle = '#00FFFF';
                  this.ctx.fillRect(statsX, statsY + spacing, barWidth * (player.xp / player.xpToNextLevel), barHeight);
                  
                  // Draw XP text
                  this.ctx.fillStyle = 'white';
                  this.ctx.fillText(`XP: ${player.xp}/${player.xpToNextLevel}`, statsX + 5, statsY + spacing + 15);
              }

              // Draw level
              this.ctx.fillStyle = '#FFD700';
              this.ctx.font = '20px Arial';
              this.ctx.fillText(`Level ${player.level}`, statsX, statsY - 10);

              // Restore the transform
              this.ctx.restore();
          }
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
          if (!sprite) {
              console.warn(`No sprite found for item type: ${item.type}`);
              return;  // Skip drawing this item if sprite isn't loaded
          }
          
          // Draw rarity ring
          if (item.rarity) {
              this.ctx.save();
              
              // Draw outer ring
              this.ctx.beginPath();
              this.ctx.arc(item.x, item.y, 20, 0, Math.PI * 2);
              this.ctx.strokeStyle = this.ITEM_RARITY_COLORS[item.rarity];
              this.ctx.lineWidth = 3;
              
              // Add glow effect
              this.ctx.shadowColor = this.ITEM_RARITY_COLORS[item.rarity];
              this.ctx.shadowBlur = 10;
              this.ctx.stroke();
              
              this.ctx.restore();
          }
          
          // Draw the item sprite
          if (sprite.complete) {  // Only draw if the sprite is fully loaded
              this.ctx.drawImage(sprite, item.x - 15, item.y - 15, 30, 30);
          }
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

  private async setupItemSprites() {
      this.itemSprites = {};
      const itemTypes = ['health_potion', 'speed_boost', 'shield'];
      
      try {
          await Promise.all(itemTypes.map(async type => {
              const sprite = new Image();
              sprite.crossOrigin = "anonymous";
              const url = await this.getAssetUrl(`${type}.png`);
              
              await new Promise<void>((resolve, reject) => {
                  sprite.onload = () => {
                      this.itemSprites[type] = sprite;
                      resolve();
                  };
                  sprite.onerror = (error) => {
                      console.error(`Failed to load sprite for ${type}:`, error);
                      reject(error);
                  };
                  sprite.src = url;
              });
          }));
          
          console.log('All item sprites loaded successfully:', Object.keys(this.itemSprites));
      } catch (error) {
          console.error('Error loading item sprites:', error);
      }
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
      if (this.isSinglePlayer && this.socket?.id) {
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

      // Reset and show title screen elements
      if (this.titleScreen) {
          this.titleScreen.style.display = 'flex';
          this.titleScreen.style.opacity = '1';
          this.titleScreen.style.zIndex = '1000';
      }
      if (this.nameInput) {
          this.nameInput.style.display = 'block';
          this.nameInput.style.opacity = '1';
      }

      // Hide exit button
      this.hideExitButton();

      // Show and reset game menu
      const gameMenu = document.getElementById('gameMenu');
      if (gameMenu) {
          gameMenu.style.display = 'flex';
          gameMenu.style.opacity = '1';
          gameMenu.style.zIndex = '3000';
      }

      // Reset canvas state
      this.canvas.style.zIndex = '0';

      // Clean up save indicator
      if (this.saveIndicatorTimeout) {
          clearTimeout(this.saveIndicatorTimeout);
      }
      this.saveIndicator?.remove();
      this.saveIndicator = null;

      // Remove chat container
      this.chatContainer?.remove();
      this.chatContainer = null;
      this.chatInput = null;
      this.chatMessages = null;
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

  private hideTitleScreen() {
      if (this.titleScreen) {
          this.titleScreen.style.display = 'none';
          this.titleScreen.style.opacity = '0';
      }
      if (this.nameInput) {
          this.nameInput.style.display = 'none';
          this.nameInput.style.opacity = '0';
      }
      // Hide game menu when game starts
      const gameMenu = document.getElementById('gameMenu');
      if (gameMenu) {
          gameMenu.style.display = 'none';
          gameMenu.style.opacity = '0';
      }

      // Ensure canvas is visible
      this.canvas.style.zIndex = '1';
  }

  private showExitButton() {
      if (this.exitButtonContainer) {
          this.exitButtonContainer.style.display = 'block';
      }
  }

  private hideExitButton() {
      if (this.exitButtonContainer) {
          this.exitButtonContainer.style.display = 'none';
      }
  }

  private handleExit() {
      // Clean up game state
      this.cleanup();
      
      // Show title screen elements
      if (this.titleScreen) {
          this.titleScreen.style.display = 'flex';
          this.titleScreen.style.opacity = '1';
          this.titleScreen.style.zIndex = '1000';
      }
      if (this.nameInput) {
          this.nameInput.style.display = 'block';
          this.nameInput.style.opacity = '1';
      }

      // Hide exit button
      this.hideExitButton();

      // Show game menu with proper styling
      const gameMenu = document.getElementById('gameMenu');
      if (gameMenu) {
          gameMenu.style.display = 'flex';
          gameMenu.style.opacity = '1';
          gameMenu.style.zIndex = '3000';
      }

      // Clear the canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Reset canvas visibility
      this.canvas.style.zIndex = '0';
  }

  private applyHueRotation(ctx: CanvasRenderingContext2D, imageData: ImageData): void {
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
          // Skip fully transparent pixels
          if (data[i + 3] === 0) continue;
          
          // Convert RGB to HSL
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;
          
          if (max === min) {
              h = s = 0; // achromatic
          } else {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                  case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                  case g: h = (b - r) / d + 2; break;
                  case b: h = (r - g) / d + 4; break;
                  default: h = 0;
              }
              h /= 6;
          }
          
          // Only adjust hue if the pixel has some saturation
          if (s > 0.1) {  // Threshold for considering a pixel colored
              h = (h + this.playerHue / 360) % 1;
              
              // Convert back to RGB
              if (s === 0) {
                  data[i] = data[i + 1] = data[i + 2] = l * 255;
              } else {
                  const hue2rgb = (p: number, q: number, t: number) => {
                      if (t < 0) t += 1;
                      if (t > 1) t -= 1;
                      if (t < 1/6) return p + (q - p) * 6 * t;
                      if (t < 1/2) return q;
                      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                      return p;
                  };
                  
                  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                  const p = 2 * l - q;
                  
                  data[i] = hue2rgb(p, q, h + 1/3) * 255;
                  data[i + 1] = hue2rgb(p, q, h) * 255;
                  data[i + 2] = hue2rgb(p, q, h - 1/3) * 255;
              }
          }
      }
  }

  private updateColorPreview() {
      if (!this.playerSprite.complete) return;

      const ctx = this.colorPreviewCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, this.colorPreviewCanvas.width, this.colorPreviewCanvas.height);
      
      // Draw the sprite centered in the preview
      const scale = Math.min(
          this.colorPreviewCanvas.width / this.playerSprite.width,
          this.colorPreviewCanvas.height / this.playerSprite.height
      );
      
      const x = (this.colorPreviewCanvas.width - this.playerSprite.width * scale) / 2;
      const y = (this.colorPreviewCanvas.height - this.playerSprite.height * scale) / 2;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.drawImage(this.playerSprite, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, this.colorPreviewCanvas.width, this.colorPreviewCanvas.height);
      this.applyHueRotation(ctx, imageData);
      ctx.putImageData(imageData, 0, 0);
      ctx.restore();
  }

  private equipItemToLoadout(inventoryIndex: number, loadoutSlot: number) {
      const player = this.players.get(this.socket?.id || '');
      if (!player || loadoutSlot >= this.LOADOUT_SLOTS) return;

      const item = player.inventory[inventoryIndex];
      if (!item) return;

      console.log('Moving item from inventory to loadout:', {
          item,
          fromIndex: inventoryIndex,
          toSlot: loadoutSlot
      });

      // Create a copy of the current state
      const newInventory = [...player.inventory];
      const newLoadout = [...player.loadout];

      // Remove item from inventory
      newInventory.splice(inventoryIndex, 1);
      
      // If there's an item in the loadout slot, move it to inventory
      const existingItem = newLoadout[loadoutSlot];
      if (existingItem) {
          newInventory.push(existingItem);
      }

      // Equip new item to loadout
      newLoadout[loadoutSlot] = item;

      // Update player's state
      player.inventory = newInventory;
      player.loadout = newLoadout;

      // Update server
      this.socket?.emit('updateLoadout', {
          loadout: newLoadout,
          inventory: newInventory
      });

      // Force immediate visual updates
      requestAnimationFrame(() => {
          this.updateInventoryDisplay();
          this.updateLoadoutDisplay();
      });

      console.log('Updated player state:', {
          inventory: player.inventory,
          loadout: player.loadout
      });
  }

  private useLoadoutItem(slot: number) {
    const player = this.players.get(this.socket?.id || '');
    if (!player || !player.loadout[slot]) return;

    const item = player.loadout[slot];
    if (!item || (item as any).onCooldown) return;  // Check for cooldown

    // Use the item
    this.socket?.emit('useItem', item.id);
    console.log('Used item:', item.id);

    // Listen for item effects
    this.socket?.on('speedBoostActive', (playerId: string) => {
        if (playerId === this.socket?.id) {
            this.speedBoostActive = true;
            console.log('Speed boost activated');
        }
    });

    // Show floating text based on item type and rarity
    const rarityMultipliers: Record<string, number> = {
        common: 1,
        uncommon: 1.5,
        rare: 2,
        epic: 2.5,
        legendary: 3,
        mythic: 4
    };
    const multiplier = item.rarity ? rarityMultipliers[item.rarity] : 1;

    switch (item.type) {
        case 'health_potion':
            this.showFloatingText(
                player.x,
                player.y - 30,
                `+${Math.floor(50 * multiplier)} HP`,
                '#32CD32',
                20
            );
            break;
        case 'speed_boost':
            this.showFloatingText(
                player.x,
                player.y - 30,
                `Speed Boost (${Math.floor(5 * multiplier)}s)`,
                '#4169E1',
                20
            );
            break;
        case 'shield':
            this.showFloatingText(
                player.x,
                player.y - 30,
                `Shield (${Math.floor(3 * multiplier)}s)`,
                '#FFD700',
                20
            );
            break;
    }

    // Add visual cooldown effect to the loadout slot
    const slot_element = document.querySelector(`.loadout-slot[data-slot="${slot}"]`);
    if (slot_element) {
        slot_element.classList.add('on-cooldown');
        
        // Remove cooldown class when cooldown is complete
        const cooldownTime = 10000 * (1 / multiplier);  // 10 seconds base, reduced by rarity
        setTimeout(() => {
            slot_element.classList.remove('on-cooldown');
        }, cooldownTime);
    }

    // Update displays
    if (this.isInventoryOpen) {
        this.updateInventoryDisplay();
    }
    this.updateLoadoutDisplay();
}

  private updateLoadoutDisplay() {
      const player = this.players.get(this.socket?.id || '');
      if (!player) return;

      const slots = document.querySelectorAll('.loadout-slot');
      slots.forEach((slot, index) => {
          // Clear existing content
          slot.innerHTML = '';

          // Add item if it exists in that slot
          const item = player.loadout[index];
          if (item) {
              const img = document.createElement('img');
              img.src = `./assets/${item.type}.png`;
              img.alt = item.type;
              img.style.width = '80%';
              img.style.height = '80%';
              img.style.objectFit = 'contain';
              slot.appendChild(img);
          }

          // Add key binding text
          const keyText = document.createElement('div');
          keyText.className = 'key-binding';
          keyText.textContent = this.LOADOUT_KEY_BINDINGS[index];
          slot.appendChild(keyText);
      });
  }

  private setupDragAndDrop() {
      // Add global drop handler
      document.addEventListener('dragover', (e: Event) => {
          e.preventDefault();
      });

      document.addEventListener('drop', (e: Event) => {
          e.preventDefault();
          const dragEvent = e as DragEvent;
          const target = e.target as HTMLElement;
          
          // If not dropping on loadout slot or inventory grid, return item to inventory
          if (!target.closest('.loadout-slot') && !target.closest('.inventory-grid')) {
              const loadoutSlot = dragEvent.dataTransfer?.getData('text/loadoutSlot');
              if (loadoutSlot) {
                  this.moveItemToInventory(parseInt(loadoutSlot));
              }
          }
      });

      // Make loadout items draggable
      const updateLoadoutDraggable = () => {
          const slots = document.querySelectorAll('.loadout-slot');
          slots.forEach((slot, slotIndex) => {
              const img = slot.querySelector('img');
              if (img) {
                  img.draggable = true;
                  img.addEventListener('dragstart', (e: Event) => {
                      const dragEvent = e as DragEvent;
                      dragEvent.dataTransfer?.setData('text/loadoutSlot', slotIndex.toString());
                      dragEvent.dataTransfer!.effectAllowed = 'move';
                  });
              }
          });
      };

      // Update loadout items draggable state whenever the display updates
      const originalUpdateLoadoutDisplay = this.updateLoadoutDisplay.bind(this);
      this.updateLoadoutDisplay = () => {
          originalUpdateLoadoutDisplay();
          updateLoadoutDraggable();
      };

      // Handle drops on loadout slots
      const slots = document.querySelectorAll('.loadout-slot');
      slots.forEach((slot, slotIndex) => {
          // Set the slot index as a data attribute
          (slot as HTMLElement).dataset.slot = slotIndex.toString();

          slot.addEventListener('dragenter', (e: Event) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).classList.add('drag-over');
          });

          slot.addEventListener('dragover', (e: Event) => {
              e.preventDefault();
              const dragEvent = e as DragEvent;
              dragEvent.dataTransfer!.dropEffect = 'move';
              (e.currentTarget as HTMLElement).classList.add('drag-over');
          });

          slot.addEventListener('dragleave', (e: Event) => {
              (e.currentTarget as HTMLElement).classList.remove('drag-over');
          });

          slot.addEventListener('drop', (e: Event) => {
              e.preventDefault();
              const dragEvent = e as DragEvent;
              const target = e.currentTarget as HTMLElement;
              target.classList.remove('drag-over');
              
              // Check if the drop is from inventory or loadout
              const inventoryIndex = dragEvent.dataTransfer?.getData('text/plain');
              const fromLoadoutSlot = dragEvent.dataTransfer?.getData('text/loadoutSlot');
              
              if (inventoryIndex) {
                  // Drop from inventory to loadout
                  const index = parseInt(inventoryIndex);
                  const slot = parseInt(target.dataset.slot || '-1');
                  if (index >= 0 && slot >= 0) {
                      this.equipItemToLoadout(index, slot);
                  }
              } else if (fromLoadoutSlot) {
                  // Drop from loadout to loadout (swap items)
                  const fromSlot = parseInt(fromLoadoutSlot);
                  const toSlot = slotIndex;
                  if (fromSlot !== toSlot) {
                      this.swapLoadoutItems(fromSlot, toSlot);
                  }
              }
          });
      });

      // Make inventory panel a drop target for loadout items
      if (this.inventoryPanel) {
          const grid = this.inventoryPanel.querySelector('.inventory-grid');
          if (grid) {
              grid.addEventListener('dragover', (e: Event) => {
                  e.preventDefault();
                  const dragEvent = e as DragEvent;
                  dragEvent.dataTransfer!.dropEffect = 'move';
                  grid.classList.add('drag-over');
              });

              grid.addEventListener('dragleave', (e: Event) => {
                  grid.classList.remove('drag-over');
              });

              grid.addEventListener('drop', (e: Event) => {
                  e.preventDefault();
                  grid.classList.remove('drag-over');
                  const dragEvent = e as DragEvent;
                  const loadoutSlot = dragEvent.dataTransfer?.getData('text/loadoutSlot');
                  if (loadoutSlot) {
                      this.moveItemToInventory(parseInt(loadoutSlot));
                  }
              });
          }
      }
  }

  // Add method to swap loadout items
  private swapLoadoutItems(fromSlot: number, toSlot: number) {
      const player = this.players.get(this.socket?.id || '');
      if (!player) return;

      const newLoadout = [...player.loadout];
      [newLoadout[fromSlot], newLoadout[toSlot]] = [newLoadout[toSlot], newLoadout[fromSlot]];

      // Update player's state
      player.loadout = newLoadout;

      // Update server
      this.socket?.emit('updateLoadout', {
          loadout: newLoadout,
          inventory: player.inventory
      });

      // Force immediate visual updates
      this.updateLoadoutDisplay();
  }

  // Update the updateInventoryDisplay method
  private updateInventoryDisplay() {
      if (!this.inventoryPanel) return;
      
      const player = this.players.get(this.socket?.id || '');
      if (!player) return;

      const content = this.inventoryPanel.querySelector('.inventory-content');
      if (!content) return;
      
      content.innerHTML = '';

      // Add inventory title
      const title = document.createElement('h2');
      title.textContent = 'Inventory';
      content.appendChild(title);

      // Group items by rarity
      const itemsByRarity: Record<string, Item[]> = {
          mythic: [],
          legendary: [],
          epic: [],
          rare: [],
          uncommon: [],
          common: []
      };

      // Sort items into rarity groups
      player.inventory.forEach(item => {
          const rarity = item.rarity || 'common';
          itemsByRarity[rarity].push(item);
      });

      // Create inventory grid container
      const gridContainer = document.createElement('div');
      gridContainer.className = 'inventory-grid-container';
      gridContainer.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
      `;

      // Create rows for each rarity that has items
      Object.entries(itemsByRarity).forEach(([rarity, items]) => {
          if (items.length > 0) {
              // Create rarity row container
              const rarityRow = document.createElement('div');
              rarityRow.className = 'rarity-row';
              rarityRow.style.cssText = `
                  display: flex;
                  flex-direction: column;
                  gap: 5px;
              `;

              // Add rarity label
              const rarityLabel = document.createElement('div');
              rarityLabel.textContent = rarity.toUpperCase();
              rarityLabel.style.cssText = `
                  color: ${this.ITEM_RARITY_COLORS[rarity]};
                  font-weight: bold;
                  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                  padding-left: 5px;
              `;
              rarityRow.appendChild(rarityLabel);

              // Create grid for this rarity's items
              const grid = document.createElement('div');
              grid.className = 'inventory-grid';
              grid.style.cssText = `
                  display: flex;
                  flex-wrap: wrap;
                  gap: 5px;
                  padding: 5px;
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 5px;
                  border: 1px solid ${this.ITEM_RARITY_COLORS[rarity]}40;
              `;

              // Add items to grid
              items.forEach(item => {
                  const itemElement = document.createElement('div');
                  itemElement.className = 'inventory-item';
                  itemElement.draggable = true;

                  // Style for item slot
                  itemElement.style.cssText = `
                      position: relative;
                      width: 50px;
                      height: 50px;
                      background-color: ${this.ITEM_RARITY_COLORS[rarity]}20;
                      border: 2px solid ${this.ITEM_RARITY_COLORS[rarity]};
                      border-radius: 5px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                      transition: all 0.2s ease;
                  `;

                  // Add hover effect
                  itemElement.addEventListener('mouseover', () => {
                      itemElement.style.transform = 'scale(1.05)';
                      itemElement.style.boxShadow = `0 0 10px ${this.ITEM_RARITY_COLORS[rarity]}`;
                  });

                  itemElement.addEventListener('mouseout', () => {
                      itemElement.style.transform = 'scale(1)';
                      itemElement.style.boxShadow = 'none';
                  });

                  // Add drag functionality
                  itemElement.addEventListener('dragstart', (e) => {
                      const index = player.inventory.findIndex(i => i.id === item.id);
                      e.dataTransfer?.setData('text/plain', index.toString());
                      itemElement.classList.add('dragging');
                  });

                  itemElement.addEventListener('dragend', () => {
                      itemElement.classList.remove('dragging');
                  });

                  // Add item image
                  const img = document.createElement('img');
                  img.src = `./assets/${item.type}.png`;
                  img.alt = item.type;
                  img.draggable = false;
                  img.style.cssText = `
                      width: 40px;
                      height: 40px;
                      object-fit: contain;
                  `;

                  itemElement.appendChild(img);
                  grid.appendChild(itemElement);
              });

              rarityRow.appendChild(grid);
              gridContainer.appendChild(rarityRow);
          }
      });

      content.appendChild(gridContainer);
  }

  // Add this method to the Game class
  private moveItemToInventory(loadoutSlot: number) {
      const player = this.players.get(this.socket?.id || '');
      if (!player) return;

      const item = player.loadout[loadoutSlot];
      if (!item) return;

      console.log('Moving item from loadout to inventory:', {
          item,
          fromSlot: loadoutSlot
      });

      // Create a copy of the current state
      const newInventory = [...player.inventory];
      const newLoadout = [...player.loadout];

      // Move item to inventory
      newInventory.push(item);
      // Remove from loadout
      newLoadout[loadoutSlot] = null;

      // Update player's state
      player.inventory = newInventory;
      player.loadout = newLoadout;

      // Update server
      this.socket?.emit('updateLoadout', {
          loadout: newLoadout,
          inventory: newInventory
      });

      // Force immediate visual updates
      requestAnimationFrame(() => {
          this.updateInventoryDisplay();
          this.updateLoadoutDisplay();
      });

      console.log('Updated player state:', {
          inventory: player.inventory,
          loadout: player.loadout
      });
  }

  private showSaveIndicator() {
      if (!this.saveIndicator) return;

      // Clear any existing timeout
      if (this.saveIndicatorTimeout) {
          clearTimeout(this.saveIndicatorTimeout);
      }

      // Show the indicator
      this.saveIndicator.style.display = 'block';
      this.saveIndicator.style.opacity = '1';

      // Hide after 2 seconds
      this.saveIndicatorTimeout = setTimeout(() => {
          if (this.saveIndicator) {
              this.saveIndicator.style.opacity = '0';
              setTimeout(() => {
                  if (this.saveIndicator) {
                      this.saveIndicator.style.display = 'none';
                  }
              }, 300); // Match transition duration
          }
      }, 2000);
  }

  // Add this helper method to handle asset URLs
  private async getAssetUrl(filename: string): Promise<string> {
      // Remove the file extension to get the asset key
      const assetKey = filename.replace('.png', '');
      
      // If running from file:// protocol, use base64 data
      if (window.location.protocol === 'file:') {
          // Get the base64 data from our assets
          const base64Data = IMAGE_ASSETS[assetKey as keyof typeof IMAGE_ASSETS];
          if (base64Data) {
              return base64Data;
          }
          console.error(`No base64 data found for asset: ${filename}`);
      }
      
      // Otherwise use normal URL
      return `./assets/${filename}`;
  }

  // Update the sanitizeHTML method to handle script tags
  private sanitizeHTML(str: string): string {
      // Add 'script' to allowed tags
      const allowedTags = new Set(['b', 'i', 'u', 'strong', 'em', 'span', 'color', 'blink', 'script']);
      const allowedAttributes = new Set(['style', 'color']);
      
      // Create a temporary div to parse HTML
      const temp = document.createElement('div');
      temp.innerHTML = str;
      
      // Recursive function to sanitize nodes
      const sanitizeNode = (node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              const tagName = element.tagName.toLowerCase();
              
              if (tagName === 'script') {
                  // Generate unique ID for this script
                  const scriptId = 'script_' + Math.random().toString(36).substr(2, 9);
                  
                  // Store the script content
                  this.pendingScripts.set(scriptId, {
                      id: scriptId,
                      code: element.textContent || '',
                      sender: 'Unknown' // Will be set properly in addChatMessage
                  });
                  
                  // Replace script with a warning button
                  const warningBtn = document.createElement('button');
                  warningBtn.className = 'script-warning';
                  warningBtn.setAttribute('data-script-id', scriptId);
                  warningBtn.style.cssText = `
                      background: rgba(255, 165, 0, 0.2);
                      border: 1px solid orange;
                      color: white;
                      padding: 2px 5px;
                      border-radius: 3px;
                      cursor: pointer;
                      font-size: 12px;
                      margin: 0 5px;
                  `;
                  warningBtn.textContent = '⚠️ Click to run script';
                  
                  // Replace the script node with our warning button
                  node.parentNode?.replaceChild(warningBtn, node);
                  return;
              }
              
              // Remove node if tag is not allowed
              if (!allowedTags.has(tagName)) {
                  node.parentNode?.removeChild(node);
                  return;
              }
              
              // Add blinking animation for blink tag
              if (tagName === 'blink') {
                  element.style.animation = 'blink 1s step-start infinite';
              }
              
              // Remove disallowed attributes
              Array.from(element.attributes).forEach(attr => {
                  if (!allowedAttributes.has(attr.name.toLowerCase())) {
                      element.removeAttribute(attr.name);
                  }
              });
              
              // Sanitize style attribute
              const style = element.getAttribute('style');
              if (style) {
                  // Allow color and animation styles
                  const safeStyle = style.split(';')
                      .filter(s => {
                          const prop = s.trim().toLowerCase();
                          return prop.startsWith('color:') || prop.startsWith('animation:');
                      })
                      .join(';');
                  if (safeStyle) {
                      element.setAttribute('style', safeStyle);
                  } else {
                      element.removeAttribute('style');
                  }
              }
              
              // Recursively sanitize child nodes
              Array.from(node.childNodes).forEach(sanitizeNode);
          }
      };
      
      // Sanitize all nodes
      Array.from(temp.childNodes).forEach(sanitizeNode);
      
      return temp.innerHTML;
  }

  // Add method to create sandbox and run script
  private createSandbox(script: SandboxedScript): void {
      // Create modal for confirmation
      const modal = document.createElement('div');
      modal.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 20px;
          border-radius: 5px;
          border: 1px solid orange;
          color: white;
          z-index: 2000;
          font-family: Arial, sans-serif;
          max-width: 80%;
      `;

      const content = document.createElement('div');
      content.innerHTML = `
          <h3 style="color: orange;">⚠️ Warning: Script Execution</h3>
          <p>Script from user: ${script.sender}</p>
          <pre style="
              background: rgba(255, 255, 255, 0.1);
              padding: 10px;
              border-radius: 3px;
              max-height: 200px;
              overflow-y: auto;
              white-space: pre-wrap;
          ">${script.code}</pre>
          <p style="color: orange;">This script will run in a sandboxed environment with limited capabilities.</p>
      `;

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
          display: flex;
          gap: 10px;
          margin-top: 15px;
          justify-content: center;
      `;

      const runButton = document.createElement('button');
      runButton.textContent = 'Run Script';
      runButton.style.cssText = `
          background: orange;
          color: black;
          border: none;
          padding: 5px 15px;
          border-radius: 3px;
          cursor: pointer;
      `;

      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.cssText = `
          background: #666;
          color: white;
          border: none;
          padding: 5px 15px;
          border-radius: 3px;
          cursor: pointer;
      `;

      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(runButton);
      modal.appendChild(content);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

      // Handle button clicks
      cancelButton.onclick = () => {
          document.body.removeChild(modal);
      };

      runButton.onclick = () => {
          try {
              // Create sandbox iframe
              const sandbox = document.createElement('iframe');
              sandbox.style.display = 'none';
              document.body.appendChild(sandbox);

              // Create restricted context
              const restrictedWindow = sandbox.contentWindow as SandboxWindow;
              if (restrictedWindow) {
                  // Define allowed APIs
                  const safeContext = {
                      console: {
                          log: (...args: any[]) => {
                              this.addChatMessage({
                                  sender: 'Script Output',
                                  content: args.join(' '),
                                  timestamp: Date.now()
                              });
                          }
                      },
                      alert: (msg: string) => {
                          this.addChatMessage({
                              sender: 'Script Alert',
                              content: msg,
                              timestamp: Date.now()
                          });
                      },
                      // Add more safe APIs as needed
                  };

                  // Run the script in sandbox using Function constructor instead of eval
                  const wrappedCode = `
                      try {
                          const runScript = new Function('safeContext', 'with (safeContext) { ${script.code} }');
                          runScript(${JSON.stringify(safeContext)});
                      } catch (error) {
                          console.log('Script Error:', error.message);
                      }
                  `;

                  // Use Function constructor instead of direct eval
                  const scriptRunner = new Function('safeContext', wrappedCode);
                  scriptRunner(safeContext);
              }

              // Cleanup
              document.body.removeChild(sandbox);
              document.body.removeChild(modal);
          } catch (error) {
              this.addChatMessage({
                  sender: 'Script Error',
                  content: `Failed to execute script: ${error}`,
                  timestamp: Date.now()
              });
              document.body.removeChild(modal);
          }
      };
  }

  // Update addChatMessage to handle script buttons
  private addChatMessage(message: { sender: string; content: string; timestamp: number }) {
      if (!this.chatMessages) return;
      
      const messageElement = document.createElement('div');
      messageElement.className = 'chat-message';
      messageElement.style.cssText = `
          margin: 2px 0;
          font-size: 14px;
          word-wrap: break-word;
          font-family: Arial, sans-serif;
      `;
      
      const time = new Date(message.timestamp).toLocaleTimeString();
      
      // Update pending scripts with sender information
      const sanitizedContent = this.sanitizeHTML(message.content);
      this.pendingScripts.forEach(script => {
          script.sender = message.sender;
      });
      
      messageElement.innerHTML = `
          <span class="chat-time" style="color: rgba(255, 255, 255, 0.6);">[${time}]</span>
          <span class="chat-sender" style="color: #00ff00;">${message.sender}:</span>
          <span style="color: white;">${sanitizedContent}</span>
      `;
      
      // Add click handlers for script buttons
      messageElement.querySelectorAll('.script-warning').forEach(button => {
          button.addEventListener('click', () => {
              const scriptId = (button as HTMLElement).getAttribute('data-script-id');
              if (scriptId) {
                  const script = this.pendingScripts.get(scriptId);
                  if (script) {
                      this.createSandbox(script);
                      this.pendingScripts.delete(scriptId);
                  }
              }
          });
      });
      
      this.chatMessages.appendChild(messageElement);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
      
      while (this.chatMessages.children.length > 100) {
          this.chatMessages.removeChild(this.chatMessages.firstChild!);
      }
  }

  // Update the help message in initializeChat
  private initializeChat() {
      // Add blink animation style to document
      const style = document.createElement('style');
      style.textContent = `
          @keyframes blink {
              50% { opacity: 0; }
          }
      `;
      document.head.appendChild(style);

      // Create chat container with updated styling
      this.chatContainer = document.createElement('div');
      this.chatContainer.className = 'chat-container';
      this.chatContainer.style.cssText = `
          position: fixed;
          bottom: 10px;
          left: 10px;
          width: 300px;
          height: 200px;
          background: transparent;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          font-family: Arial, sans-serif;
      `;
      
      // Create messages container with transparent background
      this.chatMessages = document.createElement('div');
      this.chatMessages.className = 'chat-messages';
      this.chatMessages.style.cssText = `
          flex-grow: 1;
          overflow-y: auto;
          padding: 5px;
          color: white;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          background: transparent;
          font-family: Arial, sans-serif;
      `;
      
      // Create input container
      const inputContainer = document.createElement('div');
      inputContainer.className = 'chat-input-container';
      inputContainer.style.cssText = `
          padding: 5px;
          background: transparent;
          font-family: Arial, sans-serif;
      `;
      
      // Create input field with semi-transparent background
      this.chatInput = document.createElement('input');
      this.chatInput.type = 'text';
      this.chatInput.placeholder = 'Press Enter to chat...';
      this.chatInput.className = 'chat-input';
      this.chatInput.style.cssText = `
          width: 100%;
          padding: 5px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.3);
          color: white;
          outline: none;
          font-family: Arial, sans-serif;
      `;
      
      // Add event listeners
      this.chatInput.addEventListener('focus', () => {
          this.isChatFocused = true;
          // Make input background slightly more opaque when focused
          this.chatInput!.style.background = 'rgba(0, 0, 0, 0.5)';
      });
      
      this.chatInput.addEventListener('blur', () => {
          this.isChatFocused = false;
          // Restore original transparency when blurred
          this.chatInput!.style.background = 'rgba(0, 0, 0, 0.3)';
      });
      
      // Update the help message to include blink tag
      this.chatInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && this.chatInput?.value.trim()) {
              if (this.chatInput.value.trim().toLowerCase() === '/help') {
                  this.addChatMessage({
                      sender: 'System',
                      content: `Available HTML tags: 
                          <b>bold</b>, 
                          <i>italic</i>, 
                          <u>underline</u>, 
                          <span style="color: red">colored text</span>,
                          <blink>blinking text</blink>,
                          <script>console.log('Hello!')</script> (sandboxed). 
                          Example: Hello <b>world</b> in <span style="color: #ff0000">red</span> and <blink>blinking</blink>!
                          Script example: <script>alert('Hello from script!');</script>`,
                      timestamp: Date.now()
                  });
                  this.chatInput.value = '';
                  return;
              }
              
              this.socket.emit('chatMessage', this.chatInput.value.trim());
              this.chatInput.value = '';
          }
      });
      
      // Assemble chat UI
      inputContainer.appendChild(this.chatInput);
      this.chatContainer.appendChild(this.chatMessages);
      this.chatContainer.appendChild(inputContainer);
      document.body.appendChild(this.chatContainer);
      
      // Request chat history
      this.socket.emit('requestChatHistory');
  }

  // Add to Game class properties
  private initializeCrafting() {
      // Create crafting panel
      this.craftingPanel = document.createElement('div');
      this.craftingPanel.id = 'craftingPanel';
      this.craftingPanel.className = 'crafting-panel';
      this.craftingPanel.style.display = 'none';

      // Create crafting grid
      const craftingGrid = document.createElement('div');
      craftingGrid.className = 'crafting-grid';
      
      // Create 4 crafting slots
      for (let i = 0; i < 4; i++) {
          const slot = document.createElement('div');
          slot.className = 'crafting-slot';
          slot.dataset.index = i.toString();
          
          // Add drop zone functionality
          slot.addEventListener('dragover', (e) => {
              e.preventDefault();
              slot.classList.add('drag-over');
          });
          
          slot.addEventListener('dragleave', () => {
              slot.classList.remove('drag-over');
          });
          
          slot.addEventListener('drop', (e) => {
              e.preventDefault();
              slot.classList.remove('drag-over');
              const itemIndex = e.dataTransfer?.getData('text/plain');
              if (itemIndex) {
                  this.addItemToCraftingSlot(parseInt(itemIndex), i);
              }
          });
          
          craftingGrid.appendChild(slot);
      }

      // Create craft button
      const craftButton = document.createElement('button');
      craftButton.className = 'craft-button';
      craftButton.textContent = 'Craft';
      craftButton.addEventListener('click', () => this.craftItems());

      this.craftingPanel.appendChild(craftingGrid);
      this.craftingPanel.appendChild(craftButton);
      document.body.appendChild(this.craftingPanel);

      // Add crafting styles
      const style = document.createElement('style');
      style.textContent = `
          .crafting-panel {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(0, 0, 0, 0.9);
              padding: 20px;
              border-radius: 10px;
              border: 2px solid #666;
              display: none;
              z-index: 1000;
          }

          .crafting-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-bottom: 20px;
          }

          .crafting-slot {
              width: 60px;
              height: 60px;
              background: rgba(255, 255, 255, 0.1);
              border: 2px solid #666;
              border-radius: 5px;
              display: flex;
              align-items: center;
              justify-content: center;
          }

          .crafting-slot.drag-over {
              border-color: #00ff00;
              background: rgba(0, 255, 0, 0.2);
          }

          .craft-button {
              width: 100%;
              padding: 10px;
              background: #4CAF50;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
          }

          .craft-button:hover {
              background: #45a049;
          }

          .craft-button:disabled {
              background: #666;
              cursor: not-allowed;
          }
      `;
      document.head.appendChild(style);
  }

  // Add to Game class properties
  private toggleCrafting() {
      if (!this.craftingPanel) return;
      
      this.isCraftingOpen = !this.isCraftingOpen;
      this.craftingPanel.style.display = this.isCraftingOpen ? 'block' : 'none';
      
      if (this.isCraftingOpen) {
          this.updateCraftingDisplay();
      }
  }

  // Add to Game class properties
  private addItemToCraftingSlot(inventoryIndex: number, slotIndex: number) {
      const player = this.players.get(this.socket?.id || '');
      if (!player) return;

      const item = player.inventory[inventoryIndex];
      if (!item) return;

      // Check if slot already has an item
      if (this.craftingSlots[slotIndex].item) {
          return;
      }

      // Check if item can be added (same type and rarity as other items)
      const existingItems = this.craftingSlots.filter(slot => slot.item !== null);
      if (existingItems.length > 0) {
          const firstItem = existingItems[0].item!;
          if (item.type !== firstItem.type || item.rarity !== firstItem.rarity) {
              this.showFloatingText(
                  this.canvas.width / 2,
                  50,
                  'Items must be of the same type and rarity!',
                  '#FF0000',
                  20
              );
              return;
          }
      }

      // Add item to crafting slot
      this.craftingSlots[slotIndex].item = item;
      
      // Remove item from inventory
      player.inventory.splice(inventoryIndex, 1);

      // Update displays
      this.updateCraftingDisplay();
      this.updateInventoryDisplay();
  }

  // Add to Game class properties
  private craftItems() {
      const player = this.players.get(this.socket?.id || '');
      if (!player) return;

      // Check if all slots are filled
      if (!this.craftingSlots.every(slot => slot.item !== null)) {
          this.showFloatingText(
              this.canvas.width / 2,
              50,
              'All slots must be filled to craft!',
              '#FF0000',
              20
          );
          return;
      }

      // Get first item to check type and rarity
      const firstItem = this.craftingSlots[0].item!;
      const currentRarity = firstItem.rarity || 'common';

      // Define rarity upgrade path
      const rarityUpgrades: Record<string, string> = {
          common: 'uncommon',
          uncommon: 'rare',
          rare: 'epic',
          epic: 'legendary',
          legendary: 'mythic'
      };

      // Check if items can be upgraded
      if (!rarityUpgrades[currentRarity]) {
          this.showFloatingText(
              this.canvas.width / 2,
              50,
              'Cannot upgrade mythic items!',
              '#FF0000',
              20
          );
          return;
      }

      // Create new upgraded item
      const newItem: Item = {
          id: Math.random().toString(36).substr(2, 9),
          type: firstItem.type,
          x: 0,
          y: 0,
          rarity: rarityUpgrades[currentRarity] as Item['rarity']
      };

      // Add new item to inventory
      player.inventory.push(newItem);

      // Clear crafting slots
      this.craftingSlots.forEach(slot => slot.item = null);

      // Show success message
      this.showFloatingText(
          this.canvas.width / 2,
          50,
          `Successfully crafted ${newItem.rarity} ${newItem.type}!`,
          this.ITEM_RARITY_COLORS[newItem.rarity || 'common'],
          24
      );

      // Update displays
      this.updateCraftingDisplay();
      this.updateInventoryDisplay();

      // Emit inventory update
      this.socket?.emit('updateInventory', player.inventory);
  }

  // Add to Game class properties
  private updateCraftingDisplay() {
      const slots = document.querySelectorAll('.crafting-slot');
      slots.forEach((slot, index) => {
          // Clear existing content
          slot.innerHTML = '';

          const craftingSlot = this.craftingSlots[index];
          if (craftingSlot.item) {
              const img = document.createElement('img');
              img.src = `./assets/${craftingSlot.item.type}.png`;
              img.alt = craftingSlot.item.type;
              img.style.width = '80%';
              img.style.height = '80%';
              img.style.objectFit = 'contain';

              // Add rarity border color
              if (craftingSlot.item.rarity) {
                  (slot as HTMLElement).style.borderColor = this.ITEM_RARITY_COLORS[craftingSlot.item.rarity];
              }

              slot.appendChild(img);
          } else {
              (slot as HTMLElement).style.borderColor = '#666';
          }
      });
  }
}