const html = require('choo/html')
const TITLE = 'Showcase - route not found'

module.exports = (state, emit) => {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)
  return html`
    <body class="sans-serif pa3">
      <h1>Route not found.</h1>
      <a class="pt2" href="/">Back to main.</a>
    </body>
  `
}
