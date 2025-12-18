# 车辆系统文档

## 功能概述

本游戏现已实现完整的车辆系统，玩家可以在道路上找到车辆，进入车辆后改变操作模式。

## 核心特性

### 1. 车辆生成
- 车辆会在玩家周围随机生成
- 最多维持 5 辆车
- 超出范围的车辆会自动删除
- 车辆显示为红色矩形，带有蓝色车窗和黄色车灯

### 2. 进入/离开车辆
- **进入车辆**：靠近车辆（100像素范围内）后按 `E` 键进入
- **离开车辆**：在车辆中按 `E` 键离开
- 进入车辆时，玩家位置会跟随车辆
- 离开车辆时，玩家会在车辆位置出现

### 3. 车辆操作模式
进入车辆后，操作方式改变：

| 操作 | 按键 | 效果 |
|------|------|------|
| 加速 | W / ↑ | 车辆向前加速 |
| 减速 | S / ↓ | 车辆减速 |
| 左转 | A / ← | 车辆向左转向 |
| 右转 | D / → | 车辆向右转向 |
| 离开 | E | 离开车辆 |

### 4. 武器限制
- 在车辆中**只能使用手枪**
- 尝试切换其他武器（步枪、霰弹枪）会被忽略
- 离开车辆后，会恢复进入车辆前使用的武器

### 5. 车辆物理
- 车辆有加速度和最大速度限制
- 应用摩擦力使车辆逐渐减速
- 车辆可以与碰撞系统交互

## 代码结构

### 新增文件
- `src/entities/Vehicle.ts` - 车辆类和车辆管理器

### 修改的文件
- `src/entities/Player.ts` - 添加车辆相关方法
- `src/core/Game.ts` - 集成车辆系统
- `index.html` - 更新控制说明

## 类和接口

### Vehicle 类
```typescript
class Vehicle {
  // 基本属性
  position: Vector2
  velocity: Vector2
  rotation: number
  
  // 主要方法
  enterVehicle(playerId: string): void
  exitVehicle(): void
  accelerate(): void
  decelerate(): void
  turnLeft(): void
  turnRight(): void
  update(deltaTime: number): void
  render(renderer: Renderer, camera: Camera): void
}
```

### VehicleManager 类
```typescript
class VehicleManager {
  // 主要方法
  spawnVehicle(position: Vector2): Vehicle
  getVehicles(): Vehicle[]
  getNearbyVehicles(playerPosition: Vector2, range: number): Vehicle[]
  getPlayerVehicle(playerId: string): Vehicle | null
  update(deltaTime: number, playerPosition: Vector2): void
  render(renderer: Renderer, camera: Camera): void
}
```

### Player 类新增方法
```typescript
enterVehicle(vehicle: Vehicle): void
exitVehicle(): void
getCurrentVehicle(): Vehicle | null
isInVehicle(): boolean
```

## 游戏流程

1. **探索阶段**：玩家在地图上移动，寻找车辆
2. **进入车辆**：靠近车辆后按 E 键进入
3. **驾驶阶段**：使用 WASD 控制车辆方向和速度
4. **射击**：在车辆中可以用手枪射击
5. **离开车辆**：按 E 键离开，恢复原来的武器

## HUD 显示

游戏 HUD 会显示：
- 当前车辆数量
- 如果玩家在车辆中：显示"状态: 在车辆中 (按E离开)"
- 如果玩家附近有车辆：显示"提示: 按E进入车辆"

## 未来改进方向

- [ ] 车辆碰撞伤害
- [ ] 车辆耐久度系统
- [ ] 不同类型的车辆（速度、大小不同）
- [ ] 车辆音效
- [ ] 车辆爆炸效果
- [ ] NPC 也能驾驶车辆
- [ ] 车辆追逐任务
