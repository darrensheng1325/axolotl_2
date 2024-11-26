import { Player } from './player';
import { Dot, Enemy, Obstacle } from './enemy';
import { io, Socket } from 'socket.io-client';
import { Item } from './item';
import { workerBlob } from './workerblob';
import { IMAGE_ASSETS } from './imageAssets';
import { SVGLoader } from './SVGLoader';
import { WORLD_MAP, MapElement, isWall, isSafeZone, isTeleporter, ACTUAL_WORLD_WIDTH, ACTUAL_WORLD_HEIGHT, SCALE_FACTOR, PLAYER_SIZE } from './constants';

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
  private readonly PLAYER_ACCELERATION = 0.5;  // Adjusted for smoother acceleration
  private readonly MAX_SPEED = 6;             // Balanced speed
  private readonly FRICTION = 0.95;           // Smoother deceleration
  private cameraX = 0;
  private cameraY = 0;
  private readonly WORLD_WIDTH = ACTUAL_WORLD_WIDTH;  // Increased from 2000 to 10000
  private readonly WORLD_HEIGHT = ACTUAL_WORLD_HEIGHT;  // Keep height the same
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
  private readonly MINIMAP_WIDTH = 200;  // Increased from 40
  private readonly MINIMAP_HEIGHT = 200; // Made square for better visibility
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
  private showHitboxes: boolean = false;  // Changed from true to false
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
  private svgLoader: SVGLoader;
  // Add to class properties
  private walls: Array<{x: number, y: number, element: SVGElement}> = [];
  private readonly WALL_SPACING = 500; // Distance between walls
  private world_map_data: MapElement[] = [];

  // Add map rendering properties
  private readonly MAP_COLORS = {
      wall: 'rgba(102, 102, 102, 0.8)',
      spawn: 'rgba(76, 175, 80, 0.3)',
      teleporter: 'rgba(33, 150, 243, 0.5)',
      safe_zone: 'rgba(255, 193, 7, 0.2)'
  };

  private lastUpdateTime: number = 0;         // Add this property for delta time
  private lastServerUpdate: number = 0;       // Add this property for server update time

  // Add to class properties at the top
  private backgroundImage: HTMLImageElement = new Image();

  private wallTexture: HTMLImageElement = new Image(); // Add this to class properties

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

      this.svgLoader = new SVGLoader();
      this.loadAssets();

      // Listen for map data from the server
      this.socket.on('mapData', (mapData: MapElement[]) => {
          this.renderMap(mapData);
      });

      // Load background image
      this.backgroundImage.src = 'data:image/png;base64,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';
      this.backgroundImage.onload = () => {
          console.log('Background image loaded successfully');
      };

      // Load wall texture
      this.wallTexture.src = 'data:image/png;base64,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';
      this.wallTexture.onload = () => {
          console.log('Wall texture loaded successfully');
      };
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

      this.socket.on('craftingSuccess', (data: { newItem: Item; inventory: Item[] }) => {
          const player = this.players.get(this.socket?.id || '');
          if (player) {
              player.inventory = data.inventory;
              
              this.showFloatingText(
                  this.canvas.width / 2,
                  50,
                  `Successfully crafted ${data.newItem.rarity} ${data.newItem.type}!`,
                  this.ITEM_RARITY_COLORS[data.newItem.rarity || 'common'],
                  24
              );

              this.updateInventoryDisplay();
          }
      });

      this.socket.on('craftingFailed', (message: string) => {
          this.showFloatingText(
              this.canvas.width / 2,
              50,
              message,
              '#FF0000',
              20
          );

          // Return items to inventory
          const player = this.players.get(this.socket?.id || '');
          if (player) {
              this.craftingSlots.forEach(slot => {
                  if (slot.item) {
                      player.inventory.push(slot.item);
                  }
              });
              this.craftingSlots.forEach(slot => slot.item = null);
              
              this.updateCraftingDisplay();
              this.updateInventoryDisplay();
          }
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
    const player = this.players.get(this.socket?.id || '');
    if (!player) return;

    if (this.useMouseControls) {
        // Mouse controls
        const dx = this.mouseX - player.x;
        const dy = this.mouseY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {  // Add dead zone to prevent jittering
            const acceleration = this.PLAYER_ACCELERATION * (this.speedBoostActive ? 3 : 1);
            // Set velocity directly instead of adding to it
            player.velocityX = (dx / distance) * this.MAX_SPEED;
            player.velocityY = (dy / distance) * this.MAX_SPEED;
            player.angle = Math.atan2(dy, dx);
        } else {
            player.velocityX = 0;
            player.velocityY = 0;
        }
    } else {
        // Keyboard controls
        let dx = 0;
        let dy = 0;

        if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('w')) dy -= 1;
        if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('s')) dy += 1;
        if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('a')) dx -= 1;
        if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('d')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;
            }

            // Set velocity directly instead of accumulating
            const speed = this.MAX_SPEED * (this.speedBoostActive ? 3 : 1);
            player.velocityX = dx * speed;
            player.velocityY = dy * speed;
            player.angle = Math.atan2(dy, dx);
        } else {
            // If no keys are pressed, stop movement
            player.velocityX = 0;
            player.velocityY = 0;
        }
    }

    // Send update to server
    this.socket.emit('playerMovement', {
        x: player.x,
        y: player.y,
        angle: player.angle,
        velocityX: player.velocityX,
        velocityY: player.velocityY
    });
}

  private updateCamera(player: Player) {
    // Center camera on player
    const targetX = player.x - this.canvas.width / 2;
    const targetY = player.y - this.canvas.height / 2;

    // Clamp camera to world bounds with proper dimensions
    this.cameraX = Math.max(0, Math.min(ACTUAL_WORLD_WIDTH - this.canvas.width, targetX));
    this.cameraY = Math.max(0, Math.min(ACTUAL_WORLD_HEIGHT - this.canvas.height, targetY));

    // Debug camera position
    if (this.showHitboxes) {
        console.log('Camera Position:', {
            x: this.cameraX,
            y: this.cameraY,
            playerX: player.x,
            playerY: player.y,
            worldWidth: ACTUAL_WORLD_WIDTH,
            worldHeight: ACTUAL_WORLD_HEIGHT
        });
    }
}

  private updatePlayerPosition(player: Player | undefined) {
    if (!player) return;

    // Calculate new position with velocity
    let newX = player.x + player.velocityX;
    let newY = player.y + player.velocityY;

    // Apply knockback if it exists
    if (player.knockbackX) {
        player.knockbackX *= this.FRICTION;
        newX += player.knockbackX;
        if (Math.abs(player.knockbackX) < 0.1) player.knockbackX = 0;
    }
    if (player.knockbackY) {
        player.knockbackY *= this.FRICTION;
        newY += player.knockbackY;
        if (Math.abs(player.knockbackY) < 0.1) player.knockbackY = 0;
    }

    // Constrain to world bounds
    newX = Math.max(0, Math.min(ACTUAL_WORLD_WIDTH - PLAYER_SIZE, newX));
    newY = Math.max(0, Math.min(ACTUAL_WORLD_HEIGHT - PLAYER_SIZE, newY));

    // Check wall collisions
    let collision = false;
    for (const element of this.world_map_data) {
        if (isWall(element)) {
            if (
                newX < element.x + element.width &&
                newX + PLAYER_SIZE > element.x &&
                newY < element.y + element.height &&
                newY + PLAYER_SIZE > element.y
            ) {
                collision = true;
                // Calculate push direction
                const centerX = element.x + element.width / 2;
                const centerY = element.y + element.height / 2;
                const dx = player.x - centerX;
                const dy = player.y - centerY;
                const angle = Math.atan2(dy, dx);
                
                // Push player away from wall
                newX = element.x + element.width / 2 + Math.cos(angle) * (element.width / 2 + PLAYER_SIZE);
                newY = element.y + element.height / 2 + Math.sin(angle) * (element.height / 2 + PLAYER_SIZE);
                
                // Stop movement in collision direction
                player.velocityX = 0;
                player.velocityY = 0;
                break;
            }
        }
    }

    // Update player position
    player.x = newX;
    player.y = newY;
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
    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 16.67; // Normalize to ~60 FPS
    this.lastUpdateTime = currentTime;

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tiled background
    const pattern = this.ctx.createPattern(this.backgroundImage, 'repeat');
    if (pattern) {
        this.ctx.save();
        // Apply camera transform to background
        this.ctx.translate(-this.cameraX * 0.5, -this.cameraY * 0.5); // Parallax effect
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(
            this.cameraX * 0.5, 
            this.cameraY * 0.5, 
            this.canvas.width + this.cameraX * 0.5, 
            this.canvas.height + this.cameraY * 0.5
        );
        this.ctx.restore();
    }

    // Get current player and update
    const currentSocketId = this.socket?.id;
    let currentPlayer: Player | undefined = undefined;
    if (currentSocketId) {
        currentPlayer = this.players.get(currentSocketId);
        if (currentPlayer) {
            this.updatePlayerMovement(currentPlayer, deltaTime);
            this.updateCamera(currentPlayer);
        }
    }

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    // Draw world bounds
    this.ctx.strokeStyle = 'black';
    this.ctx.strokeRect(0, 0, ACTUAL_WORLD_WIDTH, ACTUAL_WORLD_HEIGHT);

    // Draw zone boundaries
    const zoneWidth = ACTUAL_WORLD_WIDTH / 6;
    const zones = [
        { name: 'Common', color: 'rgba(128, 128, 128, 0.1)' },
        { name: 'Uncommon', color: 'rgba(144, 238, 144, 0.1)' },
        { name: 'Rare', color: 'rgba(0, 0, 255, 0.1)' },
        { name: 'Epic', color: 'rgba(128, 0, 128, 0.1)' },
        { name: 'Legendary', color: 'rgba(255, 165, 0, 0.1)' },
        { name: 'Mythic', color: 'rgba(255, 0, 0, 0.1)' }
    ];

    zones.forEach((zone, index) => {
        const x = index * zoneWidth;
        this.ctx.fillStyle = zone.color;
        this.ctx.fillRect(x, 0, zoneWidth, ACTUAL_WORLD_HEIGHT);
        
        // Draw zone name
        this.ctx.fillStyle = 'black';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(zone.name, x + 10, 30);
    });

    // Draw map elements
    this.drawMap();

    // Draw game objects
    this.drawGameObjects();

    this.ctx.restore();

    // Draw UI elements (after restore)
    this.drawUI();

    requestAnimationFrame(() => this.gameLoop());
}

private updatePlayerMovement(player: Player, deltaTime: number) {
    const currentTime = performance.now(); // Add this line at the start of the method
    
    // Calculate desired velocity based on input
    let targetVelocityX = 0;
    let targetVelocityY = 0;

    if (this.useMouseControls) {
        const dx = this.mouseX - player.x;
        const dy = this.mouseY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            const speed = this.MAX_SPEED * (this.speedBoostActive ? 2 : 1);
            targetVelocityX = (dx / distance) * speed;
            targetVelocityY = (dy / distance) * speed;
            player.angle = Math.atan2(dy, dx);
        }
    } else {
        // Keyboard controls
        if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('a')) targetVelocityX -= 1;
        if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('d')) targetVelocityX += 1;
        if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('w')) targetVelocityY -= 1;
        if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('s')) targetVelocityY += 1;

        // Normalize diagonal movement
        if (targetVelocityX !== 0 && targetVelocityY !== 0) {
            const length = Math.sqrt(targetVelocityX * targetVelocityX + targetVelocityY * targetVelocityY);
            targetVelocityX /= length;
            targetVelocityY /= length;
        }

        // Apply speed
        const speed = this.MAX_SPEED * (this.speedBoostActive ? 2 : 1);
        targetVelocityX *= speed;
        targetVelocityY *= speed;

        if (targetVelocityX !== 0 || targetVelocityY !== 0) {
            player.angle = Math.atan2(targetVelocityY, targetVelocityX);
        }
    }

    // Smoothly interpolate current velocity to target velocity
    const interpolationFactor = 1 - Math.pow(this.FRICTION, deltaTime);
    player.velocityX += (targetVelocityX - player.velocityX) * interpolationFactor;
    player.velocityY += (targetVelocityY - player.velocityY) * interpolationFactor;

    // Apply movement
    const newX = player.x + player.velocityX * deltaTime;
    const newY = player.y + player.velocityY * deltaTime;

    // Check world bounds and collisions
    const [finalX, finalY] = this.checkCollisions(player, newX, newY);
    player.x = finalX;
    player.y = finalY;

    // Send update to server less frequently
    if (currentTime - this.lastServerUpdate > 50) { // 20 updates per second
        this.socket.emit('playerMovement', {
            x: player.x,
            y: player.y,
            angle: player.angle,
            velocityX: player.velocityX,
            velocityY: player.velocityY
        });
        this.lastServerUpdate = currentTime;
    }
}

private checkCollisions(player: Player, newX: number, newY: number): [number, number] {
    // World bounds with padding
    const PADDING = PLAYER_SIZE / 2;
    let finalX = Math.max(PADDING, Math.min(ACTUAL_WORLD_WIDTH - PADDING, newX));
    let finalY = Math.max(PADDING, Math.min(ACTUAL_WORLD_HEIGHT - PADDING, newY));

    // Store original position for restoration if needed
    const originalX = player.x;
    const originalY = player.y;
    let isColliding = false;

    // Check wall collisions with improved corner handling
    for (const element of this.world_map_data) {
        if (isWall(element)) {
            const wallX = element.x;
            const wallY = element.y;
            const wallWidth = element.width;
            const wallHeight = element.height;

            // Add padding to wall collision box
            const WALL_PADDING = 5;
            if (
                finalX - PADDING < wallX + wallWidth + WALL_PADDING &&
                finalX + PADDING > wallX - WALL_PADDING &&
                finalY - PADDING < wallY + wallHeight + WALL_PADDING &&
                finalY + PADDING > wallY - WALL_PADDING
            ) {
                isColliding = true;

                // Calculate the closest point on the wall to the player
                const closestX = Math.max(wallX, Math.min(wallX + wallWidth, finalX));
                const closestY = Math.max(wallY, Math.min(wallY + wallHeight, finalY));

                // Calculate vector from closest point to player
                const dx = finalX - closestX;
                const dy = finalY - closestY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < PADDING) {
                    // Normalize the vector and push player out
                    if (distance > 0) {
                        finalX = closestX + (dx / distance) * (PADDING + 1);
                        finalY = closestY + (dy / distance) * (PADDING + 1);
                    } else {
                        // If distance is 0 (player exactly on wall), push in the direction of movement
                        const moveX = finalX - originalX;
                        const moveY = finalY - originalY;
                        const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
                        if (moveDist > 0) {
                            finalX = closestX - (moveX / moveDist) * (PADDING + 1);
                            finalY = closestY - (moveY / moveDist) * (PADDING + 1);
                        }
                    }

                    // Zero out velocity in collision direction
                    const vx = Math.abs(dx) > Math.abs(dy);
                    if (vx) player.velocityX = 0;
                    else player.velocityY = 0;
                }
            }
        }
    }

    // If stuck between multiple walls, restore original position
    if (isColliding) {
        let stillStuck = false;
        for (const element of this.world_map_data) {
            if (isWall(element)) {
                if (
                    finalX - PADDING < element.x + element.width &&
                    finalX + PADDING > element.x &&
                    finalY - PADDING < element.y + element.height &&
                    finalY + PADDING > element.y
                ) {
                    stillStuck = true;
                    break;
                }
            }
        }
        if (stillStuck) {
            finalX = originalX;
            finalY = originalY;
            player.velocityX = 0;
            player.velocityY = 0;
        }
    }

    return [finalX, finalY];
}

private drawGameObjects() {
    // Draw only objects that are within the viewport
    const viewport = {
        left: this.cameraX,
        right: this.cameraX + this.canvas.width,
        top: this.cameraY,
        bottom: this.cameraY + this.canvas.height
    };

    // Draw dots
    this.dots.forEach(dot => {
        if (this.isInViewport(dot.x, dot.y, viewport)) {
            this.ctx.fillStyle = 'yellow';
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, this.DOT_SIZE, 0, Math.PI * 2);
            this.ctx.fill();
        }
    });

    // Draw players
    this.players.forEach(player => {
        if (this.isInViewport(player.x, player.y, viewport)) {
            this.drawPlayer(player);
        }
    });

    // Draw enemies
    this.enemies.forEach(enemy => {
        if (this.isInViewport(enemy.x, enemy.y, viewport)) {
            this.drawEnemy(enemy);
        }
    });

    // Draw items
    this.items.forEach(item => {
        if (this.isInViewport(item.x, item.y, viewport)) {
            this.drawItem(item);
        }
    });
}

private isInViewport(x: number, y: number, viewport: { left: number, right: number, top: number, bottom: number }): boolean {
    return x >= viewport.left - 100 && 
           x <= viewport.right + 100 && 
           y >= viewport.top - 100 && 
           y <= viewport.bottom + 100;
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

  // Change from private to public
  public cleanup() {
    // Save progress before cleanup if in single player mode
    if (this.isSinglePlayer && this.socket?.id) {
        const player = this.players.get(this.socket.id);
        if (player) {
            this.savePlayerProgress(player);
        }
    }

    // Stop the game loop immediately to prevent further drawing
    if (this.gameLoopId) {
        cancelAnimationFrame(this.gameLoopId);
        this.gameLoopId = null;
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
    this.world_map_data = [];
    this.floatingTexts = [];
    this.decorations = [];
    this.sands = [];
    this.walls = [];

    // Define clear canvas function
    const clearCanvas = () => {
        // Clear the main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fill with white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Explicitly clear the minimap area
        const minimapX = this.canvas.width - this.MINIMAP_WIDTH - this.MINIMAP_PADDING;
        const minimapY = this.MINIMAP_PADDING;
        this.ctx.clearRect(
            minimapX - 5,
            minimapY - 5,
            this.MINIMAP_WIDTH + 10,
            this.MINIMAP_HEIGHT + 10
        );
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(
            minimapX - 5,
            minimapY - 5,
            this.MINIMAP_WIDTH + 10,
            this.MINIMAP_HEIGHT + 10
        );
    };

    // Clear multiple times to ensure everything is gone
    clearCanvas();
    requestAnimationFrame(clearCanvas);
    setTimeout(clearCanvas, 50);

    // Reset game state
    this.isInventoryOpen = false;
    this.isCraftingOpen = false;
    this.speedBoostActive = false;
    this.shieldActive = false;
    this.isPlayerDead = false;
    this.useMouseControls = false;

    // Hide all game UI elements
    if (this.inventoryPanel) this.inventoryPanel.style.display = 'none';
    if (this.craftingPanel) this.craftingPanel.style.display = 'none';
    if (this.chatContainer) this.chatContainer.style.display = 'none';
    if (this.saveIndicator) this.saveIndicator.style.display = 'none';

    // Clear loadout bar
    const loadoutBar = document.getElementById('loadoutBar');
    if (loadoutBar) {
        loadoutBar.style.display = 'none';
        // Clear all loadout slots
        const slots = loadoutBar.querySelectorAll('.loadout-slot');
        slots.forEach(slot => {
            slot.innerHTML = '';
        });
    }

    // Reset camera position
    this.cameraX = 0;
    this.cameraY = 0;

    // Clear any remaining timeouts or intervals
    if (this.saveIndicatorTimeout) {
        clearTimeout(this.saveIndicatorTimeout);
        this.saveIndicatorTimeout = null;
    }

    // Remove any event listeners
    this.keysPressed.clear();

    // Set canvas background to white
    this.canvas.style.backgroundColor = 'white';

    // Stop drawing the game loop
    this.gameLoopId = null;
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
    const minimapScale = {
        x: this.MINIMAP_WIDTH / ACTUAL_WORLD_WIDTH,
        y: this.MINIMAP_HEIGHT / ACTUAL_WORLD_HEIGHT
    };

    // Draw minimap background (white instead of black)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillRect(minimapX, minimapY, this.MINIMAP_WIDTH, this.MINIMAP_HEIGHT);

    // Draw only walls on minimap
    this.world_map_data.forEach(element => {
        // Only draw walls
        if (element.type === 'wall') {
            const scaledX = minimapX + (element.x * minimapScale.x);
            const scaledY = minimapY + (element.y * minimapScale.y);
            const scaledWidth = element.width * minimapScale.x;
            const scaledHeight = element.height * minimapScale.y;

            this.ctx.fillStyle = '#000000'; // Black for walls
            this.ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        }
    });

    // Draw all players on minimap with solid colors
    this.players.forEach(player => {
        this.ctx.fillStyle = player.id === this.socket.id ? '#FF0000' : '#000000'; // Red for current player, black for others
        this.ctx.beginPath();
        this.ctx.arc(
            minimapX + (player.x * minimapScale.x),
            minimapY + (player.y * minimapScale.y),
            4, // Slightly larger dots
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    });

    // Draw viewport rectangle in black
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
        minimapX + (this.cameraX * minimapScale.x),
        minimapY + (this.cameraY * minimapScale.y),
        (this.canvas.width * minimapScale.x),
        (this.canvas.height * minimapScale.y)
    );

    // Draw border
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(minimapX, minimapY, this.MINIMAP_WIDTH, this.MINIMAP_HEIGHT);
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
    
    // Show title screen elements with proper styling
    if (this.titleScreen) {
        this.titleScreen.style.display = 'flex';
        this.titleScreen.style.opacity = '1';
        this.titleScreen.style.zIndex = '1000';
        this.titleScreen.style.pointerEvents = 'auto';
    }

    if (this.nameInput) {
        this.nameInput.style.display = 'block';
        this.nameInput.style.opacity = '1';
        this.nameInput.value = ''; // Clear the input
    }

    // Hide exit button
    this.hideExitButton();

    // Show game menu with proper styling
    const gameMenu = document.getElementById('gameMenu');
    if (gameMenu) {
        gameMenu.style.display = 'flex';
        gameMenu.style.opacity = '1';
        gameMenu.style.zIndex = '3000';
        gameMenu.style.pointerEvents = 'auto';
    }

    // Reset canvas state
    this.canvas.style.zIndex = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.backgroundColor = 'white';

    // Clear any remaining timeouts or intervals
    if (this.saveIndicatorTimeout) {
        clearTimeout(this.saveIndicatorTimeout);
        this.saveIndicatorTimeout = null;
    }

    // Remove any event listeners
    this.keysPressed.clear();
    
    // Force multiple clear attempts to ensure everything is gone
    for (let i = 0; i < 3; i++) {
        requestAnimationFrame(() => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        });
    }
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

      // Get items for crafting
      const craftingItems = this.craftingSlots
          .map(slot => slot.item)
          .filter((item): item is Item => item !== null);

      // Send crafting request to server
      this.socket?.emit('craftItems', { items: craftingItems });

      // Clear crafting slots immediately for responsiveness
      this.craftingSlots.forEach(slot => slot.item = null);
      this.updateCraftingDisplay();
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

  private async loadAssets() {
      try {
          // Load SVG assets
          await this.svgLoader.loadSVG('/src/land.svg');
          await this.svgLoader.loadSVG('/src/axolotl.svg');
          await this.initializeWalls(); // Add this line
      } catch (error) {
          console.error('Failed to load game assets:', error);
      }
  }

  // Example method to render an SVG
  private renderGameElement(elementId: string, svgPath: string) {
      const container = document.getElementById(elementId);
      if (container) {
          this.svgLoader.renderSVG(svgPath, container);
      }
  }

  // Add to class properties
  private async initializeWalls() {
    try {
        // Create a grid-based maze layout
        const GRID_SIZE = 10; // Size of each grid cell
        const GRID_COLS = Math.floor(this.WORLD_WIDTH / (this.WALL_SPACING * GRID_SIZE));
        const GRID_ROWS = Math.floor(this.WORLD_HEIGHT / (this.WALL_SPACING * GRID_SIZE));
        
        // Create maze pattern
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                // Add random walls with 30% probability
                if (Math.random() < 0.3) {
                    const x = col * this.WALL_SPACING * GRID_SIZE;
                    const y = row * this.WALL_SPACING * GRID_SIZE;
                    
                    // Randomly choose horizontal or vertical wall
                    if (Math.random() < 0.5) {
                        // Horizontal wall
                        for (let i = 0; i < GRID_SIZE; i++) {
                            const wall = await this.svgLoader.loadSVG('/src/land.svg');
                            this.walls.push({
                                x: x + (i * this.WALL_SPACING),
                                y: y,
                                element: wall
                            });
                        }
                    } else {
                        // Vertical wall
                        for (let i = 0; i < GRID_SIZE; i++) {
                            const wall = await this.svgLoader.loadSVG('/src/land.svg');
                            this.walls.push({
                                x: x,
                                y: y + (i * this.WALL_SPACING),
                                element: wall
                            });
                        }
                    }
                }
            }
        }

        // Always add boundary walls
        // Top and bottom walls
        for (let x = 0; x < this.WORLD_WIDTH; x += this.WALL_SPACING) {
            const topWall = await this.svgLoader.loadSVG('/src/land.svg');
            const bottomWall = await this.svgLoader.loadSVG('/src/land.svg');
            this.walls.push(
                { x, y: 0, element: topWall },
                { x, y: this.WORLD_HEIGHT - 100, element: bottomWall }
            );
        }

        // Left and right walls
        for (let y = 0; y < this.WORLD_HEIGHT; y += this.WALL_SPACING) {
            const leftWall = await this.svgLoader.loadSVG('/src/land.svg');
            const rightWall = await this.svgLoader.loadSVG('/src/land.svg');
            this.walls.push(
                { x: 0, y, element: leftWall },
                { x: this.WORLD_WIDTH - 100, y, element: rightWall }
            );
        }

        console.log(`Generated ${this.walls.length} walls`);
    } catch (error) {
        console.error('Failed to initialize walls:', error);
    }
}

  // Update the drawWalls method to be more efficient
  private drawWalls() {
    // Create a single temporary canvas for all walls
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 100;
    tempCanvas.height = 100;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;

    this.walls.forEach(wall => {
        // Only draw walls that are within the viewport
        if (
            wall.x + 100 >= this.cameraX && 
            wall.x <= this.cameraX + this.canvas.width &&
            wall.y + 100 >= this.cameraY && 
            wall.y <= this.cameraY + this.canvas.height
        ) {
            // Draw the wall
            this.ctx.save();
            this.ctx.translate(wall.x, wall.y);
            
            // Convert SVG to image if not already converted
            if (!wall.element.hasAttribute('rendered')) {
                const svgData = new XMLSerializer().serializeToString(wall.element);
                const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                const url = URL.createObjectURL(svgBlob);
                
                const img = new Image();
                img.onload = () => {
                    tempCtx.clearRect(0, 0, 100, 100);
                    tempCtx.drawImage(img, 0, 0, 100, 100);
                    this.ctx.drawImage(tempCanvas, 0, 0);
                    URL.revokeObjectURL(url);
                    wall.element.setAttribute('rendered', 'true');
                };
                img.src = url;
            } else {
                // Use cached rendering
                this.ctx.drawImage(tempCanvas, 0, 0);
            }
            
            this.ctx.restore();
        }
    });
}

  private drawMap() {
      // Draw all map elements
      this.world_map_data.forEach(element => {
          const x = element.x;
          const y = element.y;
          const width = element.width;
          const height = element.height;

          // Only draw elements that are visible in the viewport
          if (
              x + width >= this.cameraX &&
              x <= this.cameraX + this.canvas.width &&
              y + height >= this.cameraY &&
              y <= this.cameraY + this.canvas.height
          ) {
              if (element.type === 'wall') {
                  // Draw wall texture tiled
                  const pattern = this.ctx.createPattern(this.wallTexture, 'repeat');
                  if (pattern) {
                      this.ctx.save();
                      this.ctx.fillStyle = pattern;
                      this.ctx.fillRect(x, y, width, height);
                      this.ctx.restore();
                  }
              } else {
                  // Draw other elements normally
                  this.ctx.fillStyle = this.MAP_COLORS[element.type];
                  this.ctx.fillRect(x, y, width, height);

                  // Add visual indicators for special elements
                  if (element.type === 'teleporter') {
                      this.drawTeleporter(x, y, width, height);
                  } else if (element.type === 'spawn') {
                      this.drawSpawnPoint(x, y, width, height, element.properties?.spawnType);
                  }
              }

              // Draw debug info if hitboxes are enabled
              if (this.showHitboxes) {
                  this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                  this.ctx.strokeRect(x, y, width, height);
                  this.ctx.fillStyle = 'white';
                  this.ctx.font = '12px Arial';
                  this.ctx.fillText(`${Math.round(x)},${Math.round(y)}`, x, y - 5);
              }
          }
      });
  }

  private drawTeleporter(x: number, y: number, width: number, height: number) {
      // Add portal effect
      const gradient = this.ctx.createRadialGradient(
          x + width/2, y + height/2, 0,
          x + width/2, y + height/2, width/2
      );
      gradient.addColorStop(0, 'rgba(33, 150, 243, 0.8)');
      gradient.addColorStop(1, 'rgba(33, 150, 243, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, width, height);

      // Add swirl effect
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      const time = Date.now() / 1000;
      for (let i = 0; i < Math.PI * 2; i += 0.1) {
          const radius = (Math.sin(time + i) + 1) * width/4;
          const px = x + width/2 + Math.cos(i) * radius;
          const py = y + height/2 + Math.sin(i) * radius;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.stroke();
  }

  private drawSpawnPoint(x: number, y: number, width: number, height: number, type?: string) {
      // Draw spawn area indicator
      const color = type ? this.getTierColor(type) : 'rgba(76, 175, 80, 0.3)';
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);

      // Add spawn point marker
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(x + width/2, y + height/2, Math.min(width, height)/4, 0, Math.PI * 2);
      this.ctx.stroke();

      // Add tier label
      if (type) {
          this.ctx.fillStyle = 'white';
          this.ctx.font = '20px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(type.toUpperCase(), x + width/2, y + height/2);
      }
  }

  private getTierColor(tier: string): string {
      const colors = {
          common: 'rgba(128, 128, 128, 0.3)',
          uncommon: 'rgba(0, 128, 0, 0.3)',
          rare: 'rgba(0, 0, 255, 0.3)',
          epic: 'rgba(128, 0, 128, 0.3)',
          legendary: 'rgba(255, 165, 0, 0.3)',
          mythic: 'rgba(255, 0, 0, 0.3)'
      };
      return colors[tier as keyof typeof colors] || colors.common;
  }

  // Add these methods to the Game class

  private drawUI() {
      // Draw player stats
      const player = this.players.get(this.socket?.id || '');
      if (player) {
          // Draw health bar
          const healthBarWidth = 200;
          const healthBarHeight = 20;
          const healthX = 20;
          const healthY = 20;

          // Health bar background
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          this.ctx.fillRect(healthX, healthY, healthBarWidth, healthBarHeight);

          // Health bar fill
          this.ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
          this.ctx.fillRect(
              healthX,
              healthY,
              (player.health / player.maxHealth) * healthBarWidth,
              healthBarHeight
          );

          // Health text
          this.ctx.fillStyle = 'white';
          this.ctx.font = '14px Arial';
          this.ctx.fillText(
              `Health: ${Math.round(player.health)}/${player.maxHealth}`,
              healthX + 5,
              healthY + 15
          );

          // Draw XP bar
          const xpBarY = healthY + healthBarHeight + 5;
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          this.ctx.fillRect(healthX, xpBarY, healthBarWidth, healthBarHeight);

          this.ctx.fillStyle = 'rgba(0, 128, 255, 0.7)';
          this.ctx.fillRect(
              healthX,
              xpBarY,
              (player.xp / player.xpToNextLevel) * healthBarWidth,
              healthBarHeight
          );

          this.ctx.fillStyle = 'white';
          this.ctx.fillText(
              `Level ${player.level} - XP: ${player.xp}/${player.xpToNextLevel}`,
              healthX + 5,
              xpBarY + 15
          );
      }

      // Draw minimap
      this.drawMinimap();

      // Draw floating texts
      this.drawFloatingTexts();
  }

  private drawPlayer(player: Player) {
      this.ctx.save();
      this.ctx.translate(player.x, player.y);
      this.ctx.rotate(player.angle);

      // Draw player sprite
      if (player.id === this.socket?.id) {
          // Apply hue rotation for current player
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

      // Draw hitbox if enabled
      if (this.showHitboxes) {
          this.ctx.strokeStyle = 'red';
          this.ctx.strokeRect(-20, -20, 40, 40);
      }

      // Draw player name
      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'center';
      this.ctx.font = '14px Arial';
      this.ctx.fillText(player.name || 'Anonymous', 0, -30);

      this.ctx.restore();
  }

  private drawEnemy(enemy: Enemy) {
    const sizeMultiplier = this.ENEMY_SIZE_MULTIPLIERS[enemy.tier];
    const enemySize = 40 * sizeMultiplier;

    this.ctx.save();
    this.ctx.translate(enemy.x, enemy.y);
    this.ctx.rotate(enemy.angle);

    // Draw enemy sprite based on type
    const sprite = enemy.type === 'octopus' ? this.octopusSprite : this.fishSprite;
    this.ctx.drawImage(
        sprite,
        -enemySize / 2,
        -enemySize / 2,
        enemySize,
        enemySize
    );

    // Draw hitbox if enabled
    if (this.showHitboxes) {
        this.ctx.strokeStyle = this.ENEMY_COLORS[enemy.tier];
        this.ctx.strokeRect(-enemySize/2, -enemySize/2, enemySize, enemySize);
    }

    // Draw health bar
    const healthBarWidth = enemySize;
    const healthBarHeight = 5;
    const healthBarY = -enemySize/2 - 10;

    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.fillRect(-healthBarWidth/2, healthBarY, healthBarWidth, healthBarHeight);

    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    this.ctx.fillRect(
        -healthBarWidth/2,
        healthBarY,
        (enemy.health / this.ENEMY_MAX_HEALTH[enemy.tier]) * healthBarWidth,
        healthBarHeight
    );

    // Draw enemy tier with tier color
    this.ctx.fillStyle = this.ENEMY_COLORS[enemy.tier];
    this.ctx.textAlign = 'center';
    this.ctx.font = '12px Arial'; // Made text bold for better visibility
    
    // Add black outline to text for better visibility
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 1;
    this.ctx.strokeText(enemy.tier.toUpperCase(), 0, enemySize/2 + 20);
    
    // Draw the text
    this.ctx.fillText(enemy.tier.toUpperCase(), 0, enemySize/2 + 20);

    this.ctx.restore();
}

  private drawItem(item: Item) {
      const sprite = this.itemSprites[item.type];
      if (!sprite) return;

      // Draw item rarity glow
      if (item.rarity) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.arc(item.x, item.y, 25, 0, Math.PI * 2);
          this.ctx.fillStyle = `${this.ITEM_RARITY_COLORS[item.rarity]}40`;
          this.ctx.fill();
          this.ctx.restore();
      }

      // Draw item sprite
      this.ctx.drawImage(sprite, item.x - 15, item.y - 15, 30, 30);

      // Draw hitbox if enabled
      if (this.showHitboxes) {
          this.ctx.strokeStyle = 'yellow';
          this.ctx.strokeRect(item.x - 15, item.y - 15, 30, 30);
      }
  }

  private drawFloatingTexts() {
      this.floatingTexts = this.floatingTexts.filter(text => {
          text.y -= 1;
          text.alpha -= 1 / text.lifetime;
          
          if (text.alpha <= 0) return false;
          
          this.ctx.save();
          this.ctx.globalAlpha = text.alpha;
          this.ctx.fillStyle = text.color;
          this.ctx.font = `${text.fontSize}px Arial`;
          this.ctx.textAlign = 'center';
          this.ctx.fillText(text.text, text.x, text.y);
          this.ctx.restore();
          
          return true;
      });
  }

  private renderMap(mapData: MapElement[]) {
      // Store the map data and render it
      this.world_map_data = mapData; // Assuming WORLD_MAP is mutable or use a separate variable
      this.drawMap();
  }
}