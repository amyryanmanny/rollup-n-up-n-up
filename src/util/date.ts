export const ONE_DAY = 86_400_000; // 24 hours in milliseconds

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export function getDayOfThisWeek(day: DayOfWeek): Date | undefined {
  const dayMap: Map<DayOfWeek, number> = new Map([
    ["MONDAY", 1],
    ["TUESDAY", 2],
    ["WEDNESDAY", 3],
    ["THURSDAY", 4],
    ["FRIDAY", 5],
    ["SATURDAY", 6],
    ["SUNDAY", 0],
  ]);

  if (dayMap.has(day)) {
    const today = new Date();
    const dayIndex = dayMap.get(day)!;
    const diff = (dayIndex - today.getDay() + 7) % 7;
    const dayOfThisWeek = new Date(today);
    dayOfThisWeek.setDate(today.getDate() + diff);
    return dayOfThisWeek;
  }
}
