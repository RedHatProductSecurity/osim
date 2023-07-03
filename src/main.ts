import {createApp, watch} from 'vue'
import {createPinia} from 'pinia'

import App from './App.vue'
import router from './router'

import 'bootstrap/scss/bootstrap.scss'
import 'bootstrap-icons/font/bootstrap-icons.scss'

import './assets/main.css'

import 'bootstrap/js/index.esm.js'

const app = createApp(App)
const pinia = createPinia();

app.use(pinia)
app.use(router)


watch(pinia.state, state => {
  const storedUserStore = state.UserStore;
  if (storedUserStore.access !== '' || storedUserStore.refresh !== '') {
    storedUserStore._modifyDate = Date.now();
  }
  sessionStorage.setItem("UserStore", JSON.stringify(storedUserStore))
  // sessionStorage.setItem("OtherStore", JSON.stringify(state.OtherStore))
}, {deep: true})

app.mount('#app')
