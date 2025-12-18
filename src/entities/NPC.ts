import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';
import { CollisionSystem } from '../world/Collision';

/**
 * NPC行为类型
 */
export enum NPCBehavior {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  FLEE = 'flee'
}

/**
 * NPC角色类
 */
export class NPC {
  private position: Vector2;
  private velocity: Vector2;
  private speed: number = 40; // 像素/秒（修改为一半）
  private radius: number = 6;
  private color: string = '#4a90e2'; // 统一蓝色
  private id: string;
  private behavior: NPCBehavior = NPCBehavior.IDLE;
  private collisionSystem: CollisionSystem | null = null;
  private patrolPoints: Vector2[] = [];
  private currentPatrolIndex: number = 0;
  private idleTimer: number = 0;
  private idleDuration: number = 2; // 秒
  private targetPosition: Vector2 | null = null;
  private direction: Vector2 = new Vector2(1, 0); // 当前朝向
  private visionRange: number = 125; // 视野范围（圆锥的半径）
  private visionAngle: number = 120; // 视野角度（度数）
  private showVision: boolean = true; // 是否显示视野
  private fleeRange: number = 150; // 逃离范围
  private maxHealth: number = 50; // 最大血量
  private health: number = 50; // 当前血量
  private isDead: boolean = false; // 是否已死亡
  private lastShotTime: number = 0; // 上次射击时间
  private shotCooldown: number = 0.5; // 射击冷却时间（秒）
  private onShoot: ((position: Vector2, direction: Vector2) => void) | null = null; // 射击回调

  constructor(id: string, position: Vector2) {
    this.id = id;
    this.position = position.clone();
    this.velocity = new Vector2(0, 0);
    this.health = this.maxHealth;
  }

  /**
   * 设置碰撞系统
   */
  setCollisionSystem(collisionSystem: CollisionSystem): void {
    this.collisionSystem = collisionSystem;
    this.collisionSystem.register(this.id, {
      position: this.position.clone(),
      radius: this.radius,
      type: 'circle'
    });
  }

  /**
   * 设置巡逻路线
   */
  setPatrolPoints(points: Vector2[]): void {
    this.patrolPoints = points.map(p => p.clone());
    if (this.patrolPoints.length > 0) {
      this.behavior = NPCBehavior.PATROL;
      this.targetPosition = this.patrolPoints[0].clone();
    }
  }

  /**
   * 设置行为
   */
  setBehavior(behavior: NPCBehavior): void {
    this.behavior = behavior;
    if (behavior === NPCBehavior.IDLE) {
      this.idleTimer = 0;
      this.velocity = new Vector2(0, 0);
    }
  }

  /**
   * 获取行为
   */
  getBehavior(): NPCBehavior {
    return this.behavior;
  }

  /**
   * 更新NPC状态
   */
  update(deltaTime: number, playerPosition: Vector2, currentTime: number = 0): void {
    // 更新朝向（基于速度方向）
    if (this.velocity.length() > 0) {
      this.direction = this.velocity.normalize();
    }

    // 检查玩家是否在视野内
    const playerInVision = this.isPointInVision(playerPosition);

    // 根据视野改变行为
    if (playerInVision) {
      this.setBehavior(NPCBehavior.CHASE);
      this.targetPosition = playerPosition.clone();

      // 朝向玩家
      const toPlayer = playerPosition.subtract(this.position);
      if (toPlayer.length() > 0) {
        this.direction = toPlayer.normalize();
      }

      // 尝试射击
      this.tryShoot(currentTime);
    } else if (this.behavior === NPCBehavior.CHASE) {
      this.setBehavior(NPCBehavior.PATROL);
    }

    // 执行当前行为
    switch (this.behavior) {
      case NPCBehavior.IDLE:
        this.updateIdle(deltaTime);
        break;
      case NPCBehavior.PATROL:
        this.updatePatrol(deltaTime);
        break;
      case NPCBehavior.CHASE:
        this.updateChase(deltaTime);
        break;
      case NPCBehavior.FLEE:
        this.updateFlee(deltaTime, playerPosition);
        break;
    }

    // 应用速度
    const newPosition = this.position.add(this.velocity.multiply(deltaTime));

    // 碰撞检测
    if (this.collisionSystem) {
      this.collisionSystem.updatePosition(this.id, newPosition);
      const collisions = this.collisionSystem.getCollisions(this.id);

      if (collisions.length > 0) {
        // 尝试沿轴移动
        const testX = this.position.add(new Vector2(this.velocity.x * deltaTime, 0));
        this.collisionSystem.updatePosition(this.id, testX);
        const collisionsX = this.collisionSystem.getCollisions(this.id);

        if (collisionsX.length === 0) {
          this.position = testX;
        } else {
          const testY = this.position.add(new Vector2(0, this.velocity.y * deltaTime));
          this.collisionSystem.updatePosition(this.id, testY);
          const collisionsY = this.collisionSystem.getCollisions(this.id);

          if (collisionsY.length === 0) {
            this.position = testY;
          } else {
            this.collisionSystem.updatePosition(this.id, this.position);
          }
        }
      } else {
        this.position = newPosition;
      }
    } else {
      this.position = newPosition;
    }

    // 无限地图，不需要边界检查
  }

  /**
   * 更新空闲状态
   */
  private updateIdle(deltaTime: number): void {
    this.idleTimer += deltaTime;
    this.velocity = new Vector2(0, 0);

    if (this.idleTimer > this.idleDuration) {
      this.setBehavior(NPCBehavior.PATROL);
    }
  }

  /**
   * 更新巡逻状态
   */
  private updatePatrol(deltaTime: number): void {
    if (this.patrolPoints.length === 0) {
      this.setBehavior(NPCBehavior.IDLE);
      return;
    }

    if (!this.targetPosition) {
      this.targetPosition = this.patrolPoints[this.currentPatrolIndex].clone();
    }

    const direction = this.targetPosition.subtract(this.position);
    const distance = direction.length();

    if (distance < 10) {
      // 到达巡逻点
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      this.targetPosition = this.patrolPoints[this.currentPatrolIndex].clone();
      this.velocity = new Vector2(0, 0);
    } else {
      this.velocity = direction.normalize().multiply(this.speed);
    }
  }

  /**
   * 更新追击状态
   */
  private updateChase(deltaTime: number): void {
    if (!this.targetPosition) return;

    const direction = this.targetPosition.subtract(this.position);
    const distance = direction.length();

    if (distance > 0) {
      this.velocity = direction.normalize().multiply(this.speed * 1.2); // 追击时速度更快
    }
  }

  /**
   * 更新逃离状态
   */
  private updateFlee(deltaTime: number, playerPosition: Vector2): void {
    const direction = this.position.subtract(playerPosition);
    const distance = direction.length();

    if (distance > this.fleeRange) {
      this.setBehavior(NPCBehavior.PATROL);
    } else if (distance > 0) {
      this.velocity = direction.normalize().multiply(this.speed * 1.5); // 逃离时速度最快
    }
  }

  /**
   * 渲染NPC
   */
  render(renderer: Renderer, camera: Camera): void {
    const screenPos = camera.worldToScreen(this.position);
    const zoom = camera.getZoom();
    
    // 绘制视野圆锥
    if (this.showVision) {
      this.drawVisionCone(renderer, camera, screenPos);
    }

    // 绘制NPC本体
    renderer.drawCircle(screenPos, this.radius * zoom, this.color, true);

    // 绘制朝向指示器
    const directionLength = this.radius * 1.5 * zoom;
    const directionEnd = screenPos.add(this.direction.multiply(directionLength));
    renderer.drawLine(screenPos, directionEnd, '#ffffff', 1);

    // 绘制血条
    this.drawHealthBar(renderer, screenPos, zoom);
  }

  /**
   * 绘制血条
   */
  private drawHealthBar(renderer: Renderer, screenPos: Vector2, zoom: number): void {
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
   * 绘制视野圆锥
   */
  private drawVisionCone(renderer: Renderer, camera: Camera, screenPos: Vector2): void {
    const zoom = camera.getZoom();
    const visionRangeScreen = this.visionRange * zoom;
    const halfAngle = this.visionAngle / 2;

    // 计算朝向的角度（弧度）
    const directionAngle = Math.atan2(this.direction.y, this.direction.x);
    const leftAngle = directionAngle - (halfAngle * Math.PI) / 180;
    const rightAngle = directionAngle + (halfAngle * Math.PI) / 180;

    // 绘制视野圆锥的两条边界线
    const leftPoint = screenPos.add(
      new Vector2(
        Math.cos(leftAngle) * visionRangeScreen,
        Math.sin(leftAngle) * visionRangeScreen
      )
    );
    const rightPoint = screenPos.add(
      new Vector2(
        Math.cos(rightAngle) * visionRangeScreen,
        Math.sin(rightAngle) * visionRangeScreen
      )
    );

    // 绘制圆锥的两条边
    renderer.drawLine(screenPos, leftPoint, '#4a90e2', 1);
    renderer.drawLine(screenPos, rightPoint, '#4a90e2', 1);

    // 绘制圆锥的弧线
    const ctx = renderer.getContext();
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, visionRangeScreen, leftAngle, rightAngle);
    ctx.stroke();

    // 填充视野区域（半透明）
    ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.arc(screenPos.x, screenPos.y, visionRangeScreen, leftAngle, rightAngle);
    ctx.lineTo(screenPos.x, screenPos.y);
    ctx.fill();
  }

  /**
   * 获取位置
   */
  getPosition(): Vector2 {
    return this.position.clone();
  }

  /**
   * 设置位置
   */
  setPosition(position: Vector2): void {
    this.position = position.clone();
    if (this.collisionSystem) {
      this.collisionSystem.updatePosition(this.id, this.position);
    }
  }

  /**
   * 获取半径
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * 获取ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取朝向
   */
  getDirection(): Vector2 {
    return this.direction.clone();
  }

  /**
   * 获取视野范围
   */
  getVisionRange(): number {
    return this.visionRange;
  }

  /**
   * 获取视野角度
   */
  getVisionAngle(): number {
    return this.visionAngle;
  }

  /**
   * 检查点是否在视野内
   */
  isPointInVision(point: Vector2): boolean {
    const toPoint = point.subtract(this.position);
    const distance = toPoint.length();

    // 检查距离
    if (distance > this.visionRange) {
      return false;
    }

    // 检查角度
    const pointAngle = Math.atan2(toPoint.y, toPoint.x);
    const directionAngle = Math.atan2(this.direction.y, this.direction.x);
    const halfAngle = this.visionAngle / 2;

    let angleDiff = pointAngle - directionAngle;
    // 归一化角度差到 [-π, π]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    return Math.abs(angleDiff) <= (halfAngle * Math.PI) / 180;
  }

  /**
   * 设置是否显示视野
   */
  setShowVision(show: boolean): void {
    this.showVision = show;
  }

    /**
   * 获取是否显示视野
   */
  getShowVision(): boolean {
    return this.showVision;
  }

  /**
   * 受伤
   */
  takeDamage(damage: number, attackerPosition?: Vector2): void {
    if (this.isDead) {
      return;
    }

    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }

    // 受伤后立即进入追击状态
    if (attackerPosition) {
      this.setBehavior(NPCBehavior.CHASE);
      this.targetPosition = attackerPosition.clone();
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

  /**
   * 尝试射击
   */
  private tryShoot(currentTime: number): void {
    if (this.onShoot && currentTime - this.lastShotTime >= this.shotCooldown) {
      this.lastShotTime = currentTime;
      this.onShoot(this.position.clone(), this.direction.clone());
    }
  }

  /**
   * 设置射击回调
   */
  setOnShoot(callback: (position: Vector2, direction: Vector2) => void): void {
    this.onShoot = callback;
  }
}
