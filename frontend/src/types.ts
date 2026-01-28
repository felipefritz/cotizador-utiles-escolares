import type { ParsedItem, QuoteResponse, MultiProviderResponse } from './api'

export type SourceId =
  | 'dimeiggs'
  | 'libreria_nacional'
  | 'jamila'
  | 'coloranimal'
  | 'pronobel'
  | 'prisa'
  | 'lasecretaria'

export type Source = {
  id: SourceId
  name: string
  available: boolean
  logo?: string
}

export const SOURCES: Source[] = [
  { id: 'dimeiggs', name: 'Dimeiggs', available: true },
  { id: 'libreria_nacional', name: 'Librería Nacional', available: true },
  { id: 'jamila', name: 'Jamila', available: true },
  { id: 'coloranimal', name: 'Coloranimal', available: true },
  { id: 'pronobel', name: 'Pronobel', available: true },
  { id: 'prisa', name: 'Prisa', available: true },
  { id: 'lasecretaria', name: 'La Secretaria', available: true },
]

export type SelectedItem = {
  item: ParsedItem
  selected: boolean
  quantity: number
}

export type ItemQuote = {
  item: ParsedItem
  quantity: number
  dimeiggs?: QuoteResponse
  multi?: MultiProviderResponse  // nueva: multi-proveedor
}
