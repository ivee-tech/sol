import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import Home from '../views/Home.vue'
import Analyzer from '../views/Analyzer.vue'
import MapComp from '../views/MapComp.vue'
import MapSearch from '../views/MapSearch.vue'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  },
  {
    path: '/a',
    name: 'Analyse',
    component: Analyzer // () => import(/* webpackChunkName: "about" */ '../views/Analyzer.vue')
  },
  {
    path: '/m',
    name: 'Map',
    component: MapComp
  },
  {
    path: '/ms',
    name: 'Map Search',
    component: MapSearch
  },
]

const router = new VueRouter({
  routes
})

export default router
