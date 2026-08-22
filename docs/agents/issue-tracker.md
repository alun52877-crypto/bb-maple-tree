# Issue tracker: Local Markdown

本仓库的 issue 与 spec 以 markdown 文件形式存放在 `.scratch/` 下。

## Conventions

- 一个功能一个目录:`.scratch/<feature-slug>/`
- Spec 位于 `.scratch/<feature-slug>/spec.md`
- 实现 issue 每张票一个文件:`.scratch/<feature-slug>/issues/<NN>-<slug>.md`,从 `01` 开始编号 —— 绝不要合并成单一票文件
- Triage 状态记录在每个 issue 文件顶部的 `Status:` 行(标签字符串见 `triage-labels.md`)
- 评论与对话历史追加到文件底部的 `## Comments` 标题下

## When a skill says "publish to the issue tracker"

在 `.scratch/<feature-slug>/` 下创建新文件(目录不存在则创建)。

## When a skill says "fetch the relevant ticket"

读取引用路径对应的文件。用户通常会直接给出路径或 issue 编号。

## Wayfinding operations

供 `/wayfinder` 使用。**map** 是单个文件,每张票对应一个 **child** 文件。

- **Map**:`.scratch/<effort>/map.md` — Notes / Decisions-so-far / Fog 主体。
- **Child ticket**:`.scratch/<effort>/issues/NN-<slug>.md`,从 `01` 编号,正文写问题。`Type:` 行记录票类型(`research`/`prototype`/`grilling`/`task`);`Status:` 行记录 `claimed`/`resolved`。
- **Blocking**:顶部 `Blocked by: NN, NN` 行。所列文件全部 `resolved` 后该票解除阻塞。
- **Frontier**:扫描 `.scratch/<effort>/issues/` 中开放、未阻塞、未被认领的文件;编号最小者优先。
- **Claim**:开始工作前先设 `Status: claimed` 并保存。
- **Resolve**:在 `## Answer` 标题下追加答案,设 `Status: resolved`,然后在 `map.md` 的 Decisions-so-far 追加上下文指针(要点 + 链接)。
