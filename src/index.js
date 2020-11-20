import axios from 'axios'
import fs, { writeFileSync } from 'fs'
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
  Object.keys(o).forEach(a => {
    fs.writeFileSync(`${ dist }/${ a }.json`, JSON.stringify(o[a]))
  })
}
const distRepo = 'https://doriandrn.github.io/currencies-rates'

if (!fs.existsSync(distList))
  fs.mkdirSync(distList, { recursive: true })

axios
  .get(`${ distRepo }/list.json`)
  .then(async ({ data }) => {
    const ids = await axios.get(`${ distRepo }/ids.json`)
    const symNames = await axios.get(`${ distRepo }/symbols-names.json`)
    const rates = await axios.get(`${ distRepo }/rates.json`)
    writeFiles({ ids, list: data, 'symbols-names': symNames })
    if (ids && ids.length && rates)
      getUpdatedRates(ids, rates)
  })
  .catch(async (e) => {
    console.info('No currencies found, getting fresh...')

    const listAll = {}

    await Promise.all(endpoints.map(async ep => {
      try {
        let { data } = await axios.get(`${ url }/${ ep }/map`, { headers })

        data = processData(data)
        data.data = data.data
          .filter(d => d.name) // keep coins tha have a name
          .map(d => {
            const { id, name, symbol, sign } = d
            return { id, name, symbol, sign }
          })
        listAll[ep] = data
        fs.writeFileSync(`${ distList }/${ ep }.json`, JSON.stringify(data))
      }
      catch (e) {
        console.error('Could not build currencies list: ', e)
      }

      return ep
    }))

    if (Object.keys(listAll).length < 0)
      return

    const list = [ ...endpoints ]
      .map(e => {
        const { timestamp, data } = listAll[e]
        return listAll[e] = e === 'fiat' ? data : data.filter(c => preferredCryptos.indexOf(c.id) > -1)
      })
      .reduce((prev, cur, i) => ({ ...prev, [endpoints[i]]: cur }), {})

    const symNames = {}
    endpoints.forEach(e => {
      Object.keys(list[e]).forEach(id => {
        const d = list[e][id]
        const { name, symbol } = d
        symNames[symbol] = name
      })
    })
    const ids = [ ...preferredCryptos, ...list.fiat.data.map(c => c.id) ]

    writeFiles({ ids, list, 'symbols-names': symNames })

    getUpdatedRates(ids)
  })

function getUpdatedRates ( ids, previousRates ) {
  if (previousRates) {
    fs.writeFileSync(`${ dist }/rates-${ previousRates.timestamp }.json`, JSON.stringify(previousRates))
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
