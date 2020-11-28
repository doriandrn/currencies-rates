import axios from 'axios'
import fs from 'fs'
import config from './config.js'

const {
  url,
  endpoints,
  headers,
  dist,
  quotesUrl,
  preferredCryptos
} = config

const distList = `${ dist }/list`
const processData = data => {
  if (data.status) {
    data.timestamp = data.status.timestamp
    delete data.status
  }
  return data
}
const writeFiles = (o) => {
  Object.keys(o).map(a => {
    fs.writeFileSync(`${ dist }/${ a }.json`, JSON.stringify(o[a]))
  })
}
const distRepo = 'https://doriandrn.github.io/currencies-rates'

if (!fs.existsSync(distList))
  fs.mkdirSync(distList, { recursive: true })

const getBigList = async () => {
  return await Promise.all([ ...endpoints ].map(async e => {
    let data
    try {
      data = await axios.get(`${ distRepo }/list/${ e }.json`)
    } catch (e) {
      try {
        data = await axios.get(`${ url }/${ ep }/map`, { headers })
      } catch (e) {
        console.error('could not get data')
        return
      }
    }
    data = processData(data.data)
    data.data = data.data
      .filter(d => d.name) // keep coins tha have a name
      .map(d => {
        const { id, name, symbol, sign } = d
        return { id, name, symbol, sign }
      })

    fs.writeFileSync(`${ distList }/${ e }.json`, JSON.stringify(data))
    return { [e]: data }
  }))
}

getBigList().then(async lists => {
  const list = lists.reduce((prev, cur, i) => ({ ...prev, [endpoints[i]]: cur[endpoints[i]].data }), {})
  list.cryptocurrency = list.cryptocurrency.filter(c => preferredCryptos.indexOf(c.id) > -1)
  const symNames = {}

  endpoints.forEach(e => {
    list[e] = list[e].reduce((a, b) => ({ ...a, [ b.id ]: { name: b.name, sign: b.sign, symbol: b.symbol } }), {})
    Object.keys(list[e]).forEach(id => {
      const d = list[e][id]
      const { name, symbol } = d
      symNames[symbol] = name
    })
  })

  const ids = [ ...preferredCryptos, ...Object.keys(list.fiat).map(i => Number(i)) ]
  writeFiles({
    ids,
    list,
    'symbols-names': symNames
  })

  const rates = await axios.get(`${ distRepo }/rates.json`)

  getUpdatedRates(ids, rates.data)
})

function getUpdatedRates ( ids, previousRates ) {
  if (previousRates) {
    fs.writeFileSync(`${ dist }/rates-${ (new Date(previousRates.timestamp)).getTime() }.json`, JSON.stringify(previousRates))
  }

  axios.get(quotesUrl, {
    headers,
    params: {
      id: ids.toString()
    }
  }).then(({ data }) => {
    if (!data.data)
      return

    data = processData(data)

    Object.keys(data.data).forEach(d => {
      const { quote } = data.data[d]
      data.data[d] = quote[Object.keys(quote)[0]].price
    })

    fs.writeFileSync(`${ dist }/rates.json`, JSON.stringify(data))
    console.info('Updated rates succesfully!')
  }).catch(e => {
    console.error('GET QUOTES FAILED', e)
  })
}
