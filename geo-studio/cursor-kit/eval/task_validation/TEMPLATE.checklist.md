# Validation — <task_id>

- [ ] 仅修改了 task 卡 `files_to_touch` 中的文件
- [ ] 文件改动数 ≤ 3：<!-- 列出路径 -->
- [ ] 行变更总数 ≤ 100：<!-- git diff --stat -->
- [ ] `project.config.yaml` commands.test PASS
- [ ] lint / typecheck PASS（若项目配置了）
- [ ] replay / golden case 已更新或已声明 replay_exempt
- [ ] 无跨 service 联动改动（R6）
- [ ] plan + risk 已在 session 中输出并获批准（若 approval_required）
- [ ] commit message 含 `[type]: [scope]`（仅当用户要求 commit 时）

**Result**: PASS / FAIL

**Notes**:
