import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';
import { CollisionSystem } from '../world/Collision';

/**
 * 车辆类
 */
export class Vehicle {
  private position: Vector2;
  private velocity: Vector2;
  private speed: number = 600; // 像素/秒
  private maxSpeed: number = 900;
  private acceleration: number = 450;
  private friction: number = 0.98; // 摩擦力
  private width: number = 40;
  private height: number = 24;
  private color: string = '#ff0000'; // 红色车辆
  private rotation: number = 0; // 旋转角度（弧度）
  private id: string;
  private collisionSystem: CollisionSystem | null = null;
  private isOccupied: boolean = false; // 是否被占用
  private occupantId: string | null = null; // 占用者ID

  constructor(id: string, position: Vector2) {
    this.id = id;
    this.position = position.clone();
    this.velocity = new Vector2(0, 0);
  }

  /**
   * 设置碰撞系统
   */
  setCollisionSystem(collisionSystem: CollisionSystem): void {
    this.collisionSystem = collisionSystem;
    // 注册车辆碰撞体
    this.collisionSystem.register(this.id, {
      position: this.position.clone(),
      radius: Math.max(this.width, this.height) / 2,
      type: 'circle'
    });
  }

  /**
   * 获取ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取位置
   */
  getPosition(): Vector2 {
    return this.position.clone();
  }

  /**
   * 获取宽度
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * 获取高度
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * 检查是否被占用
   */
  isOccupiedByPlayer(): boolean {
    return this.isOccupied;
  }

  /**
   * 获取占用者ID
   */
  getOccupantId(): string | null {
    return this.occupantId;
  }

  /**
   * 玩家进入车辆
   */
  enterVehicle(playerId: string): void {
    this.isOccupied = true;
    this.occupantId = playerId;
  }

  /**
   * 玩家离开车辆
   */
  exitVehicle(): void {
    this.isOccupied = false;
    this.occupantId = null;
    this.velocity = new Vector2(0, 0); // 停止车辆
  }

  /**
   * 设置车辆位置（用于跟随玩家）
   */
  setPosition(position: Vector2): void {
    this.position = position.clone();
    if (this.collisionSystem) {
      this.collisionSystem.updatePosition(this.id, this.position.clone());
    }
  }

  /**
   * 设置车辆旋转角度
   */
  setRotation(angle: number): void {
    this.rotation = angle;
  }

  /**
   * 获取车辆旋转角度
   */
  getRotation(): number {
    return this.rotation;
  }

  /**
   * 加速
   */
  accelerate(): void {
    const currentSpeed = this.velocity.length();
    if (currentSpeed < this.maxSpeed) {
      const direction = new Vector2(Math.cos(this.rotation), Math.sin(this.rotation));
      this.velocity = this.velocity.add(direction.multiply(this.acceleration * 0.016)); // 假设16ms帧时间
    }
  }

  /**
   * 减速
   */
  decelerate(): void {
    this.velocity = this.velocity.multiply(0.85);
  }

  /**
   * 转向左
   */
  turnLeft(): void {
    this.rotation -= 0.05;
  }

  /**
   * 转向右
   */
  turnRight(): void {
    this.rotation += 0.05;
  }

  /**
   * 更新车辆
   */
  update(deltaTime: number): void {
    // 应用摩擦力
    this.velocity = this.velocity.multiply(this.friction);

    // 更新位置
    this.position = this.position.add(this.velocity.multiply(deltaTime));

    // 更新碰撞系统
    if (this.collisionSystem) {
      this.collisionSystem.updatePosition(this.id, this.position.clone());
    }
  }

  /**
   * 渲染车辆
   */
  render(renderer: Renderer, camera: Camera): void {
    const screenPos = camera.worldToScreen(this.position);
    const zoom = camera.getZoom();

    const ctx = renderer.getContext();
    ctx.save();

    // 移动到车辆位置
    ctx.translate(screenPos.x, screenPos.y);
    // 旋转
    ctx.rotate(this.rotation);

    // 绘制车身
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2 * zoom, -this.height / 2 * zoom, this.width * zoom, this.height * zoom);

    // 绘制车窗
    ctx.fillStyle = '#87ceeb'; // 天蓝色
    ctx.fillRect(-this.width / 3 * zoom, -this.height / 3 * zoom, this.width / 1.5 * zoom, this.height / 3 * zoom);

    // 绘制车灯
    ctx.fillStyle = '#ffff00'; // 黄色
    ctx.fillRect(-this.width / 2 * zoom, -this.height / 4 * zoom, 3 * zoom, 3 * zoom);
    ctx.fillRect(this.width / 2 * zoom - 3 * zoom, -this.height / 4 * zoom, 3 * zoom, 3 * zoom);

    ctx.restore();

    // 绘制车辆边框（表示可交互）
    if (!this.isOccupied) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        screenPos.x - this.width / 2 * zoom,
        screenPos.y - this.height / 2 * zoom,
        this.width * zoom,
        this.height * zoom
      );
    }
  }

  /**
   * 检查玩家是否在车辆范围内
   */
  isPlayerNearby(playerPosition: Vector2, range: number = 50): boolean {
    const distance = this.position.subtract(playerPosition).length();
    return distance < range;
  }
}

/**
 * 车辆管理器
 */
export class VehicleManager {
  private vehicles: Map<string, Vehicle> = new Map();
  private vehicleIdCounter: number = 0;
  private collisionSystem: CollisionSystem | null = null;
  private maxVehicles: number = 5; // 最多维持5辆车
  private spawnRange: number = 800; // 生成范围（玩家周围）
  private despawnRange: number = 1200; // 消失范围（超出此范围会被删除）

  /**
   * 设置碰撞系统
   */
  setCollisionSystem(collisionSystem: CollisionSystem): void {
    this.collisionSystem = collisionSystem;
  }

  /**
   * 生成车辆
   */
  spawnVehicle(position: Vector2): Vehicle {
    if (this.vehicles.size >= this.maxVehicles) {
      return Array.from(this.vehicles.values())[0]; // 返回第一辆车
    }

    const vehicleId = `vehicle_${this.vehicleIdCounter++}`;
    const vehicle = new Vehicle(vehicleId, position);

    if (this.collisionSystem) {
      vehicle.setCollisionSystem(this.collisionSystem);
    }

    this.vehicles.set(vehicleId, vehicle);
    return vehicle;
  }

  /**
   * 获取所有车辆
   */
  getVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  /**
   * 获取玩家附近的车辆
   */
  getNearbyVehicles(playerPosition: Vector2, range: number = 100): Vehicle[] {
    return Array.from(this.vehicles.values()).filter(vehicle =>
      vehicle.isPlayerNearby(playerPosition, range)
    );
  }

  /**
   * 获取玩家占用的车辆
   */
  getPlayerVehicle(playerId: string): Vehicle | null {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.getOccupantId() === playerId) {
        return vehicle;
      }
    }
    return null;
  }

  /**
   * 更新车辆管理器
   */
  update(deltaTime: number, playerPosition: Vector2): void {
    const vehiclesToRemove: string[] = [];

    for (const [vehicleId, vehicle] of this.vehicles) {
      // 更新车辆
      vehicle.update(deltaTime);

      // 检查是否超出范围
      const distance = vehicle.getPosition().subtract(playerPosition).length();
      if (distance > this.despawnRange) {
        vehiclesToRemove.push(vehicleId);
      }
    }

    // 移除超出范围的车辆
    for (const vehicleId of vehiclesToRemove) {
      this.vehicles.delete(vehicleId);
    }

    // 尝试生成新车辆
    if (this.vehicles.size < this.maxVehicles && Math.random() < 0.01) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 400 + Math.random() * 400;
      const spawnPos = new Vector2(
        playerPosition.x + Math.cos(angle) * distance,
        playerPosition.y + Math.sin(angle) * distance
      );
      this.spawnVehicle(spawnPos);
    }
  }

  /**
   * 渲染所有车辆
   */
  render(renderer: Renderer, camera: Camera): void {
    for (const vehicle of this.vehicles.values()) {
      vehicle.render(renderer, camera);
    }
  }

  /**
   * 获取车辆数量
   */
  getCount(): number {
    return this.vehicles.size;
  }
}
