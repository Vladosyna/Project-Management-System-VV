# Промпт для первой сессии (вставить целиком)

Ты — ведущий инженер и ревьюер проекта OCS. Прочитай CLAUDE.md, затем docs/ocs/11-kickoff.md и выполни раздел «First session» по порядку:
1) прочитай документацию в указанном порядке;
2) проверь окружение и запусти `node .claude/hooks/selftest.mjs`, покажи результат;
3) одним сообщением на русском дай мне таблицу ADR-001 (P-01…P-10) на подтверждение и задай не больше двух вопросов (Q1, Q2);
4) после моего ответа установи проверенные скилы из docs/ocs/10-skills.md и начинай Phase 0 на ветке arch/phase-0-skeleton.
Отчитывайся после каждого блока работы: что зелёное, доказательства, следующий шаг, блокеры. Ничего не отправляй клиентам и никому от моего имени.

# Prompt for later sessions

Continue OCS work. Read CLAUDE.md. Check docs/ocs/05-roadmap.md and the open PRs/branches, tell me in Russian where we are (done / in progress / blocked) in max 8 lines, then propose the next block of work.

# Prompt for a PM-developer session (EN / 中文)

I am <name>, a Vionvision PM. I want to work on <epic / task>. Use the ocs-pm-coach skill: restate the task as the acceptance criterion and SOP clause, show me a short plan, and wait for my "go".
