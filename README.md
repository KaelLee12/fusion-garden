# 融合花园

一个带「场上融合」玩法的塔防游戏，TypeScript + PixiJS v8，纯前端，Mac 和 iPad 的浏览器都能玩。
所有角色和场景都是代码绘制的原创美术，不含任何第三方素材。

在线试玩：https://kaellee12.github.io/fusion-garden/

## 运行

```bash
pnpm install
pnpm dev          # 开发，改代码自动刷新；同一局域网的 iPad 访问终端里显示的 Network 地址
pnpm build        # 打包到 dist/，可部署到任意静态服务器
pnpm build:single # 打包成单个 dist-single/index.html
```

也可以用 Makefile（`make help` 查看全部命令）：

```bash
make init    # 安装依赖
make run     # 启动开发服务器
make build   # 打包到 dist/
make single  # 打包成单文件
make preview # 打包后本地预览
make check   # 只做类型检查
make clean   # 删除打包产物
```

## 玩法

- 点卡牌再点草坪种植；把卡牌种到已有的植物上，如果有配方就会融合成新植物。
- 手套：先点一株植物，再点另一株可以免费融合，点空地可以移动。
- 铲子：移除植物或浮叶。
- 阳光：鼠标划过或点击收集，放着不管 9 秒后也会自动收。
- 三章 24 关（白天 / 夜晚 / 池塘）加三张无尽图；通关解锁新植物，卡槽从 6 个涨到 10 个。

## 怎么改

| 想改什么 | 改哪里 |
|---|---|
| 植物数值、新增植物 | `src/data/plants.ts`，每个植物是一个对象 |
| 融合配方 | `src/data/plants.ts` 里的 `RECIPE_LIST`，一行一个配方 |
| 僵尸 | `src/data/zombies.ts` |
| 关卡、波数、出怪强度、初始阳光 | `src/data/levels.ts` |
| 出怪节奏公式 | `src/game/battle.ts` 的 `spawnWave` |
| 植物 / 僵尸外观 | `src/art/plantArt.ts`、`src/art/zombieArt.ts` |
| 界面 | `src/ui/screens.ts` |

植物的能力是组合出来的，在定义里写上对应字段即可：
`shoot`（射击，可配连发、减速、火焰、溅射、穿透、抛物线）、`produce`（产阳光）、`bomb`（爆炸）、
`mine`（地雷）、`contact`（地刺）、`thorns`（反伤）、`deathBlast`（死亡爆炸）、`igniter`（点燃穿过的子弹）、
`platform`（水面平台）、`nocturnal`（白天睡觉）、`low`（贴地不被啃）。

新增一个融合植物的步骤：在 `FUSED` 数组里加一个定义，在 `RECIPE_LIST` 里加一行配方，完成。
外观由 `art` 字段的形状、颜色和装饰（`deco`）决定，不需要另外画图。

换成自己的贴图：保留 `PlantView` / `ZombieView` 的接口，把里面的 Graphics 绘制换成 Sprite。

调试：浏览器控制台里有 `__nav`（切换界面）和 `__battle`（当前战斗对象），主菜单右上角有「全部解锁」。
