import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';
import { CollisionSystem } from '../world/Collision';
import { Weapon, WeaponType, Bullet, BulletManager, FireMode } from './Weapon';
import { Vehicle } from './Vehicle';

/**
 * 玩家角色类
 */
export class Player {
  private position: Vector2;
  private velocity: Vector2;
  private speed: number = 150; // 像素/秒
  private radius: number = 8;
  private color: string = '#00ff00';
  private collisionSystem: CollisionSystem | null = null;
  private playerId: string = 'player';
  private weapons: Map<WeaponType, Weapon> = new Map();
  private currentWeaponType: WeaponType = WeaponType.PISTOL;
  private bulletManager: BulletManager;
  private direction: Vector2 = new Vector2(1, 0); // 当前朝向
  private mousePosition: Vector2 = new Vector2(0, 0); // 鼠标位置
  private lastReloadTime: number = 0; // 上次装弹时间
  private shouldFire: boolean = false; // 是否应该射击（用于半自动）
  private maxHealth: number = 100; // 最大血量
  private health: number = 100; // 当前血量
  private isDead: boolean = false; // 是否已死亡
  private currentVehicle: Vehicle | null = null; // 当前所在的车辆
  private weaponBeforeVehicle: WeaponType = WeaponType.PISTOL; // 进入车辆前的武器
  private autoShootRange: number = 300; // 自动射击范围
  private getNPCsCallback: (() => any[]) | null = null; // 获取NPC列表的回调

  constructor(position: Vector2) {
    this.position = position.clone();
    this.velocity = new Vector2(0, 0);
    
    // 初始化武器：只有手枪，备弹无限
    this.weapons.set(WeaponType.PISTOL, new Weapon(WeaponType.PISTOL, Infinity));
    
    this.bulletManager = new BulletManager();
  }

  /**
   * 设置碰撞系统
   */
  setCollisionSystem(collisionSystem: CollisionSystem): void {
    this.collisionSystem = collisionSystem;
    // 注册玩家碰撞体
    this.collisionSystem.register(this.playerId, {
      position: this.position.clone(),
      radius: this.radius,
      type: 'circle'
    });
  }

  /**
   * 设置鼠标位置
   */
  setMousePosition(x: number, y: number): void {
    this.mousePosition = new Vector2(x, y);
  }

  /**
   * 设置获取NPC列表的回调
   */
  setGetNPCsCallback(callback: () => any[]): void {
    this.getNPCsCallback = callback;
  }

  /**
   * 获取当前武器
   */
  private getCurrentWeapon(): Weapon {
    const weapon = this.weapons.get(this.currentWeaponType);
    if (!weapon) {
      throw new Error(`Weapon type ${this.currentWeaponType} not found`);
    }
    return weapon;
  }

  /**
   * 寻找范围内最近的敌人
   */
  private findNearestEnemy(): any | null {
    if (!this.getNPCsCallback) {
      return null;
    }

    const npcs = this.getNPCsCallback();
    let nearestNPC: any = null;
    let nearestDistance = this.autoShootRange;

    for (const npc of npcs) {
      // 跳过已死亡的NPC
      if (npc.getIsDead && npc.getIsDead()) {
        continue;
      }

      const npcPos = npc.getPosition();
      const distance = this.position.distance(npcPos);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestNPC = npc;
      }
    }

    return nearestNPC;
  }

  /**
   * 射击
   */
  fire(currentTime: number): void {
    const weapon = this.getCurrentWeapon();
    const config = weapon.getConfig();

    // 自动射击逻辑：寻找范围内最近的敌人
    const nearestEnemy = this.findNearestEnemy();
    
    if (nearestEnemy) {
      // 有敌人在范围内，朝向敌人
      const toEnemy = nearestEnemy.getPosition().subtract(this.position);
      if (toEnemy.length() > 0) {
        this.direction = toEnemy.normalize();
      }

      // 检查弹夹是否有子弹
      if (weapon.getCurrentAmmo() <= 0) {
        // 弹夹没有子弹，检查是否有备弹
        if (weapon.getReserveAmmo() > 0) {
          // 有备弹，自动换弹
          this.reload(currentTime);
        }
        // 没有备弹，停止射击
        return;
      }

      // 自动射击（设置shouldFire为true以支持半自动武器）
      this.shouldFire = true;
    } else {
      // 范围内没有敌人，停止射击
      this.shouldFire = false;
      return;
    }

    // 对于半自动武器，只在shouldFire为true时才射击
    if (config.fireMode === FireMode.SEMI_AUTO && !this.shouldFire) {
      return;
    }

    if (weapon.fire(currentTime)) {
      // 射击成功后，重置shouldFire标志
      this.shouldFire = false;

      // 确定射出的子弹数量
      const pelletsPerShot = config.pelletsPerShot || 1;
      
      // 射出多发子弹
      for (let i = 0; i < pelletsPerShot; i++) {
        // 计算散射角度（每发子弹都有随机散射）
        // 散射范围：-spread/2 到 +spread/2
        const spreadAngle = (Math.random() - 0.5) * config.spread * (Math.PI / 180);
        
        // 对于有散射的武器（步枪、散弹枪），添加精准度偏差
        let totalAngle = spreadAngle;
        if (config.spread > 0 && config.accuracy < 1) {
          const accuracy = config.accuracy;
          const accuracyAngle = Math.random() * (1 - accuracy) * Math.PI * 2;
          totalAngle += accuracyAngle;
        }
        
        const direction = this.direction.clone();
        
        // 应用散射和精准度偏差
        const rotatedX = direction.x * Math.cos(totalAngle) - direction.y * Math.sin(totalAngle);
        const rotatedY = direction.x * Math.sin(totalAngle) + direction.y * Math.cos(totalAngle);
        
        const bullet = new Bullet(
          this.position.clone(),
          new Vector2(rotatedX, rotatedY),
          config.damage,
          config.bulletSpeed,
          config.range,
          config.bulletSize,
          this.playerId
        );
        this.bulletManager.addBullet(bullet);
      }
    }
  }


  /**
   * 装弹
   */
  reload(currentTime: number): void {
    const weapon = this.getCurrentWeapon();
    weapon.startReload(currentTime);
    this.lastReloadTime = currentTime;
  }

  /**
   * 获取装弹进度（0-1）
   */
  getReloadProgress(currentTime: number): number {
    const weapon = this.getCurrentWeapon();
    if (!weapon.isReloadingNow()) {
      return 0;
    }
    const config = weapon.getConfig();
    const elapsed = currentTime - this.lastReloadTime;
    return Math.min(elapsed / config.reloadTime, 1);
  }

  /**
   * 是否正在装弹
   */
  isReloading(): boolean {
    const weapon = this.getCurrentWeapon();
    return weapon.isReloadingNow();
  }

  /**
   * 切换武器
   */
  switchWeapon(weaponType: WeaponType): void {
    // 如果在车辆中，只能使用手枪
    if (this.currentVehicle !== null && weaponType !== WeaponType.PISTOL) {
      return;
    }
    if (this.weapons.has(weaponType)) {
      this.currentWeaponType = weaponType;
    }
  }

  /**
   * 获取当前武器类型
   */
  getCurrentWeaponType(): WeaponType {
    return this.currentWeaponType;
  }

  /**
   * 进入车辆
   */
  enterVehicle(vehicle: Vehicle): void {
    this.currentVehicle = vehicle;
    this.weaponBeforeVehicle = this.currentWeaponType;
    // 进入车辆后只能使用手枪
    this.currentWeaponType = WeaponType.PISTOL;
    vehicle.enterVehicle(this.playerId);
  }

  /**
   * 离开车辆
   */
  exitVehicle(): void {
    if (this.currentVehicle !== null) {
      // 将玩家移动到车辆外的安全位置（车辆右侧）
      const vehiclePos = this.currentVehicle.getPosition();
      const offsetDistance = 50; // 距离车辆50像素
      const offsetAngle = this.currentVehicle.getRotation(); // 使用车辆的朝向
      
      // 计算下车位置（在车辆右侧）
      const exitPos = new Vector2(
        vehiclePos.x + Math.cos(offsetAngle + Math.PI / 2) * offsetDistance,
        vehiclePos.y + Math.sin(offsetAngle + Math.PI / 2) * offsetDistance
      );
      
      this.position = exitPos;
      
      // 更新碰撞系统位置
      if (this.collisionSystem) {
        this.collisionSystem.updatePosition(this.playerId, this.position);
      }
      
      this.currentVehicle.exitVehicle();
      // 恢复之前的武器
      if (this.weapons.has(this.weaponBeforeVehicle)) {
        this.currentWeaponType = this.weaponBeforeVehicle;
      }
      this.currentVehicle = null;
    }
  }

  /**
   * 获取当前车辆
   */
  getCurrentVehicle(): Vehicle | null {
    return this.currentVehicle;
  }

  /**
   * 检查是否在车辆中
   */
  isInVehicle(): boolean {
    return this.currentVehicle !== null;
  }

  /**
   * 拾取武器
   */
  pickupWeapon(weaponType: WeaponType): void {
    if (this.weapons.has(weaponType)) {
      // 已有该武器，添加备弹
      const weapon = this.weapons.get(weaponType)!;
      const config = weapon.getConfig();
      weapon.addReserveAmmo(config.magazineCapacity);
    } else {
      // 新武器，添加一份弹夹的备弹
      const newWeapon = new Weapon(weaponType, 0);
      const config = newWeapon.getConfig();
      newWeapon.addReserveAmmo(config.magazineCapacity);
      this.weapons.set(weaponType, newWeapon);
    }
  }

  /**
   * 更新玩家状态
   */
  update(deltaTime: number, movement: { x: number; y: number }, currentTime: number): void {
    // 如果在车辆中，更新车辆而不是玩家位置
    if (this.currentVehicle !== null) {
      // 更新车辆方向
      if (movement.x > 0) {
        this.currentVehicle.turnRight();
      } else if (movement.x < 0) {
        this.currentVehicle.turnLeft();
      }

      // 更新车辆速度
      if (movement.y < 0) {
        this.currentVehicle.accelerate();
      } else if (movement.y > 0) {
        this.currentVehicle.decelerate();
      }

      // 玩家位置跟随车辆
      this.position = this.currentVehicle.getPosition().clone();

      // 更新朝向（指向鼠标）
      const toMouse = this.mousePosition.subtract(this.position);
      if (toMouse.length() > 0) {
        this.direction = toMouse.normalize();
      }

      // 更新子弹
      this.bulletManager.update(deltaTime);

      // 更新当前武器的装弹状态
      const weapon = this.getCurrentWeapon();
      weapon.updateReload(currentTime);
      return;
    }

    // 更新朝向（指向鼠标）
    const toMouse = this.mousePosition.subtract(this.position);
    if (toMouse.length() > 0) {
      this.direction = toMouse.normalize();
    }

    // 更新子弹
    this.bulletManager.update(deltaTime);

    // 更新当前武器的装弹状态
    const weapon = this.getCurrentWeapon();
    weapon.updateReload(currentTime);
    // 计算目标速度
    let targetVelocity = new Vector2(movement.x, movement.y);

    // 如果有移动输入，归一化并乘以速度
    if (targetVelocity.length() > 0) {
      targetVelocity = targetVelocity.normalize().multiply(this.speed);
    }

    // 平滑加速
    const acceleration = 0.2;
    this.velocity.x += (targetVelocity.x - this.velocity.x) * acceleration;
    this.velocity.y += (targetVelocity.y - this.velocity.y) * acceleration;

    // 计算新位置
    const newPosition = this.position.add(this.velocity.multiply(deltaTime));

    // 检查碰撞
    if (this.collisionSystem) {
      this.collisionSystem.updatePosition(this.playerId, newPosition);
      const collisions = this.collisionSystem.getCollisions(this.playerId);

      if (collisions.length > 0) {
        // 如果发生碰撞，尝试沿着轴移动
        const testX = this.position.add(new Vector2(this.velocity.x * deltaTime, 0));
        this.collisionSystem.updatePosition(this.playerId, testX);
        const collisionsX = this.collisionSystem.getCollisions(this.playerId);

        if (collisionsX.length === 0) {
          this.position = testX;
        } else {
          const testY = this.position.add(new Vector2(0, this.velocity.y * deltaTime));
          this.collisionSystem.updatePosition(this.playerId, testY);
          const collisionsY = this.collisionSystem.getCollisions(this.playerId);

          if (collisionsY.length === 0) {
            this.position = testY;
          } else {
            // 两个方向都碰撞，停止移动
            this.collisionSystem.updatePosition(this.playerId, this.position);
          }
        }
      } else {
        // 没有碰撞，更新位置
        this.position = newPosition;
      }
    } else {
      this.position = newPosition;
    }

    // 无限地图，不需要边界检查
  }

  /**
   * 渲染玩家
   */
  render(renderer: Renderer, camera: Camera, currentTime: number): void {
    const screenPos = camera.worldToScreen(this.position);
    const zoom = camera.getZoom();

    // 绘制玩家主体
    renderer.drawCircle(screenPos, this.radius * zoom, this.color, true);

    // 绘制朝向指示器（指向鼠标）
    const directionLength = this.radius * 1.5 * zoom;
    const directionEnd = screenPos.add(this.direction.multiply(directionLength));
    renderer.drawLine(screenPos, directionEnd, '#ffff00', 1);

    // 绘制持有的枪械图标
    this.renderWeaponIcon(renderer, screenPos, zoom);

    // 绘制血量条
    this.renderHealthBar(renderer, screenPos, zoom);

    // 渲染子弹
    this.bulletManager.render(renderer, camera);

    // 渲染装弹动画
    if (this.isReloading()) {
      this.renderReloadAnimation(renderer, camera, currentTime);
    }
  }

  /**
   * 绘制血量条
   */
  private renderHealthBar(renderer: Renderer, screenPos: Vector2, zoom: number): void {
    const healthBarWidth = this.radius * 2.5 * zoom;
    const healthBarHeight = 3 * zoom;
    const healthBarY = screenPos.y - this.radius * 1.5 * zoom;

    const ctx = renderer.getContext();

    // 绘制血条背景（黑色）
    ctx.fillStyle = '#000000';
    ctx.fillRect(
      screenPos.x - healthBarWidth / 2,
      healthBarY,
      healthBarWidth,
      healthBarHeight
    );

    // 绘制血条边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      screenPos.x - healthBarWidth / 2,
      healthBarY,
      healthBarWidth,
      healthBarHeight
    );

    // 绘制血量（绿色到红色渐变）
    const healthPercent = this.health / this.maxHealth;
    const healthBarFillWidth = healthBarWidth * healthPercent;

    // 根据血量百分比选择颜色
    if (healthPercent > 0.5) {
      ctx.fillStyle = '#00ff00'; // 绿色
    } else if (healthPercent > 0.25) {
      ctx.fillStyle = '#ffff00'; // 黄色
    } else {
      ctx.fillStyle = '#ff0000'; // 红色
    }

    ctx.fillRect(
      screenPos.x - healthBarWidth / 2,
      healthBarY,
      healthBarFillWidth,
      healthBarHeight
    );
  }

  /**
   * 绘制持有的枪械图标
   */
  private renderWeaponIcon(renderer: Renderer, screenPos: Vector2, zoom: number): void {
    const ctx = renderer.getContext();
    const weapon = this.getCurrentWeapon();
    const weaponType = weapon.getType();

    // 武器图标跟随枪线移动
    const directionLength = this.radius * 1.2 * zoom;
    const iconPos = screenPos.add(this.direction.multiply(directionLength));
    const iconSize = this.radius * 0.8 * zoom;

    ctx.save();

    switch (weaponType) {
      case WeaponType.PISTOL:
        // 手枪：黄色小圆
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(iconPos.x, iconPos.y, iconSize, 0, Math.PI * 2);
        ctx.fill();
        break;
      case WeaponType.RIFLE:
        // 步枪：绿色矩形
        ctx.fillStyle = '#00ff00';
        ctx.save();
        ctx.translate(iconPos.x, iconPos.y);
        ctx.rotate(Math.atan2(this.direction.y, this.direction.x));
        ctx.fillRect(-iconSize, -iconSize * 0.5, iconSize * 2, iconSize);
        ctx.restore();
        break;
      case WeaponType.SHOTGUN:
        // 霰弹枪：橙色六边形
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = iconPos.x + Math.cos(angle) * iconSize;
          const y = iconPos.y + Math.sin(angle) * iconSize;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  /**
   * 渲染装弹动画
   */
  private renderReloadAnimation(renderer: Renderer, camera: Camera, currentTime: number): void {
    const progress = this.getReloadProgress(currentTime);
    const screenMousePos = camera.worldToScreen(this.mousePosition);
    const radius = 20 * camera.getZoom(); // 半径小一圈

    const ctx = renderer.getContext();

    // 绘制圆形进度条背景
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenMousePos.x, screenMousePos.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制进度条
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenMousePos.x, screenMousePos.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }

  /**
   * 获取玩家位置
   */
  getPosition(): Vector2 {
    return this.position.clone();
  }

  /**
   * 设置玩家位置
   */
  setPosition(position: Vector2): void {
    this.position = position.clone();
  }

  /**
   * 获取玩家半径
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * 获取武器
   */
  getWeapon(): Weapon {
    return this.getCurrentWeapon();
  }

  /**
   * 获取子弹管理器
   */
  getBulletManager(): BulletManager {
    return this.bulletManager;
  }

  /**
   * 获取朝向
   */
  getDirection(): Vector2 {
    return this.direction.clone();
  }

  /**
   * 受伤
   */
  takeDamage(damage: number): void {
    if (this.isDead) {
      return;
    }

    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  /**
   * 获取当前血量
   */
  getHealth(): number {
    return this.health;
  }

  /**
   * 获取最大血量
   */
  getMaxHealth(): number {
    return this.maxHealth;
  }

  /**
   * 是否已死亡
   */
  getIsDead(): boolean {
    return this.isDead;
  }
}