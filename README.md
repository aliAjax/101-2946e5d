# 通勤分析应用

一个功能完善的个人通勤数据分析工具，帮助你记录、分析和优化日常通勤路线。支持多维度评分、异常检测、数据导入导出等功能。

## 功能特性

- 📊 **通勤数据管理**：记录、编辑、删除通勤路线，支持多种交通方式
- 🎯 **智能评分系统**：从时间、费用、舒适度、稳定性四个维度对路线进行综合评分
- 🚨 **异常检测**：自动识别异常数据（费用异常、耗时异常、拥挤度异常等）
- 📈 **统计分析**：日历视图、时间趋势、高峰时段对比、交通方式对比
- ⭐ **收藏管理**：收藏常用路线，支持添加备注
- 🗺️ **位置管理**：管理常用地点，支持重命名和级联更新
- 📥 **数据导入**：支持 CSV/JSON 格式批量导入数据
- 📤 **数据导出**：支持导出为 CSV、JSON、统计摘要三种格式
- 📸 **数据快照**：创建数据快照，支持随时恢复
- 🎨 **深色/浅色主题**：支持主题切换

## 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 6
- **状态管理**：Zustand
- **样式**：Tailwind CSS
- **图表**：Recharts
- **图标**：Lucide React
- **测试**：Vitest + Testing Library
- **代码规范**：ESLint + TypeScript ESLint

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 质量门禁

本地开发和提交前，请确保通过以下质量检查：

### 类型检查

```bash
npm run check
```

运行 TypeScript 类型检查，无错误输出即为通过。

### 代码规范检查

```bash
npm run lint
```

运行 ESLint 检查代码规范。

### 运行测试

```bash
# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch

# 打开测试 UI
npm run test:ui
```

项目包含 70+ 个单元测试，覆盖核心业务逻辑。

### 一键完整验证

```bash
npm run verify
```

依次执行：类型检查 → Lint 检查 → 单元测试 → 生产构建。建议在提交代码前运行此命令。

## 数据导入说明

应用支持 CSV 和 JSON 两种格式的数据导入。

### CSV 格式

#### 必填字段

| 字段名 | 中文名称 | 说明 | 示例 |
|--------|----------|------|------|
| `origin` | 出发地 | 地点名称 | 家 |
| `destination` | 目的地 | 地点名称 | 公司 |
| `transportMode` | 交通方式 | 见下方可选值 | 地铁 |
| `duration` | 耗时 | 分钟数，正整数 | 45 |
| `cost` | 费用 | 元，非负数 | 5.5 |
| `crowdLevel` | 拥挤程度 | 1-5 整数，1=最舒适，5=最拥挤 | 3 |
| `date` | 日期 | YYYY-MM-DD 格式 | 2024-01-15 |

#### 可选字段

| 字段名 | 中文名称 | 说明 | 示例 |
|--------|----------|------|------|
| `timeOfDay` | 时间段 | 见下方可选值 | 早高峰 |

#### 交通方式可选值

| 中文 | 英文 |
|------|------|
| 地铁 | subway |
| 公交 | bus |
| 自驾 | car |
| 骑行 | bike |
| 步行 | walk |

#### 时间段可选值

| 中文 | 英文 |
|------|------|
| 早高峰 | morning_peak |
| 晚高峰 | evening_peak |
| 平峰 | off_peak |
| 未知 | unknown |

#### CSV 示例

```csv
出发地,目的地,交通方式,耗时(分钟),费用(元),拥挤程度,日期,时间段
家,公司,地铁,45,5.5,3,2024-01-15,早高峰
家,公司,公交,60,2,4,2024-01-16,早高峰
公司,家,地铁,50,5.5,4,2024-01-15,晚高峰
```

> 注意：CSV 表头支持中英文别名，系统会自动识别。

### JSON 格式

JSON 导入用于批量添加路线记录。当前界面支持粘贴单条路线对象，或粘贴路线对象数组；不支持直接导入包含 `routes`、`favorites`、`locations` 等顶层字段的完整备份对象。

#### 单条路线对象

```json
{
  "origin": "家",
  "destination": "公司",
  "transportMode": "subway",
  "duration": 45,
  "cost": 5.5,
  "crowdLevel": 3,
  "date": "2024-01-15",
  "timeOfDay": "morning_peak"
}
```

#### 多条路线数组

```json
[
  {
    "origin": "家",
    "destination": "公司",
    "transportMode": "subway",
    "duration": 45,
    "cost": 5.5,
    "crowdLevel": 3,
    "date": "2024-01-15",
    "timeOfDay": "morning_peak"
  },
  {
    "origin": "公司",
    "destination": "家",
    "transportMode": "bus",
    "duration": 60,
    "cost": 2,
    "crowdLevel": 4,
    "date": "2024-01-15",
    "timeOfDay": "evening_peak"
  }
]
```

> 注意：JSON 导入会重新生成路线 ID 和路线名称，因此导入数据不需要提供 `id` 或 `name` 字段。出发地和目的地必须已经存在于地点库中。

### 导入操作步骤

1. 点击应用中的添加路线按钮，切换到「批量导入」页签
2. JSON：选择 JSON 模式，粘贴单条路线对象或路线数组，然后点击「导入数据」
3. CSV：选择 CSV 模式，粘贴 CSV 内容或上传 `.csv` 文件，然后点击「解析预览」
4. CSV 预览中检查有效记录、错误行、重复记录和未知地点
5. 对未知地点补充坐标或选择跳过后，点击「确认导入」

## 本地数据存储说明

应用所有数据均存储在浏览器的 `localStorage` 中，不会上传到任何服务器。

### 存储的 Key 列表

| Key | 说明 | 数据结构 |
|-----|------|----------|
| `commute-data` | 核心数据 | 包含路线、筛选条件、收藏、位置、忽略的异常ID |
| `commute-filter-presets` | 筛选预设 | 保存的筛选条件预设数组 |
| `commute-weight-preset` | 评分权重预设 | 当前使用的评分权重配置 |
| `commute-snapshots` | 数据快照 | 用户创建的所有数据快照 |

### `commute-data` 详细结构

```typescript
{
  routes: CommuteRoute[];        // 所有通勤路线记录
  selectedRouteId: string | null; // 当前选中的路线ID
  filters: FilterOptions;        // 当前筛选条件
  favorites: FavoriteRoute[];    // 收藏的路线
  locations: Location[];         // 管理的地点列表
  ignoredAnomalyKeys: string[];  // 用户忽略的异常记录Key
}
```

### 数据备份与恢复

- **备份**：使用「数据导出」功能导出 JSON 格式完整数据
- **恢复路线**：将备份 JSON 中的 `routes` 数组单独复制出来，使用「批量导入」的 JSON 模式导入路线记录
- **快照**：使用「数据快照」功能在应用内创建恢复点

### 清除数据

如需完全重置数据：

1. 在浏览器开发者工具中打开 Application 标签页
2. 找到 Local Storage → 当前域名
3. 删除以上列出的 4 个 Key
4. 刷新页面

或者在浏览器地址栏执行：

```javascript
localStorage.removeItem('commute-data');
localStorage.removeItem('commute-filter-presets');
localStorage.removeItem('commute-weight-preset');
localStorage.removeItem('commute-snapshots');
location.reload();
```

## 项目结构

```
src/
├── components/          # React 组件
│   ├── AddRouteModal.tsx        # 添加路线弹窗
│   ├── AnomalyDetectionPanel.tsx # 异常检测面板
│   ├── CommuteCalendar.tsx      # 日历视图
│   ├── DataExportPanel.tsx      # 数据导出面板
│   ├── FilterPanel.tsx          # 筛选面板
│   ├── MapView.tsx              # 地图视图
│   ├── RouteList.tsx            # 路线列表
│   ├── RouteScoringPanel.tsx    # 路线评分面板
│   ├── StatisticsCards.tsx      # 统计卡片
│   └── ...
├── data/                # 模拟数据
├── hooks/               # 自定义 Hooks
├── lib/                 # 工具库
│   ├── anomalyDetector.ts       # 异常检测逻辑
│   ├── csvParser.ts             # CSV 解析器
│   └── utils.ts                 # 通用工具函数
├── pages/               # 页面组件
├── store/               # 状态管理
│   └── commuteStore.ts          # Zustand Store
├── test/                # 测试配置
├── types/               # TypeScript 类型定义
│   └── commute.ts               # 核心类型定义
├── App.tsx              # 应用根组件
├── main.tsx             # 入口文件
└── index.css            # 全局样式
```

## 开发说明

### 核心类型定义

所有核心数据类型定义在 [src/types/commute.ts](src/types/commute.ts) 中，包括：

- `CommuteRoute` - 通勤路线
- `Location` - 地点
- `FilterOptions` - 筛选条件
- `RouteScore` - 路线评分
- `AnomalyRecord` - 异常记录
- `Snapshot` - 数据快照

### 状态管理

使用 Zustand 进行状态管理，核心 Store 在 [src/store/commuteStore.ts](src/store/commute.ts) 中，包含：

- 路线的增删改查
- 筛选逻辑
- 评分计算
- 异常检测
- 数据持久化（自动同步到 localStorage）

### 测试

- 单元测试文件与源代码放在同一目录，命名为 `*.test.ts` 或 `*.test.tsx`
- 运行 `npm run test` 执行所有测试
- 测试覆盖核心业务逻辑：异常检测、CSV 解析、Store 操作等

## 常见问题

**Q: 数据会上传到服务器吗？**

A: 不会。所有数据都存储在浏览器的 localStorage 中，完全本地运行。

**Q: 换浏览器或清空缓存后数据会丢失吗？**

A: 会的。建议定期使用「数据导出」功能备份数据。

**Q: 支持多少条数据？**

A: 理论上受限于浏览器 localStorage 容量（通常 5-10MB），足够存储数千条通勤记录。

**Q: 如何批量导入历史数据？**

A: 将数据整理为 CSV 或 JSON 格式，按照本文档的格式要求，使用应用内的导入功能即可。

## License

MIT
