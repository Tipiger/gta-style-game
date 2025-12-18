import { Game } from './core/Game';

// 创建游戏实例
const game = new Game();

// 启动游戏
game.start();

// 导出游戏实例供调试使用
(window as any).game = game;
