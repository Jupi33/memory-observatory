import type { MemoryCategory, RelationshipEra } from '../types/story'

export const memoryCategories: { id: MemoryCategory; label: string }[] = [
  { id: 'sacred', label: 'Especial' },
  { id: 'daily', label: 'Diario' },
]

export const relationshipEras: { id: RelationshipEra; label: string }[] = [
  { id: 'origin', label: 'Origen' },
  { id: 'becoming', label: 'Jupi&Nagi Universitarios' },
  { id: 'present', label: 'Una vida juntos' },
]

export const memoryMoods = [
  { color: '#8f5cff', label: 'Nostalgia' },
  { color: '#d84d70', label: 'Puro amor' },
  { color: '#f2c66d', label: 'Diversión' },
  { color: '#9b9aa5', label: '¿Apagado?!' },
]

export interface DateParts {
  day: string
  month: string
  year: string
}

const emptyDateParts: DateParts = { day: '', month: '', year: '' }

export const onlyDigits = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength)

const normalizeYear = (year: string) => {
  if (!year) return ''
  return year.length === 2 ? `20${year}` : year.padStart(4, '0')
}

export const composeFlexibleDate = ({ day, month, year }: DateParts) => {
  if (!year) return ''
  const normalizedYear = normalizeYear(year)
  if (day && month) return `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  if (month) return `${normalizedYear}-${month.padStart(2, '0')}`
  return normalizedYear
}

export const splitFlexibleDate = (value?: string): DateParts => {
  const raw = String(value ?? '').trim()
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (slash) return { day: slash[1], month: slash[2], year: slash[3] }
  const day = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (day) return { day: day[3], month: day[2], year: day[1] }
  const month = raw.match(/^(\d{4})-(\d{1,2})$/)
  if (month) return { day: '', month: month[2], year: month[1] }
  const year = raw.match(/^(\d{2}|\d{4})$/)
  if (year) return { day: '', month: '', year: year[1] }
  return emptyDateParts
}
