# Domain Docs

工程类 skill 在探索代码库时应如何使用本仓库的领域文档。

## 本仓库布局:单上下文

根目录 `CONTEXT.md` + `docs/adr/`(无 CONTEXT-MAP.md,无子上下文)。

## Before exploring, read these

- 仓库根目录的 **`CONTEXT.md`**;若存在 **`CONTEXT-MAP.md`** 则以其为准,指向每个上下文的 `CONTEXT.md`,读取与当前主题相关的部分
- **`docs/adr/`** — 阅读与即将改动区域相关的 ADR

若以上文件不存在,**静默继续**。不要提示缺失,也不要主动建议创建。`/domain-modeling` skill(经 `/grill-with-docs` 与 `/improve-codebase-architecture` 进入)会在术语或决策真正定下来时惰性创建它们。

## Use the glossary's vocabulary

当输出中提及领域概念(issue 标题、重构建议、假设、测试名)时,使用 `CONTEXT.md` 中定义的术语。不要漂移到词汇表明确避免的同义词。

若需要的概念不在词汇表中,这是一个信号 —— 要么你在发明项目不使用的语言(重新考虑),要么存在真实缺口(记下来留给 `/domain-modeling`)。

## Flag ADR conflicts

若输出与现有 ADR 冲突,显式指出而非静默覆盖:

> _与 ADR-0007(event-sourced orders)冲突 —— 但值得重新审视,因为……_
