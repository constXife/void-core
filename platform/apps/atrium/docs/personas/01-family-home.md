# The Alpha Family ("Цифровой Очаг")

## Essence
High trust, low control. The system объединяет, а не ограничивает.

## Users
- Dad (Admin)
- Mom (User)
- Kids (User + Content Filter)

## Main pain
- "Где ссылка на Plex?"
- "Какой пароль от WiFi?"
- "Мам, интернет не работает"

## UX expectations
- Красиво, весело, свайпается
- Можно менять обои

## Configuration profile
| DB Param | Value | Why |
| --- | --- | --- |
| audience_groups | ["parents", "kids"] | Простое разделение контента (ужастики vs мультики). |
| dashboard_template | "home-family" | Стартовый набор блоков для семьи. |
| dashboard_edit | parents: manage, kids: view | Дети не ломают раскладку. |
| user.ttl | null | Аккаунты живут годами. |
| auth_method | OIDC (Google) | Удобный вход в 1 клик. |
| directory_focus | Media + Wi-Fi + Support | Быстрый доступ к нужным ссылкам. |

## Test case
"Ребенок 7 лет должен суметь включить мультик, не удалив при этом случайно настройки роутера, но имея возможность поставить на фон любимого героя."
