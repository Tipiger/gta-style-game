import { Vector2 } from '../utils/Vector2';

/**
 * 俯视角摄像机系统
 */
export class Camera {
  private position: Vector2;
  private zoom: number;
  private width: number;
  private height: number;
  private minZoom: number = 0.5;
  private maxZoom: number = 3;

  constructor(width: number, height: number) {
    this.position = new Vector2(0, 0);
    this.zoom = 1;
    this.width = width;
    this.height = height;
  }

  /**
   * 设置摄像机位置
   */
  setPosition(position: Vector2): void {
    this.position = position.clone();
  }

  /**
   * 获取摄像机位置
   */
  getPosition(): Vector2 {
    return this.position.clone();
  }

  /**
   * 摄像机跟随目标
   */
  follow(targetPosition: Vector2, smoothness: number = 0.1): void {
    const diff = targetPosition.subtract(this.position);
    this.position = this.position.add(diff.multiply(smoothness));
  }

  /**
   * 设置缩放级别
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(zoom, this.maxZoom));
  }

  /**
   * 获取缩放级别
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * 增加缩放
   */
  zoomIn(amount: number = 0.1): void {
    this.setZoom(this.zoom + amount);
  }

  /**
   * 减少缩放
   */
  zoomOut(amount: number = 0.1): void {
    this.setZoom(this.zoom - amount);
  }

  /**
   * 将世界坐标转换为屏幕坐标
   */
  worldToScreen(worldPos: Vector2): Vector2 {
    const screenX = (worldPos.x - this.position.x) * this.zoom + this.width / 2;
    const screenY = (worldPos.y - this.position.y) * this.zoom + this.height / 2;
    return new Vector2(screenX, screenY);
  }

  /**
   * 将屏幕坐标转换为世界坐标
   */
  screenToWorld(screenPos: Vector2): Vector2 {
    const worldX = (screenPos.x - this.width / 2) / this.zoom + this.position.x;
    const worldY = (screenPos.y - this.height / 2) / this.zoom + this.position.y;
    return new Vector2(worldX, worldY);
  }

  /**
   * 获取摄像机视口（世界坐标）
   */
  getViewport(): { x: number; y: number; width: number; height: number } {
    const viewWidth = this.width / this.zoom;
    const viewHeight = this.height / this.zoom;
    return {
      x: this.position.x - viewWidth / 2,
      y: this.position.y - viewHeight / 2,
      width: viewWidth,
      height: viewHeight
    };
  }

  /**
   * 更新摄像机尺寸
   */
  updateSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}
