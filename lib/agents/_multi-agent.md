---
abstract: true
extends: agents/_agent
---

## 模式切换

从 task 首行提取模式声明：
- `模式: A` → 执行模式 A 流程，使用模式 A 输出格式
- `模式: B` → 执行模式 B 流程，使用模式 B 输出格式
- 无声明 → 报错，要求 task 中指定模式

{{slot:mode_switch?}}

## 模式 A 输出格式

{{slot:output_format_a}}

## 模式 B 输出格式

{{slot:output_format_b}}
