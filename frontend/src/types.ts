import type { ParsedItem, QuoteResponse, MultiProviderResponse } from './api'

export type SourceId =
  | 'mercadolibre'
  | 'dimeiggs'
  | 'libreria_nacional'
  | 'pronobel'
  | 'prisa'
  | 'lasecretaria'
  | 'siemprelistos'
  | 'arteideas'
  | 'papelaria'
  | 'libreriaacuario'
  | 'bazarte'
  | 'libreriameiggs'
  | 'comercialcr'
  | 'tecnoutiles'
  | 'felizgroup'
  | 'torre'
  | 'libreriaolimpica'
  | 'antartica'
  | 'fasit'
  | 'elcuaderno'
  | 'mabeduna'
  | 'librerianene'
  | 'dibu'
  | 'jabeschile'
  | 'somosarte'
  | 'lacasadelarte'
  | 'artemania'
  | 'disenarte'
  | 'construfer'
  | 'ferreteriaprat'
  | 'hangar77'
  | 'construplaza'
  | 'patioferretero'
  | 'herramientastotal'
  | 'ferreteriastore'
  | 'chileferret'
  | 'herramientasferreteria'
  | 'kitchencenter'
  | 'homemobili'
  | 'fissman'
  | 'kitchenhouse'
  | 'weitzler'
  | 'santamariana'
  | 'bazared'
  | 'portomenaje'
  | 'tiendacopec'
  | 'homeonline'
  | 'rosen'
  | 'fullmuebles'
  | 'prido'
  | 'euromob'
  | 'dimensiona'
  | 'productosdeaseo'
  | 'llabres'
  | 'alltec'
  | 'maxitech'
  | 'casaroyal'
  | 'chilepc'
  | 'cintegral'
  | 'notebookstore'
  | 'compuelite'
  | 'centralgamer'
  | 'trulustore'
  | 'xtremecomponents'
  | 'bpets'
  | 'pethome'
  | 'maximascotas'
  | 'patitasdemia'
  | 'animaladas'
  | 'bokapets'
  | 'todoparasumascota'
  | 'petco'
  | 'jumbo'
  | 'lider'
  | 'santaisabel'
  | 'tottus'
  | 'apishop'
  | 'alimentika'
  | 'distribuidorasantiago'
  | 'minimayorista'
  | 'distribuidoraonline'
  | 'fermarket'
  | 'rgc'
  | 'aseopormayor'
  | 'outletdeaseo'

export type AreaId =
  | 'general'
  | 'construccion'
  | 'oficina'
  | 'hogar'
  | 'tecnologia'
  | 'educacion'
  | 'supermercado'
  | 'mayorista'
  | 'mascotas'

export type Area = {
  id: AreaId
  name: string
  description: string
}

export const AREAS: Area[] = [
  { id: 'general', name: 'General', description: 'Productos de cualquier categoría' },
  { id: 'construccion', name: 'Construcción', description: 'Ferretería, herramientas y materiales' },
  { id: 'oficina', name: 'Oficina', description: 'Papelería, insumos y equipamiento' },
  { id: 'hogar', name: 'Casa y hogar', description: 'Muebles, cocina y organización' },
  { id: 'tecnologia', name: 'Tecnología', description: 'Computación, periféricos y electrónica' },
  { id: 'educacion', name: 'Educación', description: 'Útiles, arte y librería' },
  { id: 'supermercado', name: 'Supermercado', description: 'Abarrotes, aseo y consumo diario' },
  { id: 'mayorista', name: 'Mayoristas', description: 'Distribuidores, compra por volumen y aseo' },
  { id: 'mascotas', name: 'Mascotas', description: 'Alimentos, salud, higiene y accesorios' },
]

export const RECOMMENDED_SOURCE_BY_AREA: Record<AreaId, SourceId> = {
  general: 'dimeiggs',
  construccion: 'construfer',
  oficina: 'siemprelistos',
  hogar: 'kitchencenter',
  tecnologia: 'alltec',
  educacion: 'siemprelistos',
  supermercado: 'jumbo',
  mayorista: 'alimentika',
  mascotas: 'petco',
}

export type Source = {
  id: SourceId
  name: string
  available: boolean
  logo?: string
  description?: string
  areas: AreaId[]
  color: string
  url: string
}

export const SOURCES: Source[] = [
  { id: 'mercadolibre', name: 'MercadoLibre', available: false, description: 'Requiere acceso autorizado a su API', areas: ['general', 'construccion', 'oficina', 'hogar', 'tecnologia', 'educacion'], color: '#B79500', url: 'https://www.mercadolibre.cl/' },
  { id: 'dimeiggs', name: 'Dimeiggs', available: true, description: 'Papelería, hogar y tecnología', areas: ['general', 'oficina', 'hogar', 'tecnologia', 'educacion'], color: '#2196F3', url: 'https://www.dimeiggs.cl/' },
  { id: 'libreria_nacional', name: 'Librería Nacional', available: true, description: 'Libros y artículos educativos', areas: ['oficina', 'educacion'], color: '#7B1FA2', url: 'https://nacional.cl/' },
  { id: 'pronobel', name: 'Pronobel', available: true, description: 'Papelería y oficina', areas: ['oficina', 'educacion'], color: '#5E35B1', url: 'https://pronobel.cl/' },
  { id: 'prisa', name: 'Prisa', available: true, description: 'Oficina y librería', areas: ['oficina', 'educacion'], color: '#C2185B', url: 'https://www.prisa.cl/' },
  { id: 'lasecretaria', name: 'La Secretaria', available: true, description: 'Oficina y papelería', areas: ['oficina', 'educacion'], color: '#455A64', url: 'https://lasecretaria.cl/' },
  { id: 'siemprelistos', name: 'Siempre Listos', available: true, description: 'Oficina, papelería y útiles', areas: ['oficina', 'educacion'], color: '#1565C0', url: 'https://www.siemprelistos.cl/' },
  { id: 'arteideas', name: 'Librería Arteideas', available: true, description: 'Papelería, oficina y manualidades', areas: ['oficina', 'educacion'], color: '#9333EA', url: 'https://libreriaarteideas.cl/' },
  { id: 'papelaria', name: 'La Papelaria', available: true, description: 'Cuadernos, escritura y organización', areas: ['oficina', 'educacion'], color: '#DB2777', url: 'https://www.papelaria.cl/' },
  { id: 'libreriaacuario', name: 'Librería Acuario', available: true, description: 'Librería, papelería y útiles', areas: ['oficina', 'educacion'], color: '#0284C7', url: 'https://libreriacuario.cl/' },
  { id: 'bazarte', name: 'Bazarte', available: true, description: 'Papelería, escolares y manualidades', areas: ['oficina', 'educacion'], color: '#E11D48', url: 'https://libreriabazarte.cl/' },
  { id: 'libreriameiggs', name: 'Librería Meiggs', available: true, description: 'Útiles escolares y papelería', areas: ['oficina', 'educacion'], color: '#1E40AF', url: 'https://www.libreriameiggs.cl/' },
  { id: 'comercialcr', name: 'Comercial CR', available: true, description: 'Útiles escolares por mayor', areas: ['oficina', 'educacion'], color: '#0891B2', url: 'https://comcr.cl/' },
  { id: 'tecnoutiles', name: 'TecnoÚtiles', available: true, description: 'Oficina, librería y escolares', areas: ['oficina', 'educacion', 'tecnologia'], color: '#4338CA', url: 'https://tecnoutiles.cl/' },
  { id: 'felizgroup', name: 'Feliz Group', available: true, description: 'Útiles escolares al por mayor', areas: ['oficina', 'educacion'], color: '#EA580C', url: 'https://www.felizgroupxmayor.cl/' },
  { id: 'torre', name: 'Torre', available: true, description: 'Cuadernos y artículos de escritura', areas: ['oficina', 'educacion'], color: '#B45309', url: 'https://www.torre.cl/' },
  { id: 'libreriaolimpica', name: 'Librería Olímpica', available: true, description: 'Escolares y papelería por mayor', areas: ['oficina', 'educacion'], color: '#065F46', url: 'https://www.libreriaolimpica.cl/' },
  { id: 'antartica', name: 'Antártica', available: true, description: 'Libros y lectura escolar', areas: ['educacion'], color: '#0F172A', url: 'https://www.antartica.cl/' },
  { id: 'fasit', name: 'Fasit', available: true, description: 'Insumos de oficina y aseo', areas: ['oficina', 'hogar'], color: '#334155', url: 'https://fasit.cl/' },
  { id: 'elcuaderno', name: 'ElCuaderno', available: true, description: 'Papelería y encuadernación', areas: ['oficina', 'educacion'], color: '#1D4ED8', url: 'https://www.elcuaderno.cl/' },
  { id: 'mabeduna', name: 'Librería Mabeduna', available: true, description: 'Escolares, mochilas y papelería', areas: ['oficina', 'educacion'], color: '#7C2D12', url: 'https://www.libreriamabeduna.cl/' },
  { id: 'librerianene', name: 'Librería Nené', available: true, description: 'Útiles escolares y forros', areas: ['oficina', 'educacion'], color: '#BE123C', url: 'https://web.librerianene.cl/' },
  { id: 'dibu', name: 'Dibu', available: true, description: 'Materiales de arte y dibujo', areas: ['educacion', 'oficina'], color: '#7E22CE', url: 'https://www.dibu.cl/' },
  { id: 'jabeschile', name: 'Jabes Chile', available: true, description: 'Escolares, arte y manualidades', areas: ['educacion', 'oficina'], color: '#A21CAF', url: 'https://jabeschile.cl/' },
  { id: 'somosarte', name: 'Somos Arte', available: true, description: 'Materiales para artistas', areas: ['educacion'], color: '#BE185D', url: 'https://somosarte.cl/' },
  { id: 'lacasadelarte', name: 'La Casa del Arte', available: true, description: 'Arte, escolar y oficina', areas: ['educacion', 'oficina'], color: '#C026D3', url: 'https://www.lacasadelarte.cl/' },
  { id: 'artemania', name: 'ArteManía', available: true, description: 'Manualidades y materiales de arte', areas: ['educacion', 'oficina'], color: '#DB2777', url: 'https://www.artemaniachile.cl/' },
  { id: 'disenarte', name: 'Tienda Diseñarte', available: true, description: 'Materiales de arte y diseño', areas: ['educacion', 'oficina'], color: '#6D28D9', url: 'https://www.tiendadisenarte.cl/' },
  { id: 'construfer', name: 'Construfer', available: true, description: 'Ferretería y materiales', areas: ['construccion'], color: '#D97706', url: 'https://www.construfer.cl/' },
  { id: 'ferreteriaprat', name: 'Ferretería Prat', available: true, description: 'Herramientas y construcción', areas: ['construccion'], color: '#92400E', url: 'https://ferreteriaprat.cl/' },
  { id: 'hangar77', name: 'Hangar 77', available: true, description: 'Ferretería y herramientas especializadas', areas: ['construccion'], color: '#374151', url: 'https://hangar77.cl/' },
  { id: 'construplaza', name: 'Construplaza', available: true, description: 'Materiales de construcción y herramientas', areas: ['construccion', 'hogar'], color: '#A16207', url: 'https://construplaza.cl/' },
  { id: 'patioferretero', name: 'Patio Ferretero', available: true, description: 'Herramientas INGCO y Wadfow', areas: ['construccion'], color: '#CA8A04', url: 'https://www.patioferretero.cl/' },
  { id: 'herramientastotal', name: 'Total Tools', available: true, description: 'Herramientas profesionales', areas: ['construccion'], color: '#EA580C', url: 'https://herramientastotal.cl/' },
  { id: 'ferreteriastore', name: 'Ferre Store', available: true, description: 'Herramientas y accesorios', areas: ['construccion'], color: '#78350F', url: 'https://ferreteriastore.cl/' },
  { id: 'chileferret', name: 'Chileferret', available: true, description: 'Ferretería online', areas: ['construccion'], color: '#B45309', url: 'https://chileferret.cl/' },
  { id: 'herramientasferreteria', name: 'Herramientas Ferretería', available: true, description: 'Herramientas y accesorios Truper', areas: ['construccion'], color: '#854D0E', url: 'https://herramientasferreteria.cl/' },
  { id: 'kitchencenter', name: 'Kitchen Center', available: true, description: 'Cocina y equipamiento del hogar', areas: ['hogar'], color: '#B91C1C', url: 'https://www.kitchencenter.cl/' },
  { id: 'homemobili', name: 'Home Mobili', available: true, description: 'Muebles para hogar y oficina', areas: ['hogar', 'oficina'], color: '#7C3AED', url: 'https://homemobili.cl/' },
  { id: 'fissman', name: 'Fissman', available: true, description: 'Ollas, sartenes y menaje', areas: ['hogar'], color: '#B91C1C', url: 'https://fissman.cl/' },
  { id: 'kitchenhouse', name: 'Kitchen House', available: true, description: 'Cocina y menaje especializado', areas: ['hogar'], color: '#9F1239', url: 'https://kitchenhouse.cl/' },
  { id: 'weitzler', name: 'Weitzler', available: true, description: 'Menaje, cocina y electrodomésticos', areas: ['hogar'], color: '#C2410C', url: 'https://www.weitzler.cl/' },
  { id: 'santamariana', name: 'Santa Mariana', available: true, description: 'Menaje y equipamiento gastronómico', areas: ['hogar'], color: '#BE123C', url: 'https://santamariana.cl/' },
  { id: 'bazared', name: 'BazarED', available: true, description: 'Menaje, orden y bazar', areas: ['hogar', 'general'], color: '#DC2626', url: 'https://www.bazared.cl/' },
  { id: 'portomenaje', name: 'Portomenaje', available: true, description: 'Cristalería, vajilla y cuchillería', areas: ['hogar'], color: '#0369A1', url: 'https://www.portomenaje.cl/' },
  { id: 'tiendacopec', name: 'Tienda Copec', available: true, description: 'Cocina, menaje y hogar', areas: ['hogar', 'general'], color: '#1D4ED8', url: 'https://www.tiendacopec.cl/' },
  { id: 'homeonline', name: 'Home Online', available: true, description: 'Línea blanca, electro y menaje', areas: ['hogar', 'tecnologia'], color: '#0E7490', url: 'https://homeonline.cl/' },
  { id: 'rosen', name: 'Rosen', available: true, description: 'Descanso, almohadas y ropa de cama', areas: ['hogar'], color: '#831843', url: 'https://www.rosen.cl/' },
  { id: 'fullmuebles', name: 'Fullmuebles', available: true, description: 'Sillas y muebles de oficina', areas: ['oficina', 'hogar'], color: '#0F766E', url: 'https://fullmuebles.cl/' },
  { id: 'prido', name: 'Prido', available: true, description: 'Mobiliario de oficina para empresas', areas: ['oficina'], color: '#1E40AF', url: 'https://www.prido.cl/' },
  { id: 'euromob', name: 'Euromob', available: true, description: 'Sillas, sillones y muebles de oficina', areas: ['oficina'], color: '#155E75', url: 'https://www.euromob.cl/' },
  { id: 'dimensiona', name: 'Dimensiona', available: true, description: 'Escritorios y sillas de oficina', areas: ['oficina', 'hogar'], color: '#3730A3', url: 'https://muebles.dimensiona.cl/' },
  { id: 'productosdeaseo', name: 'Productos de Aseo', available: true, description: 'Aseo e higiene para empresas', areas: ['hogar', 'oficina'], color: '#047857', url: 'https://www.productosdeaseo.cl/' },
  { id: 'llabres', name: 'Llabrés', available: true, description: 'Limpieza industrial y hogar', areas: ['hogar', 'oficina'], color: '#065F46', url: 'https://llabres.cl/' },
  { id: 'alltec', name: 'Alltec', available: true, description: 'Hardware y periféricos', areas: ['tecnologia', 'oficina'], color: '#0F766E', url: 'https://www.alltec.cl/' },
  { id: 'maxitech', name: 'Maxitech', available: true, description: 'Tecnología, hogar y oficina', areas: ['general', 'oficina', 'hogar', 'tecnologia'], color: '#1D4ED8', url: 'https://tiendamaxitech.cl/' },
  { id: 'casaroyal', name: 'Casa Royal', available: true, description: 'Electrónica, tecnología y hogar', areas: ['general', 'hogar', 'tecnologia'], color: '#DC2626', url: 'https://www.casaroyal.cl/' },
  { id: 'chilepc', name: 'Chile PC', available: true, description: 'Computación y componentes', areas: ['tecnologia'], color: '#0284C7', url: 'https://chilepc.cl/' },
  { id: 'cintegral', name: 'Cintegral', available: true, description: 'Computación y periféricos', areas: ['tecnologia'], color: '#047857', url: 'https://cintegral.cl/' },
  { id: 'notebookstore', name: 'Notebook Store', available: true, description: 'Notebooks e insumos computacionales', areas: ['tecnologia', 'oficina'], color: '#1E3A8A', url: 'https://notebookstore.cl/' },
  { id: 'compuelite', name: 'CompuElite', available: true, description: 'PC gamer, monitores y componentes', areas: ['tecnologia'], color: '#4C1D95', url: 'https://www.compuelite.cl/' },
  { id: 'centralgamer', name: 'Central Gamer', available: true, description: 'PC gamer, componentes y periféricos', areas: ['tecnologia'], color: '#7C3AED', url: 'https://centralgamer.cl/' },
  { id: 'trulustore', name: 'Trulu Store', available: true, description: 'Computación, monitores y accesorios', areas: ['tecnologia'], color: '#2563EB', url: 'https://trulustore.cl/' },
  { id: 'xtremecomponents', name: 'Xtreme Components', available: true, description: 'Componentes y equipamiento gamer', areas: ['tecnologia'], color: '#DC2626', url: 'https://xtremecomponents.cl/' },
  { id: 'bpets', name: 'B-Pets', available: true, description: 'Alimentos y accesorios para perros y gatos', areas: ['mascotas'], color: '#F97316', url: 'https://www.bpets.cl/' },
  { id: 'pethome', name: 'PetHome', available: true, description: 'Alimentos, higiene y accesorios para mascotas', areas: ['mascotas'], color: '#0EA5E9', url: 'https://pethome.cl/' },
  { id: 'maximascotas', name: 'Maxi Mascotas', available: true, description: 'Alimentos y cuidado para perros y gatos', areas: ['mascotas'], color: '#16A34A', url: 'https://maximascotas.cl/' },
  { id: 'patitasdemia', name: 'Patitas de Mía', available: true, description: 'Alimentos y productos para mascotas', areas: ['mascotas'], color: '#EC4899', url: 'https://www.patitasdemiapetshop.cl/' },
  { id: 'animaladas', name: 'Animaladas', available: true, description: 'Alimentos, salud y accesorios', areas: ['mascotas'], color: '#8B5CF6', url: 'https://animaladas.cl/' },
  { id: 'bokapets', name: 'BokaPets', available: true, description: 'Alimentos para perros y gatos', areas: ['mascotas'], color: '#EA580C', url: 'https://www.bokapets.cl/' },
  { id: 'todoparasumascota', name: 'Todo Para Su Mascota', available: true, description: 'Alimentos y accesorios para perros y gatos', areas: ['mascotas'], color: '#0891B2', url: 'https://www.todoparasumascota.cl/' },
  { id: 'petco', name: 'Petco Chile', available: true, description: 'Alimentos, salud, higiene y accesorios', areas: ['mascotas'], color: '#006DB7', url: 'https://www.petco.cl/' },
  { id: 'jumbo', name: 'Jumbo', available: true, description: 'Supermercado y productos de consumo diario', areas: ['supermercado'], color: '#00843D', url: 'https://www.jumbo.cl/' },
  { id: 'lider', name: 'Líder', available: true, description: 'Supermercado, despensa y productos frescos', areas: ['supermercado'], color: '#0071CE', url: 'https://super.lider.cl/' },
  { id: 'santaisabel', name: 'Santa Isabel', available: true, description: 'Supermercado, abarrotes y productos frescos', areas: ['supermercado'], color: '#E1251B', url: 'https://www.santaisabel.cl/' },
  { id: 'tottus', name: 'Tottus', available: true, description: 'Supermercado, despensa y hogar', areas: ['supermercado'], color: '#6CB33F', url: 'https://www.tottus.cl/' },
  { id: 'apishop', name: 'Apishop', available: true, description: 'Supermercado y productos del hogar', areas: ['hogar', 'supermercado'], color: '#15803D', url: 'https://apishop.cl/' },
  { id: 'alimentika', name: 'Alimentika', available: true, description: 'Abarrotes al por mayor', areas: ['mayorista'], color: '#166534', url: 'https://alimentika.cl/' },
  { id: 'distribuidorasantiago', name: 'Distribuidora Santiago', available: true, description: 'Abarrotes y consumo masivo', areas: ['mayorista'], color: '#3F6212', url: 'https://distribuidorasantiago.cl/' },
  { id: 'minimayorista', name: 'MiniMayorista', available: true, description: 'Supermercado mayorista', areas: ['mayorista'], color: '#4D7C0F', url: 'https://minimayorista.cl/' },
  { id: 'distribuidoraonline', name: 'Distribuidora Online', available: true, description: 'Dulces, confites y abarrotes', areas: ['mayorista'], color: '#65A30D', url: 'https://distribuidoraonline.cl/' },
  { id: 'fermarket', name: 'Fermarket', available: true, description: 'Abarrotes, congelados y aseo', areas: ['mayorista'], color: '#15803D', url: 'https://www.fermarket.cl/' },
  { id: 'rgc', name: 'RGC Distribución', available: true, description: 'Aseo, limpieza y consumo masivo', areas: ['mayorista', 'hogar'], color: '#4D7C0F', url: 'https://rgc.cl/' },
  { id: 'aseopormayor', name: 'Aseo por Mayor', available: true, description: 'Limpieza desde una unidad', areas: ['mayorista', 'hogar'], color: '#16A34A', url: 'https://aseopormayor.cl/' },
  { id: 'outletdeaseo', name: 'Outlet de Aseo', available: true, description: 'Aseo y limpieza a precio outlet', areas: ['mayorista', 'hogar'], color: '#15803D', url: 'https://www.outletdeaseo.cl/' },
]

export const getSourceName = (id: string): string => SOURCES.find((source) => source.id === id)?.name || id
export const getSourceColor = (id: string): string => SOURCES.find((source) => source.id === id)?.color || '#757575'
export const getSourceUrl = (id: string): string => SOURCES.find((source) => source.id === id)?.url || '#'

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
