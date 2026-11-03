import {
  differenceInYears,
  format,
  formatDistanceToNowStrict,
  isValid,
  parse,
  parseISO,
} from "date-fns"
import { ptBR } from "date-fns/locale"

export const onlyDigits = (v: string) => v.replace(/\D/g, "")

export function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2")
}

export function isValidCPF(v: string) {
  const d = onlyDigits(v)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskPhone(v: string) {
  const d = onlyDigits(v)
  return `(${d.slice(0, 2)}) •••••-${d.slice(-4)}`
}

export function maskCPF(v: string) {
  const d = onlyDigits(v)
  return `•••.${d.slice(3, 6)}.•••-${d.slice(9)}`
}

export function formatDateInput(v: string) {
  const d = onlyDigits(v).slice(0, 8)
  return d.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3")
}

/** dd/MM/yyyy → yyyy-MM-dd (ou null) */
export function brToISODate(v: string) {
  const dt = parse(v, "dd/MM/yyyy", new Date())
  if (!isValid(dt) || v.length !== 10) return null
  return format(dt, "yyyy-MM-dd")
}

export const toDate = (iso: string) => parseISO(iso)

export const fmtDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy")
export const fmtDateShort = (iso: string) => format(parseISO(iso), "dd/MM")
export const fmtDateTime = (iso: string) => format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm")
export const fmtTime = (iso: string) => format(parseISO(iso), "HH:mm")
export const fmtWeekday = (iso: string) => format(parseISO(iso), "EEEE", { locale: ptBR })
export const fmtWeekdayShort = (iso: string) =>
  format(parseISO(iso), "EEE", { locale: ptBR }).replace(".", "")
export const fmtLongDate = (iso: string) =>
  format(parseISO(iso), "EEEE, d 'de' MMMM", { locale: ptBR })
export const fmtDayMonth = (iso: string) => format(parseISO(iso), "d 'de' MMM", { locale: ptBR })

export function timeAgo(iso: string) {
  const diff = Date.now() - parseISO(iso).getTime()
  if (diff < 45_000) return "agora"
  return `há ${formatDistanceToNowStrict(parseISO(iso), { locale: ptBR })
    .replace(" minutos", " min")
    .replace(" minuto", " min")
    .replace(" segundos", " s")}`
}

export function ageFrom(birthDate: string, ref = new Date()) {
  return differenceInYears(ref, parseISO(birthDate))
}

export const AGE_BANDS = ["0–11", "12–17", "18–29", "30–44", "45–59", "60+"] as const
export function ageBand(age: number): (typeof AGE_BANDS)[number] {
  if (age <= 11) return "0–11"
  if (age <= 17) return "12–17"
  if (age <= 29) return "18–29"
  if (age <= 44) return "30–44"
  if (age <= 59) return "45–59"
  return "60+"
}

export function initials(name: string) {
  const parts = name.replace(/^(Dra?\.)\s+/, "").split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

export function firstName(name: string) {
  return name.split(" ")[0]
}

export const pluralize = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
