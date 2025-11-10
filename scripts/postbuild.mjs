import rss from './rss.mjs'

async function postbuild() {
  try {
    await rss()
  } catch (error) {
    console.error('Postbuild failed:', error)
    process.exit(1)
  }
}

postbuild()
