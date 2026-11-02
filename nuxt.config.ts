export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxt/eslint'],
  components: [{ path: '~/components', pathPrefix: false }],
  css: ['~/assets/styles/main.scss'],
  typescript: { strict: true },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData:
            '@use "~/assets/styles/tokens" as *; @use "~/assets/styles/mixins" as *;\n'
        }
      }
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Заметки'
    }
  }
})
