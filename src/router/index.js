import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const constantRoutes = [
  {
    path: '/',
    component: () => import('@/views/index/index'),
    meta: { title: '首页' }
  },
  {
    path: '/tracking',
    component: () => import('@/views/faceRecognition/tracking'),
    meta: {
      title: '人脸识别-tracking'
    }
  },
  {
    path: '/face',
    component: () => import('@/views/faceRecognition/face'),
    meta: {
      title: '人脸识别-face-api'
    }
  }
]

export default new Router({
  mode: 'history',
  base: '/',
  routes: constantRoutes,
  scrollBehavior: () => ({ y: 0 })
})
