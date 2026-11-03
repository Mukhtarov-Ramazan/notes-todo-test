import { SCHEMA_VERSION } from './constants'

export type StoredRecord = Record<string, unknown>

/** Поднимает данные с версии N до N + 1. */
export type Migration = (data: StoredRecord) => StoredRecord

/** Ключ — версия, с которой мигрируем. Версия схемы пока одна, поэтому пусто. */
export const migrations: Record<number, Migration> = {}

/** Прогоняет данные по миграциям до нужной версии. Если какого-то шага нет, вернёт `null`. */
export function migrateData(
  data: StoredRecord,
  fromVersion: number,
  steps: Record<number, Migration> = migrations,
  targetVersion: number = SCHEMA_VERSION,
): StoredRecord | null {
  let current = data
  for (let version = fromVersion; version < targetVersion; version++) {
    const step = steps[version]
    if (!step) return null
    current = { ...step(current), version: version + 1 }
  }
  return current
}
