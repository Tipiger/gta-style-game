/**
 * 输入管理器
 */
export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private keysJustPressed: Set<string> = new Set();
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
      const key = e.key.toLowerCase();
      // 只在按键从未按下变为按下时，标记为刚按下
      if (!this.keys.get(key)) {
        this.keysJustPressed.add(key);
      }
      this.keys.set(key, true);
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
   * 检查键是否刚被按下（只在按下的那一帧返回true）
   */
  isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  /**
   * 清除刚按下的键记录（应该在每帧更新后调用）
   */
  clearJustPressedKeys(): void {
    this.keysJustPressed.clear();
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
