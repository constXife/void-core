// Группировка событий по календарным дням в локали пользователя — общий рендер
// дневных заголовков для лент апрувов и обновлений (одинаковый вид на обеих поверхностях).
//
// Вход — список, отсортированный newest-first; выход — секции в том же порядке
// (новый день сверху), внутри секции исходный порядок элементов сохраняется.
// Метки: «Сегодня» / «Вчера» (через t) либо дата («18 июня» / «18 июня 2025») —
// форматируется Intl.DateTimeFormat в переданной локали. Год добавляется только
// если он отличается от текущего, иначе шум.

// Локальный календарный день `YYYY-MM-DD` в зоне пользователя (не UTC), чтобы граница
// суток совпадала с тем, что человек видит на своих часах.
function dayKeyOf(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function labelFor(key, { t, locale, todayKey, yesterdayKey, currentYear }) {
  if (key === todayKey) return t("day.today");
  if (key === yesterdayKey) return t("day.yesterday");
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const opts =
    year === currentYear
      ? { day: "numeric", month: "long" }
      : { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(locale || undefined, opts).format(date);
}

export function groupByDay(
  items,
  { t, locale, getTimestamp = (item) => item.created_at, now = new Date() } = {}
) {
  const todayKey = dayKeyOf(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKeyOf(yesterday);
  const currentYear = now.getFullYear();

  const groups = [];
  const index = new Map();

  for (const item of items) {
    const raw = getTimestamp(item);
    const date = raw ? new Date(raw) : null;
    // Без валидной даты событие не теряем — относим к «сегодня» (страховка для
    // live-фреймов или старых записей без created_at).
    const key = date && !Number.isNaN(date.getTime()) ? dayKeyOf(date) : todayKey;
    let group = index.get(key);
    if (!group) {
      group = { key, label: "", items: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  for (const group of groups) {
    group.label = labelFor(group.key, { t, locale, todayKey, yesterdayKey, currentYear });
  }
  return groups;
}
