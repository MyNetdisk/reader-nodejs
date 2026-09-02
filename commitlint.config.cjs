
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复 bug
        'docs',     // 文档变更
        'style',    // 代码格式（不影响逻辑）
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试相关
        'build',    // 构建系统或依赖变更
        'ci',       // CI/CD 配置变更
        'chore',    // 杂项（配置文件、脚本等）
        'revert',   // 回滚提交
      ],
    ],
    'subject-case': [0], // 不限制 subject 大小写（允许中文）
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
  },
}