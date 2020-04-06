const html = require('choo/html')
const raw = require('choo/html/raw')
const { content } = require('../content')
const TITLE = 'Showcase - main'

const renderContent = () => content.reduce(
  (s, { title, desc="", url="#" }, index) =>
    `${s}
    <div class="fl w-50 w-third-m w-third-l pa3">
      <a href="${url}" class="db link dim tc ba bw2">
        <h2>${index + 1}.${title}</h2>
        <p>${desc}</p>
      </a>
    </div>`
  , '')

module.exports = (state, emit) => {
  if (state.title !== TITLE) emit(state.events.DOMTITLECHANGE, TITLE)
  return html`
  <body class="code lh-copy">
    <article>        
      <div class="cf pa2 self-center">
        ${raw(renderContent())}
      </div>
    </article>
  </body>
  `
}
