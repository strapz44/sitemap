const state = {
  sitemaps: [
    { siteName: 'https://quiveutfairemestravaux.com', urls: [] },
    { siteName: 'https://citrondigital.fr', urls: [] },
    { siteName: 'https://nike.com', urls: [] },
  ],
}

module.exports.get = function get() {
  return state.sitemaps
}

module.exports.set = function set(next) {
  state.sitemaps = Array.isArray(next) ? next : state.sitemaps
}
