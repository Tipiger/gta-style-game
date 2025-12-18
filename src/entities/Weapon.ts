import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';

/**
 * 武器类型
 */
export enum WeaponType {
  PISTOL = 'pistol',
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun'
}

/**
 * 射击模式
 */
export enum FireMode {
  SEMI_AUTO = 'semi_auto', // 半自动
  FULL_AUTO = 'full_auto'  // 全自动
}

/**
 * 武器配置接口
 */
interface WeaponConfig {
  type: WeaponType;
  damage: number; // 伤害值
  fireRate: number; // 射速（子弹/秒）
  range: number; // 射程
  bulletSpeed: number; // 子弹速度
  bulletSize: number; // 子弹大小
  accuracy: number; // 精准度（0-1）
  magazineCapacity: number; // 弹匣容量
  reloadTime: number; // 装弹时间（秒）
  fireMode: FireMode; // 射击模式
  spread: number; // 散射角度（度数）
  pelletsPerShot?: number; // 每次射击的子弹数（散弹枪用）
}

/**
 * 武器类
 */
export class Weapon {
  private type: WeaponType;
  private config: WeaponConfig;
  private currentAmmo: number; // 当前弹夹中的子弹数
  private reserveAmmo: number; // 备弹数
  private lastFireTime: number = 0; // 上次射击时间
  private fireInterval: number; // 射击间隔
  private isReloading: boolean = false; // 是否正在装弹
  private reloadStartTime: number = 0; // 装弹开始时间
  private isMouseDown: boolean = false; // 鼠标是否按下（用于全自动）

  constructor(type: WeaponType, reserveAmmo: number = 0) {
    this.type = type;
    this.config = this.getWeaponConfig(type);
    this.currentAmmo = this.config.magazineCapacity;
    this.reserveAmmo = reserveAmmo;
    this.fireInterval = 1 / this.config.fireRate;
  }

  /**
   * 获取武器配置
   */
  private getWeaponConfig(type: WeaponType): WeaponConfig {
    switch (type) {
      case WeaponType.PISTOL:
        return {
          type: WeaponType.PISTOL,
          damage: 10,
          fireRate: 5, // 每秒5发
          range: 300,
          bulletSpeed: 500,
          bulletSize: 3,
          accuracy: 0.9,
          magazineCapacity: 10,
          reloadTime: 0.8, // 最快
          fireMode: FireMode.SEMI_AUTO, // 半自动
          spread: 0 // 无散射
        };
      case WeaponType.RIFLE:
        return {
          type: WeaponType.RIFLE,
          damage: 20,
          fireRate: 8,
          range: 500,
          bulletSpeed: 700,
          bulletSize: 4,
          accuracy: 0.95,
          magazineCapacity: 30,
          reloadTime: 2.0, // 最慢
          fireMode: FireMode.FULL_AUTO, // 全自动
          spread: 15 // 有散射
        };
      case WeaponType.SHOTGUN:
        return {
          type: WeaponType.SHOTGUN,
          damage: 15, // 单发伤害较低，但多发
          fireRate: 1,
          range: 150,
          bulletSpeed: 400,
          bulletSize: 2, // 小子弹
          accuracy: 0.95, // 高精准度，散射由spread控制
          magazineCapacity: 6,
          reloadTime: 1.2, // 中等
          fireMode: FireMode.SEMI_AUTO, // 半自动
          spread: 15, // 散射角度15度（±7.5度）
          pelletsPerShot: 8 // 每次射击8发子弹
        };
    }
  }

  /**
   * 检查是否可以射击
   */
  canFire(currentTime: number): boolean {
    if (this.currentAmmo <= 0 || this.isReloading) {
      return false;
    }

    // 半自动：需要间隔时间
    if (this.config.fireMode === FireMode.SEMI_AUTO) {
      return currentTime - this.lastFireTime >= this.fireInterval;
    }

    // 全自动：只要鼠标按下就可以射击
    return this.isMouseDown && currentTime - this.lastFireTime >= this.fireInterval;
  }

  /**
   * 射击
   */
  fire(currentTime: number): boolean {
    if (!this.canFire(currentTime)) {
      return false;
    }

    this.currentAmmo--;
    this.lastFireTime = currentTime;
    return true;
  }

  /**
   * 设置鼠标按下状态（用于全自动）
   */
  setMouseDown(isDown: boolean): void {
    this.isMouseDown = isDown;
  }

  /**
   * 开始装弹
   */
  startReload(currentTime: number): void {
    // 如果已经在装弹或弹夹已满，不能装弹
    if (this.isReloading || this.currentAmmo === this.config.magazineCapacity) {
      return;
    }

    // 如果备弹充足，开始装弹
    if (this.reserveAmmo > 0) {
      this.isReloading = true;
      this.reloadStartTime = currentTime;
    }
  }

  /**
   * 更新装弹状态
   */
  updateReload(currentTime: number): void {
    if (!this.isReloading) {
      return;
    }

    // 检查装弹是否完成
    if (currentTime - this.reloadStartTime >= this.config.reloadTime) {
      this.isReloading = false;
      // 装满弹夹
      const needAmmo = this.config.magazineCapacity - this.currentAmmo;
      const reloadAmmo = Math.min(needAmmo, this.reserveAmmo);
      this.currentAmmo += reloadAmmo;
      this.reserveAmmo -= reloadAmmo;
    }
  }

  /**
   * 获取装弹进度（0-1）
   */
  getReloadProgress(): number {
    if (!this.isReloading) {
      return 0;
    }
    // 这个方法需要传入currentTime，所以在这里无法实现
    // 将在Player中处理
    return 0;
  }

  /**
   * 是否正在装弹
   */
  isReloadingNow(): boolean {
    return this.isReloading;
  }

  /**
   * 获取武器配置
   */
  getConfig(): WeaponConfig {
    return { ...this.config };
  }

  /**
   * 获取当前弹夹中的子弹数
   */
  getCurrentAmmo(): number {
    return this.currentAmmo;
  }

  /**
   * 获取备弹数
   */
  getReserveAmmo(): number {
    return this.reserveAmmo;
  }

  /**
   * 添加备弹
   */
  addReserveAmmo(amount: number): void {
    this.reserveAmmo += amount;
  }

  /**
   * 获取总弹药数（当前+备弹）
   */
  getTotalAmmo(): number {
    return this.currentAmmo + this.reserveAmmo;
  }

  /**
   * 获取武器类型
   */
  getType(): WeaponType {
    return this.type;
  }

  /**
   * 获取武器类型（公开方法）
   */
  getWeaponType(): WeaponType {
    return this.type;
  }

  /**
   * 获取武器名称
   */
  getName(): string {
    switch (this.type) {
      case WeaponType.PISTOL:
        return '手枪';
      case WeaponType.RIFLE:
        return '步枪';
      case WeaponType.SHOTGUN:
        return '霰弹枪';
    }
  }
}

/**
 * 子弹类
 */
export class Bullet {
  private position: Vector2;
  private velocity: Vector2;
  private damage: number;
  private range: number;
  private size: number;
  private distanceTraveled: number = 0;
  private color: string = '#ffff00';
  private ownerId: string; // 子弹所有者ID

  constructor(
    position: Vector2,
    direction: Vector2,
    damage: number,
    bulletSpeed: number,
    range: number,
    size: number,
    ownerId: string
  ) {
    this.position = position.clone();
    this.velocity = direction.normalize().multiply(bulletSpeed);
    this.damage = damage;
    this.range = range;
    this.size = size;
    this.ownerId = ownerId;
  }

  /**
   * 更新子弹
   */
  update(deltaTime: number): void {
    const movement = this.velocity.multiply(deltaTime);
    this.position = this.position.add(movement);
    this.distanceTraveled += movement.length();
  }

  /**
   * 检查子弹是否超出射程
   */
  isOutOfRange(): boolean {
    return this.distanceTraveled > this.range;
  }

  /**
   * 渲染子弹
   */
  render(renderer: Renderer, camera: Camera): void {
    const screenPos = camera.worldToScreen(this.position);
    renderer.drawCircle(screenPos, this.size * camera.getZoom(), this.color, true);
  }

  /**
   * 获取位置
   */
  getPosition(): Vector2 {
    return this.position.clone();
  }

  /**
   * 获取伤害值
   */
  getDamage(): number {
    return this.damage;
  }

  /**
   * 获取大小
   */
  getSize(): number {
    return this.size;
  }

  /**
   * 获取所有者ID
   */
  getOwnerId(): string {
    return this.ownerId;
  }

  /**
   * 获取方向
   */
  getDirection(): Vector2 {
    return this.velocity.normalize();
  }
}

/**
 * 子弹管理器
 */
export class BulletManager {
  private bullets: Bullet[] = [];

  /**
   * 添加子弹
   */
  addBullet(bullet: Bullet): void {
    this.bullets.push(bullet);
  }

  /**
   * 更新所有子弹
   */
  update(deltaTime: number): void {
    // 更新子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].update(deltaTime);

      // 删除超出射程的子弹
      if (this.bullets[i].isOutOfRange()) {
        this.bullets.splice(i, 1);
      }
    }
  }

  /**
   * 渲染所有子弹
   */
  render(renderer: Renderer, camera: Camera): void {
    for (const bullet of this.bullets) {
      bullet.render(renderer, camera);
    }
  }

  /**
   * 获取所有子弹
   */
  getBullets(): Bullet[] {
    return this.bullets;
  }

  /**
   * 删除子弹
   */
  removeBullet(index: number): void {
    this.bullets.splice(index, 1);
  }

  /**
   * 清空所有子弹
   */
  clear(): void {
    this.bullets = [];
  }

  /**
   * 获取子弹数量
   */
  getCount(): number {
    return this.bullets.length;
  }
}
