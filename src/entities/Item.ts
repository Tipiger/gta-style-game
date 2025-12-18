import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';
import { WeaponType } from './Weapon';

/**
 * 物品类型
 */
export enum ItemType {
  WEAPON = 'weapon'
}

/**
 * 物品类
 */
export class Item {
  private position: Vector2;
  private type: ItemType;
  private weaponType: WeaponType;
  private radius: number = 8;
  private color: string;
  private id: string;
  private rotationAngle: number = 0;

  constructor(id: string, position: Vector2, weaponType: WeaponType) {
    this.id = id;
    this.position = position.clone();
    this.type = ItemType.WEAPON;
    this.weaponType = weaponType;
    this.color = this.getColorByWeapon(weaponType);
  }

  /**
   * 根据武器类型获取颜色
   */
  private getColorByWeapon(weaponType: WeaponType): string {
    switch (weaponType) {
      case WeaponType.PISTOL:
        return '#ffff00'; // 黄色 - 手枪
      case WeaponType.RIFLE:
        return '#00ff00'; // 绿色 - 步枪
      case WeaponType.SHOTGUN:
        return '#ff6600'; // 橙色 - 霰弹枪
    }
  }

  /**
   * 更新物品（旋转动画）
   */
  update(deltaTime: number): void {
    this.rotationAngle += deltaTime * 3; // 每秒旋转3弧度
  }

  /**
   * 渲染物品
   */
  render(renderer: Renderer, camera: Camera): void {
    const screenPos = camera.worldToScreen(this.position);
    const zoom = camera.getZoom();
    const ctx = renderer.getContext();

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(this.rotationAngle);

    // 根据武器类型绘制不同的形状
    switch (this.weaponType) {
      case WeaponType.PISTOL:
        this.drawPistolIcon(ctx, zoom);
        break;
      case WeaponType.RIFLE:
        this.drawRifleIcon(ctx, zoom);
        break;
      case WeaponType.SHOTGUN:
        this.drawShotgunIcon(ctx, zoom);
        break;
    }

    ctx.restore();

    // 绘制中心点
    renderer.drawCircle(screenPos, 3 * zoom, '#ffffff', true);

    // 绘制武器类型文字
    this.drawWeaponLabel(renderer, screenPos, zoom);
  }

  /**
   * 绘制武器类型标签
   */
  private drawWeaponLabel(renderer: Renderer, screenPos: Vector2, zoom: number): void {
    const ctx = renderer.getContext();
    let weaponName = '';

    switch (this.weaponType) {
      case WeaponType.RIFLE:
        weaponName = '步枪';
        break;
      case WeaponType.SHOTGUN:
        weaponName = '霰弹枪';
        break;
      default:
        return; // 手枪不显示标签
    }

    // 绘制文字
    ctx.fillStyle = this.color;
    ctx.font = `${12 * zoom}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(weaponName, screenPos.x, screenPos.y + this.radius * 1.5 * zoom);
  }

  /**
   * 绘制手枪图标（五角星）
   */
  private drawPistolIcon(ctx: CanvasRenderingContext2D, zoom: number): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * this.radius * zoom;
      const y = Math.sin(angle) * this.radius * zoom;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 绘制步枪图标（矩形）
   */
  private drawRifleIcon(ctx: CanvasRenderingContext2D, zoom: number): void {
    ctx.fillStyle = this.color;
    const width = this.radius * 1.5 * zoom;
    const height = this.radius * 0.8 * zoom;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // 绘制边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
  }

  /**
   * 绘制霰弹枪图标（圆形）
   */
  private drawShotgunIcon(ctx: CanvasRenderingContext2D, zoom: number): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * zoom, 0, Math.PI * 2);
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 绘制内部分割线（表示多个弹头）
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI) / 3;
      const x = Math.cos(angle) * this.radius * 0.5 * zoom;
      const y = Math.sin(angle) * this.radius * 0.5 * zoom;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  /**
   * 获取位置
   */
  getPosition(): Vector2 {
    return this.position.clone();
  }

  /**
   * 获取ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取武器类型
   */
  getWeaponType(): WeaponType {
    return this.weaponType;
  }

  /**
   * 获取半径
   */
  getRadius(): number {
    return this.radius;
  }
}

/**
 * 物品管理器
 */
export class ItemManager {
  private items: Map<string, Item> = new Map();
  private itemIdCounter: number = 0;

  /**
   * 添加物品
   */
  addItem(position: Vector2, weaponType: WeaponType): Item {
    const itemId = `item_${this.itemIdCounter++}`;
    const item = new Item(itemId, position, weaponType);
    this.items.set(itemId, item);
    return item;
  }

  /**
   * 移除物品
   */
  removeItem(id: string): boolean {
    return this.items.delete(id);
  }

  /**
   * 获取物品
   */
  getItem(id: string): Item | undefined {
    return this.items.get(id);
  }

  /**
   * 获取所有物品
   */
  getAllItems(): Item[] {
    return Array.from(this.items.values());
  }

  /**
   * 更新所有物品
   */
  update(deltaTime: number): void {
    for (const item of this.items.values()) {
      item.update(deltaTime);
    }
  }

  /**
   * 渲染所有物品
   */
  render(renderer: Renderer, camera: Camera): void {
    for (const item of this.items.values()) {
      item.render(renderer, camera);
    }
  }

  /**
   * 获取物品数量
   */
  getCount(): number {
    return this.items.size;
  }

  /**
   * 清空所有物品
   */
  clear(): void {
    this.items.clear();
  }
}
