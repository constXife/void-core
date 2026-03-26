# The Agile Team / SMB ("Цифровой Офис")

## Essence
Эффективность, онбординг, разделение зон ответственности. Teal без хаоса.

## Users
- Админ (CTO/DevOps)
- Сотрудники (Staff)
- Контракторы

## Main pain
- "Где ссылка на Jira?"
- "Новый дизайнер уже неделю просит доступы"
- "Менеджеры случайно лезут в продакшн-консоль"

## UX expectations
- Быстрый старт для новичка
- Четкое разделение видимости по отделам

## Configuration profile
| DB Param | Value | Why |
| --- | --- | --- |
| audience_groups | ["dev", "marketing", "sales"] | Изоляция контекста. |
| dashboard_template | "home-smb" | Блоки по отделам и роли. |
| dashboard_edit | admins: manage, staff: view | Стабильный рабочий интерфейс. |
| user.ttl | null | Важно is_active для мгновенного отключения при увольнении. |
| auth_method | OIDC (Google Workspace / Azure AD) | Единый вход по корпоративной почте. |
| directory_focus | Jira + Docs + Runbooks | Быстрый доступ к критичным сервисам. |

## Unique feature: Department Onboarding
При создании пользователя и назначении группы должен применяться шаблон дашборда и набор закрепленных ресурсов.

## Test case
"Джуниор-разработчик заходит через Google Workspace. Видит зону 'DevOps' (GitLab, Jenkins), но НЕ видит зону 'Бухгалтерия'. В доке уже лежат Slack и Jira. Он может убрать Jira, если хочет. При увольнении (блокировка в Google) он теряет доступ к Atrium мгновенно."
