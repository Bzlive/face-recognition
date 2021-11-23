<template>
  <div class="face-mask" :style="{height: screenSize.height + 'px'}">
    <template v-if="showVC">
      <video id="video" ref="refVideo" :width="screenSize.width" :height="screenSize.height" preload autoplay loop muted></video>
      <canvas ref="refCanvas" class="canvas1"></canvas>
      <canvas ref="drawCanvas" class="drawCanvas" :width="screenSize.width" :height="screenSize.height" :style="{opacity: 0}"></canvas>
    </template>

    <div v-if="scanTip" class="tips">{{scanTip}}</div>
    
    <img v-if="!showVC" class="img" :src="imgUrl" alt="">
  </div>
</template>

<script>
import * as faceapi from 'face-api.js'
const modelPath = '/models/'

export default {
  data() {
    return {
      scanTip: '准备中...',
      flag: false,
      imgUrl: '',
      screenSize: {width: 375, height: 667},
      showVC: true,
      videoStreamEnd: false
    }
  },
  beforeMount() {
    this.setupFaceApi()
  },
  mounted() {
      this.screenSize = {
      width: window.screen.width,
      height: window.screen.height
    }
    this.imgUrl = ''
    this.run()
  },
  methods: {
    run() {
      this.getUserMedia({ video: {}}, this.success, this.error)
    },
    async setupFaceApi() {
      await faceapi.nets.ssdMobilenetv1.load(modelPath);
      await faceapi.nets.ageGenderNet.load(modelPath);
      await faceapi.nets.faceLandmark68Net.load(modelPath);
      await faceapi.nets.faceRecognitionNet.load(modelPath);
      await faceapi.nets.faceExpressionNet.load(modelPath);
    },
    getUserMedia(constrains, success, error) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        //最新标准API
        navigator.mediaDevices.getUserMedia(constrains).then(success).catch(error);
      } else if (navigator.webkitGetUserMedia) {
        //webkit内核浏览器
        navigator.webkitGetUserMedia(constrains).then(success).catch(error);
      } else if (navigator.mozGetUserMedia) {
        //Firefox浏览器
        navigator.mozGetUserMedia(constrains).then(success).catch(error);
      } else if (navigator.getUserMedia) {
        //旧版API
        navigator.getUserMedia(constrains).then(success).catch(error);
      } else {
        this.scanTip = "你的浏览器不支持访问用户媒体设备"
      }
    },
    success(stream) {
      const URL = window.URL || window.webkitURL
      if ("srcObject" in this.$refs.refVideo) {
        this.$refs.refVideo.srcObject = stream
      } else {
        this.$refs.refVideo.src = URL.createObjectURL(stream)
      }
      this.$refs.refVideo.onloadedmetadata = () => {
        this.$refs.refVideo.play()
        this.videoStreamEnd = true
        this.initTracker()
      }
    },
    error(err) {
      console.log(err)
    },
    async initTracker() {
      if(this.videoStreamEnd) {
        this.scanTip = '识别中...'
      }
      const options = new faceapi.SsdMobilenetv1Options({minConfidence: 0.5})
      const result = await faceapi.detectSingleFace(this.$refs.refVideo, options).withFaceLandmarks()
      console.log('result', result)
      if (result) {
        const dims = faceapi.matchDimensions(this.$refs.refCanvas, this.$refs.refVideo, true)
        const resizedResult = faceapi.resizeResults(result, dims)

        faceapi.draw.drawDetections(this.$refs.refCanvas, resizedResult)
        faceapi.draw.drawFaceLandmarks(this.$refs.refCanvas, resizedResult)

        this.scanTip = '检测成功，正在拍照，请保持不动2秒'
        this.$refs.refVideo.pause()
        const timer = setTimeout(() => {
          this.tackPhoto()
          clearTimeout(timer)
        }, 2000);
      } else {
        this.initTracker()
      }
      // setTimeout(() => this.initTracker())
    },
    // 拍照
    tackPhoto() {
      const context = this.$refs.drawCanvas.getContext("2d")
      context.drawImage(this.$refs.refVideo, 0, 0, this.screenSize.width, this.screenSize.height)
      // 保存为base64格式
      this.imgUrl = this.saveAsPNG(this.$refs.drawCanvas)
      this.showVC = false
      this.close()
    },
    // 保存为png,base64格式图片
    saveAsPNG(c) {
      return c.toDataURL('image/png', 1)
    },
    // 关闭并清理资源
    close() {
      console.log('end')
      this.scanTip = ''
      this.videoStreamEnd = false
      this.$refs.refVideo.pause()
    }
  }
}
</script>

<style lang="less" scoped>
.face-mask{
  width: 100%;
  height: 600px;
  position: relative;
  background: #eee;
  overflow: hidden;
}

.window{
  width: 300px;
  height: 300px;
  border-radius: 50%;
  position: absolute;
  left: 50%;
  top: 50%;
  margin-left: -150px;
  margin-top: -150px;
  background: #fff;
}

.tips{
  width: 100%;
  text-align: center;
  position: fixed;
  left: 0;
  top: 30px;
  font-size: 14px;
  color: #000;
  z-index: 5;
}

.face-mask video, .face-mask .drawCanvas {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  box-sizing: border-box;
}

.face-mask .canvas1{
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
}
.face-mask .drawCanvas {
  z-index: 4;
}

.img{
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}
</style>