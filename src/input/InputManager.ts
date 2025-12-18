/**
 * 输入管理器
 */
export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private mouseButtons: Map<number, boolean> = new Map();

  constructor() {
    this.setupKeyboardListeners();
    this.setupMouseListeners();
  }

  /**
   * 设置键盘监听
   */
  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.key.toLowerCase(), true);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.key.toLowerCase(), false);
    });
  }

  /**
   * 设置鼠标监听
   */
  private setupMouseListeners(): void {
    window.addEventListener('mousemove', (e) => {
      this.mousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousedown', (e) => {
      this.mouseButtons.set(e.button, true);
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.set(e.button, false);
    });
  }

  /**
   * 检查键是否被按下
   */
  isKeyPressed(key: string): boolean {
    return this.keys.get(key.toLowerCase()) ?? false;
  }

  /**
   * 检查鼠标按钮是否被按下
   */
  isMouseButtonPressed(button: number = 0): boolean {
    return this.mouseButtons.get(button) ?? false;
  }

  /**
   * 获取鼠标位置
   */
  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  /**
   * 检查是否按下了任何移动键
   */
  getMovementInput(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.isKeyPressed('w') || this.isKeyPressed('arrowup')) y -= 1;
    if (this.isKeyPressed('s') || this.isKeyPressed('arrowdown')) y += 1;
    if (this.isKeyPressed('a') || this.isKeyPressed('arrowleft')) x -= 1;
    if (this.isKeyPressed('d') || this.isKeyPressed('arrowright')) x += 1;

    return { x, y };
  }
}
