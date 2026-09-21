# Spec: 施肥灌根记录类型 + 记录级备注

Status: ready-for-human
Date: 2026-09-21

## 需求

在植物详情页「添加记录」中新增第六种养护操作「施肥灌根」（type key `rootFertilize`）：选时间（必填）+ 填备注（选填，上限 100 字）。养护记录时光轴中点击施肥灌根记录，可在现有菜单基础上修改备注。

## 已确认决策（grilling 两轮，Q1–Q11）

| # | 决策 |
|---|------|
| Q1 | 新增第六种养护操作，显示名「施肥灌根」；CONTEXT.md 已同步更新 |
| Q2 | 备注为养护记录通用可选字段，UI 仅对施肥灌根开放（ADR-0001） |
| Q3 | 备注选填，上限 100 字（代码校验），时光轴超长截断 |
| Q4→Q6 | 修订：时光轴点击已存在（修改时间/删除记录，全类型）。施肥灌根的 ActionSheet 增加「修改备注」项（仅该类型显示），继承现有改时间/删除能力，不做新删除交互 |
| Q5 | 不影响「上次浇水时间」（主页排序只看浇水）；按定义自动成为「最近养护」 |
| Q7 | 添加流程：选类型 → 日期弹层 → 备注弹框；备注弹框「跳过」（取消）= 不写备注、照样创建记录 |
| Q8 | 备注输入复用原生 `wx.showModal({editable:true})`，与植物级备注交互一致；不手写 textarea 弹层 |
| Q9 | 配色棕色系：圆点 `#a9744f`、标签深棕、相对时间胶囊浅棕底（无 emoji 图标，沿用彩点+彩字体系） |
| Q10 | 时光轴：有备注的条目在日期下方加一行小字，CSS 单行省略号；无备注（含字段缺失）不渲染该行；渲染只判断「有无备注」，不按类型分支。「最近养护」摘要不带备注 |
| Q11 | 数据层命名：`rootFertilize` + `note`（ADR-0002） |

## 实现触点（来自代码探索）

1. **`miniprogram/utils/plants.js`**
   - `RECORD_LABEL_MAP` / `RECORD_CLASS_MAP` 各加 `rootFertilize`（class：`root-fertilize`）；
   - `createRecord` 支持可选 `note`（trim 后非空才写入字段）；
   - `decoratePlant`/`recordTimeline` 把 `note` 透传到时光轴条目。
2. **`miniprogram/pages/plant-detail/index.js`**
   - `addRecord`：`recordTypes` 与 ActionSheet `itemList` 加「施肥灌根」（排在「杀菌灌根」之后）；
   - 创建流程：`rootFertilize` 在日期确认后弹备注 modal（标题「添加备注（可跳过）」，confirmText「保存」，cancelText「跳过」，placeholder 如「用了什么肥、稀释比例等」）；保存→带 note 创建；跳过→无 note 创建；
   - `editRecord`：`targetRecord.type === 'rootFertilize'` 时 itemList 为「修改时间 / 修改备注 / 删除记录」（destructive 保持最后），tapIndex 分支需按类型重排，不能继续硬编码；「修改备注」走 `wx.showModal({editable:true, content: note||''})`，保存后 map records 替换该条 → `updatePlant` → toast；
   - 备注超 100 字：toast「备注最多 100 字」且不保存该输入（创建流程记录仍建，可事后从时光轴补写）；
   - `appendRecord` toast 三元链、删除确认文案三元链补「施肥灌根」。
3. **`miniprogram/pages/plant-detail/index.wxml`**：时光轴条目日期下方条件渲染备注行（`item.note`）。
4. **`miniprogram/pages/plant-detail/index.wxss`**：`.timeline-dot/.timeline-label/.timeline-relative` 各加 `root-fertilize` 棕色系样式；新增备注行样式（灰色小字、单行省略）。
5. **不改动**：`lastWater` 相关逻辑（`getLatestWaterTime`、appendRecord 的 water 判断）、`stripDocId`（只剥植物顶层字段）、主页排序与养护卡片（零影响，有单测锁定）。
6. **测试**：按 `test/` 现有风格补用例——label/class 映射含 rootFertilize；createRecord 带/不带 note；时光轴条目透传 note；非 water 类型不影响 lastWater 与排序（已有锁定用例回归）。

## 关联文档

- `CONTEXT.md`：养护操作（六种）、施肥灌根、备注 词条
- `docs/adr/0001-备注为养护记录通用字段.md`
- `docs/adr/0002-施肥灌根数据层命名.md`

## Comments

- 2026-09-21 grilling 两轮完成，Q1–Q11 全部达成共识（用户两轮均按推荐通过）。
- 2026-09-21 实现完成：plants.js（映射表 + createRecord 可选 note）、plant-detail/index.js（addRecord 五类型、创建流程备注弹框、editRecord 动态菜单 + editRecordNote、toast/删除文案改用 getRecordLabel 消除硬编码三元链）、index.wxml（loading 条件 + 时光轴备注行）、index.wxss（root-fertilize 棕色系三组样式 + .timeline-note 单行省略）。新增 test/plants-record-note.test.js，4 个测试文件全部 PASS，node --check 语法通过。待真机验证：备注弹框（showModal editable）交互、ActionSheet 三项菜单。
