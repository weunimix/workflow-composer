## 改动类型（多选）

- [ ] 新增 agent 或 workflow
- [ ] 修改现有 agent 或 workflow
- [ ] 修改编译逻辑（`lib/`、`src/`、`agents.config.ts`）
- [ ] 修改基类（`lib/agents/`、`lib/workflows/`、`lib/decorators/`）
- [ ] 仅文档改动（README、AGENTS.md、docs/）
- [ ] 仅 CI / 工程治理改动

## 改动说明

<!-- 简述改了什么、为什么改 -->

## 受影响的下游使用方

<!-- 如改了基类或编译逻辑，哪些下游项目需要同步？ -->

## 必须确认的项

- [ ] commit 信息符合 Conventional Commits（`<类型>(<范围>): <主题>`，中文动词开头，≤72 字符）
- [ ] 本地 `npm run build` 通过（编译型项目必跑）
- [ ] 若修改了 `AGENTS.md`，本地格式校验通过（嵌套列表、`---` 分隔线位置合规）
- [ ] 若修改了 `lib/` 下基类，已检查所有 `agents/*.ts` 与 `workflows/*.ts` 能同步更新
- [ ] 修改文件已对照 closest-file-wins 找到最近的 AGENTS.md，确认是否需要同步

## 关联

- 关联 Issue：#<!-- issue编号 -->
- 关联 PR：#<!-- PR 编号 -->