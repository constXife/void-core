# The Boutique Hotel ("Цифровой Консьерж")

## Essence
Нулевое доверие, эфемеренность, продажа услуг (upsell).

## Users
- Администратор (Admin)
- Гость (Guest, 2 дня)

## Main pain
- "Какой пароль от WiFi?"
- "Как заказать еду?"
- "Как выключить кондиционер?"

## UX expectations
- "Вау-эффект"
- Выглядит как дорогой пульт
- Ничего не надо настраивать

## Configuration profile
| DB Param | Value | Why |
| --- | --- | --- |
| audience_groups | ["room_101"] | Изоляция: гость 101 не управляет светом в 102. |
| dashboard_template | "home-hotel-guest" | Фиксированный сценарий для гостя. |
| dashboard_edit | guest: view | Kiosk mode без редактирования. |
| user.ttl | checkout date | В 12:00 данные стираются. |
| auth_method | Token / QR | Сканируешь QR в номере — сразу вошел. |
| directory_focus | Wi-Fi + Room service + Rules | Самое важное всегда под рукой. |

## Test case
"Гость сканирует QR, видит красивое меню ресторана. Заказывает еду. Пытается удалить кнопку 'Ресепшн' — не получается. После выезда его история заказов удаляется из профиля."
