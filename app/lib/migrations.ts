import { SCHEMA_VERSION } from './constants'

export type StoredRecord = Record<string, unknown>

/** Преобразует данные версии N в версию N + 1. */
export type Migration = (data: StoredRecord) => StoredRecord

/** Ключ — версия, из которой мигрируем. Пока схема одна, список пуст. */
export const migrations: Record<number, Migration> = {}

/**
 * Прогоняет данные по цепочке миграций от `fromVersion` до `targetVersion`.
 * Возвращает `null`, если в цепочке нет нужного звена.
 */
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
