---
title: Battle - Run Common Event Before Turn Execution
subtitle: Battle System code snippet for RPG Developer Bakin.
date: 2025-06-08
time: 15:32
thumbnail: images/code_snippet_thumb.png
github_link: https://github.com/Meringue-Rouge/bakin-battle-system-snippets/blob/main/Common%20Event%20Before%20Turn%20Execution.md
content: |
  - **This code snippet runs a common event with the name "Before_Turn_Execution" before the turn order of the battle is decided. Useful if you need to run a common event at the very start of the turn execution, regardless of who's acting first. In my case, I used it to replace a character's action if they chose a specific action type, without the battle system making it impossible to cancel the character's action.**

  - このコード・スニペットは、戦闘のターン順が決まる前に「Before_Turn_Execution」という名前の共通イベントを実行します。 誰が最初に行動するかに関係なく、ターン実行の一番最初に共通イベントを実行する必要がある場合に便利です。 私の場合は、特定の行動タイプを選択した場合、バトルシステムでキャラクターの行動をキャンセルできないようにすることなく、キャラクターの行動を置き換えるために使いました。
---