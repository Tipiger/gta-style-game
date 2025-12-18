import { Vector2 } from '../utils/Vector2';

/**
 * 碰撞体接口
 */
export interface Collider {
  position: Vector2;
  radius: number;
  type: 'circle' | 'rect';
  width?: number;
  height?: number;
}

/**
 * 碰撞检测系统
 */
export class CollisionSystem {
  private colliders: Map<string, Collider> = new Map();

  /**
   * 注册碰撞体
   */
  register(id: string, collider: Collider): void {
    this.colliders.set(id, collider);
  }

  /**
   * 注销碰撞体
   */
  unregister(id: string): void {
    this.colliders.delete(id);
  }

  /**
   * 更新碰撞体位置
   */
  updatePosition(id: string, position: Vector2): void {
    const collider = this.colliders.get(id);
    if (collider) {
      collider.position = position.clone();
    }
  }

  /**
   * 圆形与圆形碰撞检测
   */
  private circleToCircle(a: Collider, b: Collider): boolean {
    const distance = a.position.distance(b.position);
    return distance < a.radius + b.radius;
  }

  /**
   * 圆形与矩形碰撞检测
   */
  private circleToRect(circle: Collider, rect: Collider): boolean {
    const rectLeft = rect.position.x;
    const rectRight = rect.position.x + (rect.width || 0);
    const rectTop = rect.position.y;
    const rectBottom = rect.position.y + (rect.height || 0);

    // 找到圆心到矩形最近的点
    const closestX = Math.max(rectLeft, Math.min(circle.position.x, rectRight));
    const closestY = Math.max(rectTop, Math.min(circle.position.y, rectBottom));

    // 计算距离
    const distance = Math.sqrt(
      (circle.position.x - closestX) ** 2 + (circle.position.y - closestY) ** 2
    );

    return distance < circle.radius;
  }

  /**
   * 矩形与矩形碰撞检测
   */
  private rectToRect(a: Collider, b: Collider): boolean {
    return (
      a.position.x < b.position.x + (b.width || 0) &&
      a.position.x + (a.width || 0) > b.position.x &&
      a.position.y < b.position.y + (b.height || 0) &&
      a.position.y + (a.height || 0) > b.position.y
    );
  }

  /**
   * 检测两个碰撞体是否碰撞
   */
  isColliding(id1: string, id2: string): boolean {
    const collider1 = this.colliders.get(id1);
    const collider2 = this.colliders.get(id2);

    if (!collider1 || !collider2) return false;

    if (collider1.type === 'circle' && collider2.type === 'circle') {
      return this.circleToCircle(collider1, collider2);
    } else if (collider1.type === 'circle' && collider2.type === 'rect') {
      return this.circleToRect(collider1, collider2);
    } else if (collider1.type === 'rect' && collider2.type === 'circle') {
      return this.circleToRect(collider2, collider1);
    } else {
      return this.rectToRect(collider1, collider2);
    }
  }

  /**
   * 检测一个碰撞体与所有其他碰撞体的碰撞
   */
  getCollisions(id: string): string[] {
    const collisions: string[] = [];
    for (const [otherId] of this.colliders) {
      if (otherId !== id && this.isColliding(id, otherId)) {
        collisions.push(otherId);
      }
    }
    return collisions;
  }

  /**
   * 检测点是否在碰撞体内
   */
  pointInCollider(point: Vector2, id: string): boolean {
    const collider = this.colliders.get(id);
    if (!collider) return false;

    if (collider.type === 'circle') {
      return point.distance(collider.position) < collider.radius;
    } else {
      return (
        point.x >= collider.position.x &&
        point.x <= collider.position.x + (collider.width || 0) &&
        point.y >= collider.position.y &&
        point.y <= collider.position.y + (collider.height || 0)
      );
    }
  }

  /**
   * 获取碰撞体
   */
  getCollider(id: string): Collider | undefined {
    return this.colliders.get(id);
  }

  /**
   * 清空所有碰撞体
   */
  clear(): void {
    this.colliders.clear();
  }
}
