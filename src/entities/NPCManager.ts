import { NPC } from './NPC';
import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../graphics/Renderer';
import { Camera } from '../graphics/Camera';
import { CollisionSystem } from '../world/Collision';

/**
 * NPC管理器
 */
export class NPCManager {
  private npcs: Map<string, NPC> = new Map();
  private collisionSystem: CollisionSystem | null = null;
  private maxNPCs: number = 5; // 最大NPC数量
  private _spawnRange: number = 600; // 生成范围（玩家周围）
  private despawnRange: number = 1000; // 消失范围（超出此范围会被删除）
  private npcIdCounter: number = 0; // NPC ID计数器

  /**
   * 设置碰撞系统
   */
  setCollisionSystem(collisionSystem: CollisionSystem): void {
    this.collisionSystem = collisionSystem;
    // 为所有已存在的NPC设置碰撞系统
    for (const npc of this.npcs.values()) {
      npc.setCollisionSystem(collisionSystem);
    }
  }


  /**
   * 创建NPC
   */
  createNPC(id: string, position: Vector2): NPC {
    const npc = new NPC(id, position);
    if (this.collisionSystem) {
      npc.setCollisionSystem(this.collisionSystem);
    }
    this.npcs.set(id, npc);
    return npc;
  }

  /**
   * 获取NPC
   */
  getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  /**
   * 删除NPC
   */
  removeNPC(id: string): boolean {
    return this.npcs.delete(id);
  }

  /**
   * 获取所有NPC
   */
  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  /**
   * 获取NPC数量
   */
  getNPCCount(): number {
    return this.npcs.size;
  }

  /**
   * 更新所有NPC
   */
  update(deltaTime: number, playerPosition: Vector2, currentTime: number = 0): void {
    // 更新现有NPC
    const npcToRemove: string[] = [];
    for (const [id, npc] of this.npcs.entries()) {
      npc.update(deltaTime, playerPosition, currentTime);

      // 检查NPC是否超出消失范围或已死亡
      const distance = npc.getPosition().distance(playerPosition);
      if (distance > this.despawnRange || npc.getIsDead()) {
        npcToRemove.push(id);
      }
    }

    // 删除超出范围或已死亡的NPC
    for (const id of npcToRemove) {
      this.removeNPC(id);
    }

    // 生成新的NPC以维持数量
    this.spawnNPCsAroundPlayer(playerPosition);
  }

  /**
   * 在玩家周围生成NPC
   */
  private spawnNPCsAroundPlayer(playerPosition: Vector2): void {
    // 如果NPC数量已达到最大，不再生成
    if (this.npcs.size >= this.maxNPCs) {
      return;
    }

    // 需要生成的NPC数量
    const npcToSpawn = this.maxNPCs - this.npcs.size;

    for (let i = 0; i < npcToSpawn; i++) {
      // 在玩家周围随机生成位置
      const angle = Math.random() * Math.PI * 2;
      const distance = 400 + Math.random() * 200; // 在400-600像素范围内
      const x = playerPosition.x + Math.cos(angle) * distance;
      const y = playerPosition.y + Math.sin(angle) * distance;

      const npcId = `npc_${this.npcIdCounter++}`;
      const npc = this.createNPC(npcId, new Vector2(x, y));

      // 为NPC设置巡逻路线
      const patrolPoints = [
        new Vector2(x, y),
        new Vector2(x + 200, y),
        new Vector2(x + 200, y + 200),
        new Vector2(x, y + 200)
      ];
      npc.setPatrolPoints(patrolPoints);
    }
  }

  /**
   * 渲染所有NPC
   */
  render(renderer: Renderer, camera: Camera): void {
    for (const npc of this.npcs.values()) {
      npc.render(renderer, camera);
    }
  }

  /**
   * 清空所有NPC
   */
  clear(): void {
    this.npcs.clear();
  }
}
