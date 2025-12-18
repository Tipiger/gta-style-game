import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';
import { CollisionSystem } from './Collision';

/**
 * 地图元素接口
 */
interface MapElement {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'road' | 'building' | 'grass';
  color: string;
  id?: string;
}

/**
 * 游戏地图类 - 支持无限延展
 */
export class GameMap {
  private tileSize: number;
  private elementMap: Map<string, MapElement> = new Map(); // 使用Map存储元素，key为"x,y"
  private collisionSystem: CollisionSystem;
  private chunkSize: number = 10; // 每个chunk包含10x10个瓦片
  private generatedChunks: Set<string> = new Set(); // 已生成的chunk
  private buildingIdCounter: number = 0;

  constructor(width: number, height: number, tileSize: number = 32) {
    this.tileSize = tileSize;
    this.collisionSystem = new CollisionSystem();
  }

  /**
   * 获取chunk的key
   */
  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  /**
   * 获取瓦片所在的chunk
   */
  private _getTileChunk(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: Math.floor(tileX / this.chunkSize),
      y: Math.floor(tileY / this.chunkSize)
    };
  }

  /**
   * 生成指定chunk的地图
   */
  private generateChunk(chunkX: number, chunkY: number): void {
    const chunkKey = this.getChunkKey(chunkX, chunkY);
    if (this.generatedChunks.has(chunkKey)) {
      return;
    }

    this.generatedChunks.add(chunkKey);

    const startTileX = chunkX * this.chunkSize;
    const startTileY = chunkY * this.chunkSize;
    const endTileX = startTileX + this.chunkSize;
    const endTileY = startTileY + this.chunkSize;

    // 生成基础草地
    for (let tileY = startTileY; tileY < endTileY; tileY++) {
      for (let tileX = startTileX; tileX < endTileX; tileX++) {
        const key = `${tileX},${tileY}`;
        this.elementMap.set(key, {
          x: tileX * this.tileSize,
          y: tileY * this.tileSize,
          width: this.tileSize,
          height: this.tileSize,
          type: 'grass',
          color: '#2d5016'
        });
      }
    }

    // 生成道路
    this.generateRoadsInChunk(startTileX, startTileY, endTileX, endTileY);

    // 生成建筑
    this.generateBuildingsInChunk(startTileX, startTileY, endTileX, endTileY);
  }

  /**
   * 在chunk中生成道路
   */
  private generateRoadsInChunk(
    startTileX: number,
    startTileY: number,
    endTileX: number,
    endTileY: number
  ): void {
    // 水平道路（每8个瓦片一条）
    for (let tileY = startTileY; tileY < endTileY; tileY++) {
      if (tileY % 8 === 0) {
        for (let tileX = startTileX; tileX < endTileX; tileX++) {
          const key = `${tileX},${tileY}`;
          const element = this.elementMap.get(key);
          if (element) {
            element.type = 'road';
            element.color = '#444444';
          }
        }
      }
    }

    // 竖直道路（每8个瓦片一条）
    for (let tileX = startTileX; tileX < endTileX; tileX++) {
      if (tileX % 8 === 0) {
        for (let tileY = startTileY; tileY < endTileY; tileY++) {
          const key = `${tileX},${tileY}`;
          const element = this.elementMap.get(key);
          if (element) {
            element.type = 'road';
            element.color = '#444444';
          }
        }
      }
    }
  }

  /**
   * 在chunk中生成建筑
   */
  private generateBuildingsInChunk(
    startTileX: number,
    startTileY: number,
    endTileX: number,
    endTileY: number
  ): void {
    const buildingColors = ['#8b4513', '#a0522d', '#cd853f', '#daa520'];

    // 使用种子生成确定性的建筑位置
    for (let tileY = startTileY + 2; tileY < endTileY - 2; tileY += 10) {
      for (let tileX = startTileX + 2; tileX < endTileX - 2; tileX += 10) {
        // 使用坐标作为种子生成伪随机数
        const seed = tileX * 73856093 ^ tileY * 19349663;
        const random1 = Math.abs(Math.sin(seed) * 10000) % 1;
        const random2 = Math.abs(Math.sin(seed + 1) * 10000) % 1;

        const buildingWidth = (2 + random1 * 3) | 0;
        const buildingHeight = (2 + random2 * 3) | 0;

        for (let by = 0; by < buildingHeight; by++) {
          for (let bx = 0; bx < buildingWidth; bx++) {
            const buildingTileX = tileX + bx;
            const buildingTileY = tileY + by;

            if (buildingTileX < endTileX && buildingTileY < endTileY) {
              const key = `${buildingTileX},${buildingTileY}`;
              const element = this.elementMap.get(key);

              if (element) {
                const buildingId = `building_${this.buildingIdCounter++}`;
                element.type = 'building';
                element.color =
                  buildingColors[Math.floor(random1 * buildingColors.length)];
                element.id = buildingId;

                // 为建筑添加碰撞体
                this.collisionSystem.register(buildingId, {
                  position: new Vector2(element.x, element.y),
                  radius: 0,
                  type: 'rect',
                  width: element.width,
                  height: element.height
                });

              }
            }
          }
        }
      }
    }
  }

  /**
   * 确保指定区域的chunk已生成
   */
  private ensureChunksGenerated(viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    const startTileX = Math.floor(viewport.x / this.tileSize);
    const startTileY = Math.floor(viewport.y / this.tileSize);
    const endTileX = Math.ceil((viewport.x + viewport.width) / this.tileSize);
    const endTileY = Math.ceil((viewport.y + viewport.height) / this.tileSize);

    const startChunkX = Math.floor(startTileX / this.chunkSize);
    const startChunkY = Math.floor(startTileY / this.chunkSize);
    const endChunkX = Math.ceil(endTileX / this.chunkSize);
    const endChunkY = Math.ceil(endTileY / this.chunkSize);

    for (let chunkY = startChunkY; chunkY < endChunkY; chunkY++) {
      for (let chunkX = startChunkX; chunkX < endChunkX; chunkX++) {
        this.generateChunk(chunkX, chunkY);
      }
    }
  }

  /**
   * 渲染地图
   */
  render(renderer: Renderer, camera: Camera): void {
    const viewport = camera.getViewport();
    const zoom = camera.getZoom();

    // 确保需要的chunk已生成
    this.ensureChunksGenerated(viewport);

    // 只渲染视口内的元素
    for (const element of this.elementMap.values()) {
      // 检查元素是否在视口内
      if (
        element.x + element.width < viewport.x ||
        element.x > viewport.x + viewport.width ||
        element.y + element.height < viewport.y ||
        element.y > viewport.y + viewport.height
      ) {
        continue;
      }

      const screenPos = camera.worldToScreen(new Vector2(element.x, element.y));
      const screenWidth = element.width * zoom;
      const screenHeight = element.height * zoom;

      renderer.drawRect(screenPos, screenWidth, screenHeight, element.color, true);

      // 绘制边框
      renderer.drawRect(screenPos, screenWidth, screenHeight, '#333333', false);
    }
  }

  /**
   * 获取瓦片大小
   */
  getTileSize(): number {
    return this.tileSize;
  }

  /**
   * 获取碰撞系统
   */
  getCollisionSystem(): CollisionSystem {
    return this.collisionSystem;
  }

  /**
   * 获取所有建筑物
   */
  getBuildings(): MapElement[] {
    return Array.from(this.elementMap.values()).filter(el => el.type === 'building');
  }

}
