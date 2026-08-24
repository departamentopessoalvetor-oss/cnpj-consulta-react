import { useMemo, useRef, useState } from 'react'

const API_URL = 'https://publica.cnpj.ws/cnpj'

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '')
}

function formatCNPJ(value = '') {
  const digits = onlyDigits(value).slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function isValidCNPJ(value) {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false

  const calculateDigit = (base, weights) => {
    const total = base.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0)
    const remainder = total % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const d1 = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = calculateDigit(cnpj.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return cnpj.endsWith(`${d1}${d2}`)
}

function formatCEP(value) {
  const digits = onlyDigits(value)
  if (digits.length !== 8) return value
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function formatPhone(ddd, number) {
  const digits = onlyDigits(`${ddd || ''}${number || ''}`)
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return [ddd && `(${ddd})`, number].filter(Boolean).join(' ') || 'Não informado'
}

function isDateKey(key = '') {
  const normalized = key.toLowerCase()
  return normalized.startsWith('data_') || normalized.endsWith('_em') || normalized.includes('atualizado')
}

function formatDate(value) {
  if (typeof value !== 'string') return value
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T/.test(value)
  if (!dateOnly && !isoDateTime) return value

  const date = dateOnly ? new Date(`${value}T12:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    ...(isoDateTime ? { timeStyle: 'short' } : {}),
  }).format(date)
}

function formatCurrency(value) {
  const number = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(number)) return value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number)
}

function humanizeKey(key = '') {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPrimitive(key, value) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'

  const normalizedKey = String(key).toLowerCase()
  const stringValue = String(value)

  if (normalizedKey === 'capital_social') return formatCurrency(value)
  if (normalizedKey === 'cep') return formatCEP(value)
  if (isDateKey(normalizedKey)) return formatDate(stringValue)

  const digits = onlyDigits(stringValue)
  if (normalizedKey.includes('cnpj') && digits.length === 14) {
    return formatCNPJ(digits)
  }

  return stringValue
}

function getFieldStats(value) {
  let total = 0
  let filled = 0

  const walk = (node) => {
    if (Array.isArray(node)) {
      if (node.length === 0) {
        total += 1
        return
      }
      node.forEach(walk)
      return
    }

    if (node && typeof node === 'object') {
      const values = Object.values(node)
      if (values.length === 0) {
        total += 1
        return
      }
      values.forEach(walk)
      return
    }

    total += 1
    if (node !== null && node !== undefined && node !== '') filled += 1
  }

  walk(value)
  return { total, filled }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  const active = normalized.includes('ativa') && !normalized.includes('inativa')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
      )}
    >
      {status || 'Situação não informada'}
    </span>
  )
}

function SummaryItem({ label, value, wide = false }) {
  return (
    <div className={cn('min-w-0 rounded-2xl border border-slate-200 bg-white p-4', wide && 'md:col-span-2')}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="break-words text-sm font-semibold leading-6 text-slate-800">{value || 'Não informado'}</div>
    </div>
  )
}

function PrimitiveValue({ fieldKey, value }) {
  const isMissing = value === null || value === undefined || value === ''
  const isBoolean = typeof value === 'boolean'

  return (
    <span
      className={cn(
        'break-words text-sm leading-6',
        isMissing ? 'italic text-slate-400' : 'font-medium text-slate-700',
        isBoolean && 'font-bold',
      )}
      title={typeof value === 'string' ? value : undefined}
    >
      {formatPrimitive(fieldKey, value)}
    </span>
  )
}

function JsonNode({ name, value, level = 0, path = 'root' }) {
  const isArray = Array.isArray(value)
  const isObject = value && typeof value === 'object' && !isArray

  if (!isArray && !isObject) {
    return (
      <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[minmax(160px,0.38fr)_1fr] sm:gap-5">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{humanizeKey(name)}</div>
        <PrimitiveValue fieldKey={name} value={value} />
      </div>
    )
  }

  const entries = isArray ? value.map((item, index) => [String(index), item]) : Object.entries(value)
  const typeLabel = isArray ? `${value.length} ${value.length === 1 ? 'item' : 'itens'}` : `${entries.length} campos`
  const defaultOpen = level < 2

  return (
    <details
      className={cn(
        'group overflow-hidden rounded-2xl border border-slate-200 bg-white',
        level > 0 && 'rounded-xl bg-slate-50/60',
      )}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 select-none hover:bg-slate-50">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-800">{humanizeKey(name)}</div>
          <div className="mt-0.5 text-xs text-slate-400">{typeLabel}</div>
        </div>
        <span className="text-lg leading-none text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>

      <div className="border-t border-slate-200 p-3 sm:p-4">
        {entries.length === 0 ? (
          <p className="py-2 text-sm italic text-slate-400">{isArray ? 'Lista vazia' : 'Objeto vazio'}</p>
        ) : isArray ? (
          <div className="space-y-3">
            {entries.map(([index, item]) => {
              const childIsComplex = item && typeof item === 'object'
              return childIsComplex ? (
                <JsonNode key={`${path}.${index}`} name={`Item ${Number(index) + 1}`} value={item} level={level + 1} path={`${path}.${index}`} />
              ) : (
                <div key={`${path}.${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Item {Number(index) + 1}</div>
                  <PrimitiveValue fieldKey={name} value={item} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(([key, item]) => (
              <JsonNode key={`${path}.${key}`} name={key} value={item} level={level + 1} path={`${path}.${key}`} />
            ))}
          </div>
        )}
      </div>
    </details>
  )
}

function RawJsonModal({ data, onClose }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  async function copyJson() {
    try {
      await copyText(json)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="JSON bruto">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-slate-950 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-bold text-white">JSON bruto</p>
            <p className="mt-0.5 text-xs text-slate-400">Resposta completa da API, sem transformação.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyJson} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800">
              {copied ? 'Copiado!' : 'Copiar JSON'}
            </button>
            <button onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800" aria-label="Fechar JSON bruto">
              Fechar
            </button>
          </div>
        </div>
        <pre className="json-scrollbar flex-1 overflow-auto p-5 text-xs leading-6 text-slate-200 sm:p-6">{json}</pre>
      </div>
    </div>
  )
}

function App() {
  const [cnpj, setCnpj] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const requestRef = useRef(null)

  const stats = useMemo(() => (data ? getFieldStats(data) : { total: 0, filled: 0 }), [data])
  const est = data?.estabelecimento

  const address = useMemo(() => {
    if (!est) return ''
    const street = [est.tipo_logradouro, est.logradouro].filter(Boolean).join(' ')
    const line1 = [street, est.numero].filter(Boolean).join(', ')
    return [line1, est.complemento, est.bairro, est.cep ? `CEP ${formatCEP(est.cep)}` : null].filter(Boolean).join(' • ')
  }, [est])

  const phones = useMemo(() => {
    if (!est) return ''
    return [
      est.telefone1 ? formatPhone(est.ddd1, est.telefone1) : null,
      est.telefone2 ? formatPhone(est.ddd2, est.telefone2) : null,
    ].filter(Boolean).join(' • ')
  }, [est])

  const cityUf = [est?.cidade?.nome, est?.estado?.sigla].filter(Boolean).join(' / ')
  const cnae = est?.atividade_principal
    ? `${est.atividade_principal.subclasse || est.atividade_principal.id || ''}${est.atividade_principal.descricao ? ` — ${est.atividade_principal.descricao}` : ''}`
    : ''

  async function handleSubmit(event) {
    event?.preventDefault()
    setError('')
    setCopyStatus('')

    const digits = onlyDigits(cnpj)
    if (digits.length !== 14) {
      setError('Digite um CNPJ com 14 números.')
      return
    }
    if (!isValidCNPJ(digits)) {
      setError('O CNPJ informado não passou na validação dos dígitos verificadores.')
      return
    }

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/${digits}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })

      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (!response.ok) {
        if (response.status === 404) throw new Error('CNPJ não encontrado na base pública.')
        if (response.status === 429) throw new Error('Limite da API pública atingido. Aguarde antes de fazer outra consulta (máximo de 3 por minuto).')
        const apiMessage = payload?.detalhes || payload?.message || payload?.error || payload?.titulo
        throw new Error(apiMessage || `Não foi possível consultar o CNPJ (HTTP ${response.status}).`)
      }

      if (!payload || typeof payload !== 'object') {
        throw new Error('A API respondeu sem um JSON válido.')
      }

      setData(payload)
      setCnpj(formatCNPJ(digits))
      window.requestAnimationFrame(() => {
        document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('A consulta demorou mais que o esperado. Verifique sua conexão e tente novamente.')
      } else {
        setError(err?.message || 'Ocorreu um erro inesperado ao consultar o CNPJ.')
      }
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  async function copyJson() {
    if (!data) return
    const json = JSON.stringify(data, null, 2)
    try {
      await copyText(json)
      setCopyStatus('JSON copiado')
    } catch {
      setCopyStatus('Não foi possível copiar automaticamente')
    }
    window.setTimeout(() => setCopyStatus(''), 1800)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="absolute inset-x-0 top-0 h-[380px] overflow-hidden bg-slate-950" aria-hidden="true">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-sm font-black tracking-tight text-white">BR</div>
          <div>
            <div className="text-sm font-black tracking-tight text-white">Consulta CNPJ</div>
            <div className="text-[11px] font-medium text-slate-400">Dados públicos empresariais</div>
          </div>
        </div>
        <a href="https://docs.cnpj.ws/referencia-de-api/api-publica/consultando-cnpj" target="_blank" rel="noreferrer" className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 sm:block">
          Documentação da API
        </a>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8 lg:px-10">
        <section className="pt-10 sm:pt-16">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-200">Consulta pública CNPJ.ws</div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">Consulte uma empresa.<br className="hidden sm:block" /> Entenda todos os dados.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Digite o CNPJ para obter um resumo objetivo e uma leitura completa, dinâmica e recursiva de tudo o que a API retornar.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-white/10 bg-white p-3 shadow-soft sm:flex sm:items-center sm:gap-3 sm:p-4">
            <div className="min-w-0 flex-1 px-2 py-1">
              <label htmlFor="cnpj" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">CNPJ</label>
              <input
                id="cnpj"
                name="cnpj"
                inputMode="numeric"
                autoComplete="off"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(event) => {
                  setCnpj(formatCNPJ(event.target.value))
                  if (error) setError('')
                }}
                maxLength={18}
                className="w-full border-0 bg-transparent p-0 text-xl font-black tracking-[0.04em] text-slate-900 placeholder:font-semibold placeholder:text-slate-300 focus:outline-none sm:text-2xl"
                aria-describedby="cnpj-help"
              />
              <p id="cnpj-help" className="mt-1.5 text-xs text-slate-400">A máscara é aplicada automaticamente; a API recebe apenas os 14 números.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-0 sm:w-auto sm:min-w-40"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  Consultando
                </>
              ) : 'Consultar CNPJ'}
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-100 text-xs font-black">!</div>
              <div>
                <div className="font-bold">Não foi possível concluir a consulta</div>
                <div className="mt-1 leading-6 text-rose-700">{error}</div>
              </div>
            </div>
          )}
        </section>

        {data && (
          <section id="resultado" className="scroll-mt-6 pt-10 sm:pt-12">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-5 py-6 sm:px-7 sm:py-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={est?.situacao_cadastral} />
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">{est?.tipo || 'Estabelecimento'}</span>
                    </div>
                    <h2 className="break-words text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">{data.razao_social || 'Razão social não informada'}</h2>
                    <p className="mt-2 break-words text-sm font-semibold text-slate-500">{est?.nome_fantasia || 'Nome fantasia não informado'} · {formatCNPJ(est?.cnpj || onlyDigits(cnpj))}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowRaw(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Ver JSON bruto</button>
                    <button onClick={copyJson} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">{copyStatus || 'Copiar JSON'}</button>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">Resumo</p>
                    <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">Informações essenciais</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">{stats.filled}</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">campos preenchidos</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryItem label="Razão social" value={data.razao_social} />
                  <SummaryItem label="Nome fantasia" value={est?.nome_fantasia} />
                  <SummaryItem label="Situação" value={est?.situacao_cadastral} />
                  <SummaryItem label="Endereço" value={address} wide />
                  <SummaryItem label="Cidade / UF" value={cityUf} />
                  <SummaryItem label="CNAE principal" value={cnae} wide />
                  <SummaryItem label="Telefone" value={phones} />
                  <SummaryItem label="E-mail" value={est?.email} />
                  <SummaryItem label="Capital social" value={formatCurrency(data.capital_social)} />
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">Inscrições estaduais</p>
                      <p className="mt-0.5 text-xs text-slate-500">{est?.inscricoes_estaduais?.length || 0} registro(s) retornado(s)</p>
                    </div>
                  </div>
                  {est?.inscricoes_estaduais?.length ? (
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {est.inscricoes_estaduais.map((ie, index) => (
                        <div key={`${ie.inscricao_estadual}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-800">{ie.inscricao_estadual || 'Sem número'}</div>
                            <div className="mt-0.5 text-xs text-slate-400">{ie.estado?.sigla || ie.estado?.nome || 'UF não informada'}</div>
                          </div>
                          <span className={cn('rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em]', ie.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{ie.ativo ? 'Ativa' : 'Inativa'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-400">Nenhuma inscrição estadual informada.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">Resposta completa</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">Todos os dados retornados</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">A estrutura abaixo é recursiva: novos campos, objetos, listas e listas de objetos aparecem automaticamente sem alteração no código.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
                  <div className="text-sm font-black text-slate-900">{stats.filled} / {stats.total}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">preenchidos / campos</div>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(data).map(([key, value]) => (
                  <JsonNode key={key} name={key} value={value} path={key} />
                ))}
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
              Os dados exibidos são retornados pela API pública CNPJ.ws. A própria API pode atualizar sua estrutura ou seus valores ao longo do tempo; o explorador dinâmico foi feito para continuar exibindo campos novos automaticamente.
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Interface de consulta de dados públicos de CNPJ.</span>
          <span>Sem biblioteca externa de ícones.</span>
        </div>
      </footer>

      {showRaw && <RawJsonModal data={data} onClose={() => setShowRaw(false)} />}
    </div>
  )
}

export default App
