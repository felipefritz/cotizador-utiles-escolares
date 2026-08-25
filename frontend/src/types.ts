import type { ParsedItem, QuoteResponse, MultiProviderResponse } from './api'

export type SourceId =
  | 'mercadolibre'
  | 'dimeiggs'
  | 'libreria_nacional'
  | 'jamila'
  | 'coloranimal'
  | 'pronobel'
  | 'prisa'
  | 'lasecretaria'
  | 'web_shopping'
  | 'solotodo'
  | 'sodimac'
  | 'falabella'
  | 'ripley'
  | 'pcfactory'
  | 'paris'
  | 'lider_web'
  | 'jumbo_web'

export type Source = {
  id: SourceId
  name: string
  available: boolean
  logo?: string
  description?: string
}

export const SOURCES: Source[] = [
  { id: 'mercadolibre', name: 'MercadoLibre', available: true, description: 'Marketplace general' },
  { id: 'dimeiggs', name: 'Dimeiggs', available: true, description: 'Papelería y librería' },
  { id: 'libreria_nacional', name: 'Librería Nacional', available: true, description: 'Libros y artículos educativos' },
  { id: 'jamila', name: 'Jamila', available: true, description: 'Oficina y papelería' },
  { id: 'coloranimal', name: 'Coloranimal', available: true, description: 'Arte, librería y papelería' },
  { id: 'pronobel', name: 'Pronobel', available: true, description: 'Papelería y oficina' },
  { id: 'prisa', name: 'Prisa', available: true, description: 'Oficina y librería' },
  { id: 'lasecretaria', name: 'La Secretaria', available: true, description: 'Oficina y papelería' },
  { id: 'web_shopping', name: 'Búsqueda web', available: false, description: 'Cobertura general' },
  { id: 'solotodo', name: 'SoloTodo', available: false, description: 'Comparador tech' },
  { id: 'sodimac', name: 'Sodimac', available: false, description: 'Construcción y hogar' },
  { id: 'falabella', name: 'Falabella', available: false, description: 'Retail y hogar' },
  { id: 'ripley', name: 'Ripley', available: false, description: 'Retail general' },
  { id: 'pcfactory', name: 'PC Factory', available: false, description: 'Tecnología' },
  { id: 'paris', name: 'Paris', available: false, description: 'Retail y hogar' },
  { id: 'lider_web', name: 'Lider', available: false, description: 'Supermercado' },
  { id: 'jumbo_web', name: 'Jumbo', available: false, description: 'Supermercado' },
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
