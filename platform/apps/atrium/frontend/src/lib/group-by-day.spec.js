import { describe, expect, it } from "vitest";

import { groupByDay } from "./group-by-day.js";

// t-заглушка: «Сегодня»/«Вчера» по ключам, остальное (даты) форматирует Intl.
const t = (key) => (key === "day.today" ? "Сегодня" : key === "day.yesterday" ? "Вчера" : key);
const now = new Date(2026, 5, 20, 12, 0, 0); // 2026-06-20 12:00 локально

// Метки времени — локальный полдень в Date-объектах: группировка идёт по локальным
// суткам (граница дня = часы пользователя), поэтому тест не зависит от TZ раннера.
const ev = (id, date) => ({ id, created_at: date });
const localNoon = (year, month, day) => new Date(year, month - 1, day, 12, 0, 0);

describe("groupByDay", () => {
  it("группирует по локальным дням, новый день сверху, порядок внутри сохраняется", () => {
    const items = [
      ev(5, localNoon(2026, 6, 20)),
      ev(4, new Date(2026, 5, 20, 8, 0, 0)),
      ev(3, localNoon(2026, 6, 19)),
      ev(2, localNoon(2026, 6, 18))
    ];
    const groups = groupByDay(items, { t, locale: "ru", now });
    expect(groups.map((g) => g.key)).toEqual(["2026-06-20", "2026-06-19", "2026-06-18"]);
    expect(groups[0].items.map((i) => i.id)).toEqual([5, 4]);
    expect(groups[1].items.map((i) => i.id)).toEqual([3]);
  });

  it("метит сегодня/вчера через t, прочие дни — датой текущего года без года", () => {
    const items = [
      ev(3, localNoon(2026, 6, 20)),
      ev(2, localNoon(2026, 6, 19)),
      ev(1, localNoon(2026, 6, 18))
    ];
    const groups = groupByDay(items, { t, locale: "ru", now });
    expect(groups[0].label).toBe("Сегодня");
    expect(groups[1].label).toBe("Вчера");
    expect(groups[2].label).toMatch(/18/);
    expect(groups[2].label).not.toMatch(/2026/);
  });

  it("добавляет год для дат прошлого года", () => {
    const groups = groupByDay([ev(1, localNoon(2025, 12, 31))], { t, locale: "ru", now });
    expect(groups[0].label).toMatch(/2025/);
  });

  it("событие без валидной даты относит к сегодня, не теряя его", () => {
    const groups = groupByDay([ev(1, null), ev(2, localNoon(2026, 6, 20))], {
      t,
      locale: "ru",
      now
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("2026-06-20");
    expect(groups[0].items.map((i) => i.id)).toEqual([1, 2]);
  });

  it("парсит ISO-строку created_at (продакшн-формат) и не теряет событие", () => {
    const groups = groupByDay([{ id: 1, created_at: "2026-06-20T12:00:00Z" }], {
      t,
      locale: "ru",
      now
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual([1]);
  });

  it("поддерживает кастомный getTimestamp", () => {
    const groups = groupByDay([{ id: 1, ts: localNoon(2026, 6, 19) }], {
      t,
      locale: "ru",
      now,
      getTimestamp: (i) => i.ts
    });
    expect(groups[0].key).toBe("2026-06-19");
    expect(groups[0].label).toBe("Вчера");
  });
});
