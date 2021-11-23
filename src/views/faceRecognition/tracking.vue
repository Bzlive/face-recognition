<template>
  <div class="face-mask" :style="{height: screenSize.height + 'px'}">
    <template v-if="showVC">
      <video id="video" ref="refVideo" :width="screenSize.width" :height="screenSize.height" preload autoplay loop muted></video>
      <canvas ref="refCanvas" :width="screenSize.width" :height="screenSize.height" :style="{opacity: 0}"></canvas>
    </template>

    <div v-if="scanTip" class="tips">{{scanTip}}</div>
    <!-- <div v-if="!imgUrl" class="window"></div> -->

    <template v-if="profile && profile.length">
      <div class="rect" 
        v-for="(item, index) in profile" 
        :key="index" 
        :style="{ width: item.width + 'px', height: item.height + 'px', left: item.left + 'px', top: item.top + 'px'}">
      </div>
    </template>
    
    <img v-if="!showVC" class="img" :src="imgUrl" alt="">
  </div>
</template>

<script>
import '../../assets/js/tracking-min'
import '../../assets/js/face-min'
const tracking = window.tracking || {}

export default {
  data() {
    return {
      scanTip: '准备中...',
      flag: false,
      imgUrl: '',
      removePhotoID: '',
      profile: [],
      screenSize: {width: 375, height: 667},
      trackTask: null,
      tracker: null,
      streamIns: null,
      showVC: true,
      videoStreamEnd: false
    }
  },
  mounted() {
    this.screenSize = {
      width: window.screen.width,
      height: window.screen.height
    }
    this.imgUrl = ''
    this.run()
    this.initTracker()
  },
  methods: {
    run() {
      this.getUserMedia({ video: {}}, this.success, this.error)
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
      this.streamIns = stream
      const URL = window.URL || window.webkitURL
      if ("srcObject" in this.$refs.refVideo) {
        this.$refs.refVideo.srcObject = stream
      } else {
        this.$refs.refVideo.src = URL.createObjectURL(stream)
      }
      this.$refs.refVideo.onloadedmetadata = (e) => {
        console.log('视频了', e)
        this.$refs.refVideo.play()
        this.videoStreamEnd = true
      }
    },
    error(err) {
      console.log(err)
    },
    initTracker() {
      if (this.videoStreamEnd) {
        this.scanTip = '人脸识别中...'
      }
      const tracker = new tracking.ObjectTracker('face')     // tracker实例
      tracker.setInitialScale(4)
      tracker.setStepSize(2)
      tracker.setEdgesDensity(0.1)       // 设置步长
      tracker.on('track', this.handleTracked)            // 绑定监听方法
      this.tracker = tracker
      try {
        this.trackTask = tracking.track('#video', tracker, {camera: true})      // 开始追踪
      } catch (err) {
        console.log(err)
        this.scanTip = "访问用户媒体失败，请重试"
      }
    },
    // 追踪事件
    handleTracked(e) {
      console.log('result', e, this.flag)
      if(!this.flag && this.videoStreamEnd) {
        this.flag = true
        if (e.data.length === 0) {
          this.scanTip = '未检测到人脸'
          this.flag = false
        } else if (e.data.length === 1) {
          this.profile = []
          e.data.forEach(this.plot)

          this.scanTip = '检测成功，正在拍照，请保持不动2秒'
          this.removePhotoID = setTimeout(() => {
            this.tackPhoto()
          }, 2000)
        } else {
          this.scanTip = '只可一人进行人脸识别'
          this.flag = false
        }
      }
    },
    // 绘制跟踪框
    plot({x, y, width: w, height: h}) {
      // 创建框对象
      this.profile.push({ width: w, height: h, left: x, top: y })
    },
    // 拍照
    tackPhoto() {
      const context = this.$refs.refCanvas.getContext("2d")
      context.drawImage(this.$refs.refVideo, 0, 0, this.screenSize.width, this.screenSize.height)
      // 保存为base64格式
      this.imgUrl = this.saveAsPNG(this.$refs.refCanvas)
      this.showVC = false
      console.log('拍照成功', this.imgUrl)
      this.close()
    },
    // 保存为png,base64格式图片
    saveAsPNG(c) {
      return c.toDataURL('image/png', 1)
    },
    // 关闭并清理资源
    close() {
      this.flag = false
      this.tracker && this.tracker.once('track', this.handleTracked)
      this.trackTask.once('track', this.handleTracked)
      this.tracker && this.tracker.removeListener('track', this.handleTracked)
      if (this.streamIns) {
        this.streamIns.enabled = false
        this.$refs.refVideo.srcObject = null
        this.streamIns.getTracks().forEach(track => track.stop())
        this.streamIns.getVideoTracks().forEach(track => track.stop())
      }
      this.streamIns = null
      this.trackTask.stop()
      this.profile = []
      this.scanTip = ''
      this.trackTask = null
      this.tracker = null
      this.videoStreamEnd = false
      clearTimeout(this.removePhotoID)
      console.log('end')
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
  z-index: 3;
}

.face-mask video, .face-mask canvas {
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

.face-mask canvas{
  border: 1px solid blue;
  z-index: 3;
}

.face-mask .rect {
  border: 2px solid #0aeb08;
  position: fixed;
  z-index: 3;
}

.img{
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}
</style>