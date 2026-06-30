type CollectionWine = {
  status: string
  inCellar: boolean
  quantity: number
  wine?: {
    varietal?: string | null
  } | null
}

export type CollectionStats = {
  tried: number
  inCellar: number
  varietalCounts: [string, number][]
}

export function calculateCollectionStats(wines: CollectionWine[]): CollectionStats {
  const tried = wines.filter(wine => wine.status === 'TRIED').length
  const inCellar = wines
    .filter(wine => wine.inCellar)
    .reduce((sum, wine) => sum + (wine.quantity || 0), 0)

  const varietals = wines.reduce<Record<string, number>>((counts, userWine) => {
    const varietal = userWine.wine?.varietal
    if (varietal) {
      counts[varietal] = (counts[varietal] || 0)
        + (userWine.inCellar ? (userWine.quantity || 1) : 1)
    }
    return counts
  }, {})

  return {
    tried,
    inCellar,
    varietalCounts: Object.entries(varietals).sort((a, b) => b[1] - a[1]),
  }
}

export function getWineType(varietal: string): 'red' | 'white' | 'other' {
  const normalized = varietal.toLowerCase()
  const reds = [
    'cabernet sauvignon', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'zinfandel',
    'sangiovese', 'tempranillo', 'malbec', 'cabernet franc', 'grenache', 'gamay',
    'nebbiolo', 'barbera', 'dolcetto', 'carmenère', 'petit verdot', 'mourvèdre',
    'carignan', 'cinsault', 'pinotage', 'tannat', 'chianti', 'red blend', 'red',
  ]
  const whites = [
    'chardonnay', 'sauvignon blanc', 'pinot grigio', 'pinot gris', 'riesling',
    'gewürztraminer', 'viognier', 'chenin blanc', 'semillon', 'muscat',
    'albariño', 'verdejo', 'vermentino', 'grüner veltliner', 'torrontés',
    'moscato', 'pinot blanc', 'müller-thurgau', 'trebbiano', 'garganega',
    'prosecco', 'white blend', 'white',
  ]

  if (reds.some(red => normalized.includes(red))) return 'red'
  if (whites.some(white => normalized.includes(white))) return 'white'
  return 'other'
}
