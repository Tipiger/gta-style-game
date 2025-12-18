import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { NPCManager } from '../entities/NPCManager';
import { GameMap } from '../world/Map';
import { Vector2 } from '../utils/Vector2';
import { WeaponType, Bullet } from '../entities/Weapon';
import { ItemManager } from '../entities/Item';
import { BulletManager } from '../entities/Weapon';
import { VehicleManager } from '../entities/Vehicle';

/**
 * 主游戏类
 */
export class Game {
  private renderer: Renderer;
  private camera: Camera;
  private inputManager: InputManager;
  private player: Player;
  private npcManager: NPCManager;
  private gameMap: GameMap;
  private itemManager: ItemManager;
  private vehicleManager: VehicleManager; // 车辆管理器
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fps: number = 0;
  private itemSpawnTimer: number = 0;
  private itemSpawnInterval: number = 3; // 每3秒尝试生成一个物品
  private maxItems: number = 3; // 最多维持3个物品
  private itemSpawnRange: number = 600; // 物品生成范围（玩家周围）
  private score: number = 0; // 游戏得分
  private gameOver: boolean = false; // 游戏是否结束
  private npcBulletManager: BulletManager; // NPC子弹管理器

  constructor() {
    this.renderer = new Renderer('game-canvas');
    this.camera = new Camera(this.renderer.getWidth(), this.renderer.getHeight());
    this.inputManager = new InputManager();

    // 初始化游戏地图（无限延展）
    this.gameMap = new GameMap(0, 0, 32);

    // 初始化NPC管理器
    this.npcManager = new NPCManager();
    this.npcManager.setCollisionSystem(this.gameMap.getCollisionSystem());

    // 为NPC设置射击回调
    this.setupNPCShootCallback();

    // 初始化物品管理器
    this.itemManager = new ItemManager();

    // 初始化车辆管理器
    this.vehicleManager = new VehicleManager();
    this.vehicleManager.setCollisionSystem(this.gameMap.getCollisionSystem());

    // 初始化NPC子弹管理器
    this.npcBulletManager = new BulletManager();

    // 初始化玩家（以(0,0)为中心）
    this.player = new Player(new Vector2(0, 0));

    // 为玩家设置碰撞系统
    this.player.setCollisionSystem(this.gameMap.getCollisionSystem());

    // 为玩家设置获取NPC列表的回调（用于自动射击）
    this.player.setGetNPCsCallback(() => this.npcManager.getAllNPCs());

    // 设置摄像机初始位置
    this.camera.setPosition(this.player.getPosition());

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.camera.updateSize(this.renderer.getWidth(), this.renderer.getHeight());
    });
  }

  /**
   * 启动游戏
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  /**
   * 停止游戏
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * 游戏主循环
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // 更新
    this.update(deltaTime);

    // 渲染
    this.render();

    // 更新FPS
    this.frameCount++;
    if (currentTime - this.lastFrameTime > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
    }

    requestAnimationFrame(this.gameLoop);
  };

  /**
   * 更新游戏逻辑
   */
  private update(deltaTime: number): void {
    // 如果游戏结束，检查重新开始
    if (this.gameOver) {
      if (this.inputManager.isKeyPressed('r')) {
        this.restartGame();
      }
      return;
    }

    // 获取玩家输入
    const movement = this.inputManager.getMovementInput();
    const mousePos = this.inputManager.getMousePosition();

    // 将屏幕坐标转换为世界坐标
    const worldMousePos = this.camera.screenToWorld(new Vector2(mousePos.x, mousePos.y));
    this.player.setMousePosition(worldMousePos.x, worldMousePos.y);

    // 处理自动射击（自动寻找并射击范围内最近的敌人）
    const currentTime = performance.now() / 1000;
    this.player.fire(currentTime);

    // 处理武器切换输入
    if (this.inputManager.isKeyPressed('1')) {
      this.player.switchWeapon(WeaponType.PISTOL);
    }
    if (this.inputManager.isKeyPressed('2')) {
      this.player.switchWeapon(WeaponType.RIFLE);
    }
    if (this.inputManager.isKeyPressed('3')) {
      this.player.switchWeapon(WeaponType.SHOTGUN);
    }

    // 更新玩家
    this.player.update(deltaTime, movement, currentTime);

    // 更新车辆
    this.vehicleManager.update(deltaTime, this.player.getPosition());

    // 处理车辆交互
    this.handleVehicleInteraction();

    // 更新NPC
    this.npcManager.update(deltaTime, this.player.getPosition(), currentTime);

    // 更新NPC子弹
    this.npcBulletManager.update(deltaTime);

    // 更新物品
    this.itemManager.update(deltaTime);

    // 生成物品（维持数量在3以内）
    this.itemSpawnTimer += deltaTime;
    if (this.itemSpawnTimer >= this.itemSpawnInterval) {
      this.itemSpawnTimer = 0;
      if (this.itemManager.getCount() < this.maxItems) {
        this.spawnRandomItem();
      }
    }

    // 清理超出范围的物品
    this.cleanupFarItems();

    // 检查玩家是否拾取物品
    this.checkItemPickup();

    // 检查子弹是否击中建筑物
    this.checkBulletsHitBuildings();

    // 检查子弹是否击中NPC
    this.checkBulletHits();

    // 检查NPC子弹是否击中玩家
    this.checkNPCBulletHits();

    // 清理超出范围的NPC子弹
    this.cleanupNPCBullets();

    // 检查车辆是否被摧毁
    this.checkDestroyedVehicles();

    // 检查玩家是否死亡
    if (this.player.getIsDead()) {
      this.gameOver = true;
    }

    // 摄像机跟随玩家
    this.camera.follow(this.player.getPosition(), 0.1);

    // 根据驾驶状态调整摄像机缩放
    const isInVehicle = this.player.isInVehicle();
    const targetZoom = isInVehicle ? 0.9 : 1.5;
    const currentZoom = this.camera.getZoom();
    const zoomDifference = targetZoom - currentZoom;
    
    // 平滑过渡缩放
    if (Math.abs(zoomDifference) > 0.01) {
      this.camera.setZoom(currentZoom + zoomDifference * 0.1);
    } else {
      this.camera.setZoom(targetZoom);
    }

    // 更新HUD
    this.updateHUD();

    // 清除本帧的刚按下键记录
    this.inputManager.clearJustPressedKeys();
  }

  /**
   * 生成随机物品
   */
  private spawnRandomItem(): void {
    // 尝试生成物品，最多尝试5次以避免在建筑物内生成
    for (let attempt = 0; attempt < 5; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 300 + Math.random() * 300;
      const x = this.player.getPosition().x + Math.cos(angle) * distance;
      const y = this.player.getPosition().y + Math.sin(angle) * distance;

      // 检查位置是否在建筑物内
      if (!this.isPositionInBuilding(new Vector2(x, y))) {
        // 随机选择武器类型（不包括手枪）
        const weaponTypes = [WeaponType.RIFLE, WeaponType.SHOTGUN];
        const randomWeapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];

        this.itemManager.addItem(new Vector2(x, y), randomWeapon);
        return;
      }
    }
  }

  /**
   * 清理超出范围的物品
   */
  private cleanupFarItems(): void {
    const playerPos = this.player.getPosition();
    const items = this.itemManager.getAllItems();

    for (const item of items) {
      const distance = playerPos.distance(item.getPosition());
      // 如果物品超出范围，删除它
      if (distance > this.itemSpawnRange) {
        this.itemManager.removeItem(item.getId());
      }
    }
  }

  /**
   * 检查位置是否在建筑物内
   */
  private isPositionInBuilding(position: Vector2): boolean {
    const buildings = this.gameMap.getBuildings();
    for (const building of buildings) {
      if (
        position.x >= building.x &&
        position.x <= building.x + building.width &&
        position.y >= building.y &&
        position.y <= building.y + building.height
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * 处理车辆交互
   */
  private handleVehicleInteraction(): void {
    // 如果玩家已在车辆中
    if (this.player.isInVehicle()) {
      // 按F键离开车辆
      if (this.inputManager.isKeyJustPressed('f')) {
        this.player.exitVehicle();
      }
      return;
    }

    // 检查玩家附近是否有车辆
    const nearbyVehicles = this.vehicleManager.getNearbyVehicles(this.player.getPosition(), 100);
    
    if (nearbyVehicles.length > 0) {
      // 按F键进入最近的车辆
      if (this.inputManager.isKeyJustPressed('f')) {
        const vehicle = nearbyVehicles[0];
        this.player.enterVehicle(vehicle);
      }
    }
  }

  /**
   * 检查玩家是否拾取物品
   */
  private checkItemPickup(): void {
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getRadius();

    for (const item of this.itemManager.getAllItems()) {
      const distance = playerPos.distance(item.getPosition());
      if (distance < playerRadius + item.getRadius()) {
        // 拾取物品
        this.player.pickupWeapon(item.getWeaponType());
        this.itemManager.removeItem(item.getId());
      }
    }
  }

  /**
   * 为NPC设置射击回调
   */
  private setupNPCShootCallback(): void {
    // 在NPCManager中为每个新创建的NPC设置射击回调
    const originalCreateNPC = this.npcManager.createNPC.bind(this.npcManager);
    this.npcManager.createNPC = (id: string, position: Vector2) => {
      const npc = originalCreateNPC(id, position);
      npc.setOnShoot((npcPos: Vector2, direction: Vector2) => {
        // NPC射击，创建子弹
        const bullet = new Bullet(
          npcPos,
          direction,
          10, // NPC手枪伤害
          500, // 子弹速度
          300, // 射程
          3, // 子弹大小
          id // NPC ID
        );
        this.npcBulletManager.addBullet(bullet);
      });
      return npc;
    };
  }

  /**
   * 重新开始游戏
   */
  private restartGame(): void {
    this.score = 0;
    this.gameOver = false;
    this.npcBulletManager.clear();
    
    // 重新初始化玩家
    this.player = new Player(new Vector2(0, 0));
    this.player.setCollisionSystem(this.gameMap.getCollisionSystem());
    
    // 重新初始化NPC管理器
    this.npcManager = new NPCManager();
    this.npcManager.setCollisionSystem(this.gameMap.getCollisionSystem());
    
    // 为NPC设置射击回调
    this.setupNPCShootCallback();
    
    // 为玩家设置获取NPC列表的回调（用于自动射击）
    this.player.setGetNPCsCallback(() => this.npcManager.getAllNPCs());
    
    // 重新初始化物品管理器
    this.itemManager = new ItemManager();
  }

  /**
   * 检查子弹是否击中建筑物
   */
  private checkBulletsHitBuildings(): void {
    // 检查玩家子弹
    const playerBullets = this.player.getBulletManager().getBullets();
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const bullet = playerBullets[i];
      if (this.gameMap.isPointInBuilding(bullet.getPosition())) {
        this.player.getBulletManager().removeBullet(i);
      }
    }

    // 检查NPC子弹
    const npcBullets = this.npcBulletManager.getBullets();
    for (let i = npcBullets.length - 1; i >= 0; i--) {
      const bullet = npcBullets[i];
      if (this.gameMap.isPointInBuilding(bullet.getPosition())) {
        this.npcBulletManager.removeBullet(i);
      }
    }
  }

  /**
   * 检查子弹是否击中NPC和车辆
   */
  private checkBulletHits(): void {
    const bullets = this.player.getBulletManager().getBullets();
    const npcs = this.npcManager.getAllNPCs();
    const vehicles = this.vehicleManager.getVehicles();
    const playerVehicle = this.player.getCurrentVehicle(); // 获取玩家所在的车辆

    // 遍历所有子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bulletPos = bullet.getPosition();
      const bulletRadius = bullet.getSize();
      let bulletHit = false;

      // 检查是否击中NPC
      for (const npc of npcs) {
        if (npc.getIsDead()) {
          continue;
        }

        const npcPos = npc.getPosition();
        const npcRadius = npc.getRadius();
        const distance = bulletPos.distance(npcPos);

        if (distance < bulletRadius + npcRadius) {
          // 子弹击中NPC
          const damage = bullet.getDamage();
          npc.takeDamage(damage, this.player.getPosition());
          
          // 如果NPC死亡，增加得分
          if (npc.getIsDead()) {
            this.score++;
          }
          
          bulletHit = true;
          break;
        }
      }

      // 如果子弹还没击中，检查是否击中车辆
      if (!bulletHit) {
        for (const vehicle of vehicles) {
          if (vehicle.getIsDead()) {
            continue;
          }

          // 如果玩家在这辆车里，跳过这辆车（不能击中自己的车）
          if (playerVehicle === vehicle) {
            continue;
          }

          const vehiclePos = vehicle.getPosition();
          const vehicleRadius = vehicle.getRadius();
          const distance = bulletPos.distance(vehiclePos);

          if (distance < bulletRadius + vehicleRadius) {
            // 子弹击中车辆
            const damage = bullet.getDamage();
            vehicle.takeDamage(damage);
            bulletHit = true;
            break;
          }
        }
      }

      // 如果子弹击中任何目标，删除子弹
      if (bulletHit) {
        this.player.getBulletManager().removeBullet(i);
      }
    }
  }

  /**
   * 检查NPC子弹是否击中玩家和车辆
   */
  private checkNPCBulletHits(): void {
    const bullets = this.npcBulletManager.getBullets();
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getRadius();
    const vehicles = this.vehicleManager.getVehicles();

    // 遍历所有NPC子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bulletPos = bullet.getPosition();
      const bulletRadius = bullet.getSize();
      let bulletHit = false;

      // 首先检查是否击中玩家（如果玩家不在车辆中）
      if (!this.player.isInVehicle()) {
        const distance = bulletPos.distance(playerPos);
        if (distance < bulletRadius + playerRadius) {
          // 子弹击中玩家
          const damage = bullet.getDamage();
          this.player.takeDamage(damage);
          bulletHit = true;
        }
      }

      // 如果子弹还没击中，检查是否击中车辆
      if (!bulletHit) {
        for (const vehicle of vehicles) {
          if (vehicle.getIsDead()) {
            continue;
          }

          const vehiclePos = vehicle.getPosition();
          const vehicleRadius = vehicle.getRadius();
          const distance = bulletPos.distance(vehiclePos);

          if (distance < bulletRadius + vehicleRadius) {
            // 子弹击中车辆
            const damage = bullet.getDamage();
            vehicle.takeDamage(damage);
            bulletHit = true;
            break;
          }
        }
      }

      // 如果子弹击中任何目标，删除子弹
      if (bulletHit) {
        this.npcBulletManager.removeBullet(i);
      }
    }
  }

  /**
   * 清理超出范围的NPC子弹
   */
  private cleanupNPCBullets(): void {
    const bullets = this.npcBulletManager.getBullets();
    const playerPos = this.player.getPosition();

    // 遍历所有NPC子弹，删除超出范围的
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bulletPos = bullet.getPosition();
      const distance = bulletPos.distance(playerPos);

      // 如果子弹超出1000像素范围，删除它
      if (distance > 1000) {
        this.npcBulletManager.removeBullet(i);
      }
    }
  }

  /**
   * 检查被摧毁的车辆，如果玩家在车辆中则强制离开
   */
  private checkDestroyedVehicles(): void {
    // 如果玩家在车辆中
    if (this.player.isInVehicle()) {
      const playerVehicle = this.vehicleManager.getPlayerVehicle('player');
      // 如果玩家所在的车辆被摧毁
      if (playerVehicle && playerVehicle.getIsDead()) {
        // 强制玩家离开车辆
        this.player.exitVehicle();
      }
    }
  }

  /**
   * 渲染游戏
   */
  private render(): void {
    // 清空画布
    this.renderer.clear();

    // 绘制地图
    this.gameMap.render(this.renderer, this.camera);

    // 绘制物品
    this.itemManager.render(this.renderer, this.camera);

    // 绘制车辆
    this.vehicleManager.render(this.renderer, this.camera);

    // 绘制NPC
    this.npcManager.render(this.renderer, this.camera);

    // 绘制NPC子弹
    this.npcBulletManager.render(this.renderer, this.camera);

    // 绘制玩家
    const currentTime = performance.now() / 1000;
    this.player.render(this.renderer, this.camera, currentTime);

    // 绘制网格（调试用）
    this.drawDebugGrid();

    // 绘制游戏结束画面
    if (this.gameOver) {
      this.drawGameOverScreen();
    }
  }

  /**
   * 绘制游戏结束画面
   */
  private drawGameOverScreen(): void {
    const ctx = this.renderer.getContext();
    const width = this.renderer.getWidth();
    const height = this.renderer.getHeight();

    // 绘制半透明黑色背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // 绘制游戏结束文字
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', width / 2, height / 2 - 60);

    // 绘制得分
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`最终得分: ${this.score}`, width / 2, height / 2 + 20);

    // 绘制重新开始提示
    ctx.fillStyle = '#00ff00';
    ctx.font = '24px Arial';
    ctx.fillText('按 R 键重新开始', width / 2, height / 2 + 80);
  }

  /**
   * 绘制调试网格
   */
  private drawDebugGrid(): void {
    const viewport = this.camera.getViewport();
    const gridSize = 32;

    const startX = Math.floor(viewport.x / gridSize) * gridSize;
    const startY = Math.floor(viewport.y / gridSize) * gridSize;
    const endX = startX + viewport.width + gridSize;
    const endY = startY + viewport.height + gridSize;

    for (let x = startX; x < endX; x += gridSize) {
      const screenStart = this.camera.worldToScreen(new Vector2(x, startY));
      const screenEnd = this.camera.worldToScreen(new Vector2(x, endY));
      this.renderer.drawLine(screenStart, screenEnd, '#444444', 0.5);
    }

    for (let y = startY; y < endY; y += gridSize) {
      const screenStart = this.camera.worldToScreen(new Vector2(startX, y));
      const screenEnd = this.camera.worldToScreen(new Vector2(endX, y));
      this.renderer.drawLine(screenStart, screenEnd, '#444444', 0.5);
    }
  }

  /**
   * 更新HUD显示
   */
  private updateHUD(): void {
    const scoreElement = document.getElementById('score');
    const weaponElement = document.getElementById('weapon');
    const ammoElement = document.getElementById('ammo');

    if (scoreElement) {
      scoreElement.textContent = `得分: ${this.score}`;
    }

    if (weaponElement) {
      const weapon = this.player.getWeapon();
      const weaponName = weapon.getName();
      const isReloading = this.player.isReloading() ? ' [装弹中]' : '';
      weaponElement.textContent = `武器: ${weaponName}${isReloading}`;
    }

    if (ammoElement) {
      const weapon = this.player.getWeapon();
      const currentAmmo = weapon.getCurrentAmmo();
      const reserveAmmo = weapon.getReserveAmmo();
      ammoElement.textContent = `弹药: ${currentAmmo}/${reserveAmmo}`;
    }

    // 更新控制提示
    this.updateControlsDisplay();
  }

  /**
   * 更新控制提示显示
   */
  private updateControlsDisplay(): void {
    const walkingControls = document.getElementById('controls-walking');
    const drivingControls = document.getElementById('controls-driving');

    if (!walkingControls || !drivingControls) {
      return;
    }

    if (this.player.isInVehicle()) {
      // 驾驶模式
      walkingControls.style.display = 'none';
      drivingControls.style.display = 'block';
    } else {
      // 步行模式
      walkingControls.style.display = 'block';
      drivingControls.style.display = 'none';
    }
  }
}