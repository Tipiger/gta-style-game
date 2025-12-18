import { Vector2 } from '../utils/Vector2';

/**
 * Canvas渲染器
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * 调整Canvas大小
   */
  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  /**
   * 清空画布
   */
  clear(color: string = '#2a2a2a'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * 绘制矩形
   */
  drawRect(
    position: Vector2,
    width: number,
    height: number,
    color: string,
    filled: boolean = true
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;

    if (filled) {
      this.ctx.fillRect(position.x, position.y, width, height);
    } else {
      this.ctx.strokeRect(position.x, position.y, width, height);
    }
  }

  /**
   * 绘制圆形
   */
  drawCircle(
    position: Vector2,
    radius: number,
    color: string,
    filled: boolean = true
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);

    if (filled) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  /**
   * 绘制线条
   */
  drawLine(
    from: Vector2,
    to: Vector2,
    color: string,
    width: number = 1
  ): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  /**
   * 绘制文本
   */
  drawText(
    text: string,
    position: Vector2,
    color: string,
    fontSize: number = 16,
    fontFamily: string = 'Arial'
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillText(text, position.x, position.y);
  }

  /**
   * 获取Canvas宽度
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * 获取Canvas高度
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * 获取Canvas上下文
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
