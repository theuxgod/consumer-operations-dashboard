import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './style.css'
import App from './App.vue'
import router from './router'

const operationsDark = {
  dark: true,
  colors: {
    background: '#0d0f14',
    surface: '#161a22',
    'surface-bright': '#1d222c',
    'surface-light': '#1d222c',
    primary: '#5b9dff',
    secondary: '#22d3ee',
    error: '#f04438',
    warning: '#f79009',
    success: '#12b76a',
    info: '#5b9dff',
    'on-background': '#e6e8ee',
    'on-surface': '#e6e8ee',
  },
}

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    defaultTheme: 'operationsDark',
    themes: {
      operationsDark,
    },
  },
  defaults: {
    VCard: {
      color: 'surface',
      flat: true,
    },
  },
})

createApp(App).use(router).use(vuetify).mount('#app')
