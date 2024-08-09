export default defineNuxtConfig({
  extends: './space',
  modules: [
    '@nuxt/devtools',
    '@nuxthq/ui'
  ],
  ui: {
    icons: ['heroicons', 'simple-icons']
  }
})
