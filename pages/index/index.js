const app = getApp()

Page({
  data: {
    mode: 'focus',
    timeLeft: 25 * 60,
    timeDisplay: '25:00',
    isRunning: false,
    pomodoroCount: 0,
    pomodoroDots: [false, false, false, false],
    modeLabel: '专注',
    isBreak: false,
    showSettingsPanel: false,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4
  },

  timer: null,
  startTime: 0,
  expectedEnd: 0,
  audioCtx: null,

  onLoad() {
    const globalData = app.globalData
    this.setData({
      focusMinutes: globalData.focusDuration / 60,
      shortBreakMinutes: globalData.shortBreakDuration / 60,
      longBreakMinutes: globalData.longBreakDuration / 60,
      longBreakInterval: globalData.longBreakInterval
    })
    this.updateDots()
    this.initAudio()
  },

  initAudio() {
    this.audioCtx = wx.createInnerAudioContext()
  },

  playBeep(type) {
    wx.vibrateShort({ type: type === 'focus' ? 'heavy' : 'medium' })
    try {
      wx.showModal({
        title: type === 'focus' ? '🍅 专注完成！' : '⏰ 休息结束！',
        content: type === 'focus' ? '该休息一下了' : '继续加油吧',
        showCancel: false,
        confirmText: '知道了'
      })
    } catch (e) {}
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },

  updateDots() {
    const { pomodoroCount, longBreakInterval, mode } = this.data
    const dots = []
    for (let i = 0; i < longBreakInterval; i++) {
      dots.push(i < (pomodoroCount % longBreakInterval))
    }
    this.setData({ pomodoroDots: dots })
  },

  getDuration(mode) {
    const { focusMinutes, shortBreakMinutes, longBreakMinutes } = this.data
    switch (mode) {
      case 'focus': return focusMinutes * 60
      case 'shortBreak': return shortBreakMinutes * 60
      case 'longBreak': return longBreakMinutes * 60
    }
  },

  getModeLabel(mode) {
    switch (mode) {
      case 'focus': return '专注'
      case 'shortBreak': return '短休息'
      case 'longBreak': return '长休息'
    }
  },

  setFocusMode() {
    this.stopTimer()
    const duration = this.getDuration('focus')
    this.setData({
      mode: 'focus',
      timeLeft: duration,
      timeDisplay: this.formatTime(duration),
      isBreak: false,
      modeLabel: '专注'
    })
  },

  setShortBreakMode() {
    this.stopTimer()
    const duration = this.getDuration('shortBreak')
    this.setData({
      mode: 'shortBreak',
      timeLeft: duration,
      timeDisplay: this.formatTime(duration),
      isBreak: true,
      modeLabel: '短休息'
    })
  },

  setLongBreakMode() {
    this.stopTimer()
    const duration = this.getDuration('longBreak')
    this.setData({
      mode: 'longBreak',
      timeLeft: duration,
      timeDisplay: this.formatTime(duration),
      isBreak: true,
      modeLabel: '长休息'
    })
  },

  toggleTimer() {
    if (this.data.isRunning) {
      this.stopTimer()
    } else {
      this.startTimer()
    }
  },

  startTimer() {
    if (this.data.isRunning) return

    this.startTime = Date.now()
    this.expectedEnd = Date.now() + this.data.timeLeft * 1000

    this.setData({ isRunning: true })

    this.timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, this.expectedEnd - now)

      if (remaining <= 0) {
        this.stopTimer()
        this.handleComplete()
      } else {
        this.setData({
          timeLeft: Math.ceil(remaining / 1000),
          timeDisplay: this.formatTime(Math.ceil(remaining / 1000))
        })
      }
    }, 50)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.setData({ isRunning: false })
  },

  resetTimer() {
    this.stopTimer()
    const duration = this.getDuration(this.data.mode)
    this.setData({
      timeLeft: duration,
      timeDisplay: this.formatTime(duration)
    })
  },

  skipToNext() {
    this.stopTimer()
    if (this.data.mode === 'focus') {
      const newCount = this.data.pomodoroCount + 1
      const isLongBreak = newCount % this.data.longBreakInterval === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      const duration = this.getDuration(nextMode)
      this.setData({
        mode: nextMode,
        timeLeft: duration,
        timeDisplay: this.formatTime(duration),
        isBreak: true,
        modeLabel: this.getModeLabel(nextMode),
        pomodoroCount: newCount
      })
      this.updateDots()
    } else {
      const duration = this.getDuration('focus')
      this.setData({
        mode: 'focus',
        timeLeft: duration,
        timeDisplay: this.formatTime(duration),
        isBreak: false,
        modeLabel: '专注'
      })
    }
  },

  handleComplete() {
    if (this.data.mode === 'focus') {
      this.playBeep('focus')
      const newCount = this.data.pomodoroCount + 1
      const isLongBreak = newCount % this.data.longBreakInterval === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      const duration = this.getDuration(nextMode)
      this.setData({
        mode: nextMode,
        timeLeft: duration,
        timeDisplay: this.formatTime(duration),
        isBreak: true,
        modeLabel: this.getModeLabel(nextMode),
        pomodoroCount: newCount
      })
      this.updateDots()
    } else {
      this.playBeep('break')
      const duration = this.getDuration('focus')
      this.setData({
        mode: 'focus',
        timeLeft: duration,
        timeDisplay: this.formatTime(duration),
        isBreak: false,
        modeLabel: '专注'
      })
    }
  },

  vibratePattern(pattern) {
    pattern.forEach((v, i) => {
      setTimeout(() => {
        wx.vibrateShort({ type: 'medium' })
      }, i * v)
    })
  },

  playSound() {
    try {
      wx.createSelectorQuery()
    } catch (e) {}
  },

  showSettings() {
    this.setData({ showSettingsPanel: true })
  },

  hideSettings() {
    this.setData({ showSettingsPanel: false })
  },

  stopPropagation() {
  },

  onFocusDurationChange(e) {
    const minutes = e.detail.value
    this.setData({ focusMinutes: minutes })
    app.globalData.focusDuration = minutes * 60
    if (this.data.mode === 'focus' && !this.data.isRunning) {
      this.setData({
        timeLeft: minutes * 60,
        timeDisplay: this.formatTime(minutes * 60)
      })
    }
  },

  onShortBreakDurationChange(e) {
    const minutes = e.detail.value
    this.setData({ shortBreakMinutes: minutes })
    app.globalData.shortBreakDuration = minutes * 60
    if (this.data.mode === 'shortBreak' && !this.data.isRunning) {
      this.setData({
        timeLeft: minutes * 60,
        timeDisplay: this.formatTime(minutes * 60)
      })
    }
  },

  onLongBreakDurationChange(e) {
    const minutes = e.detail.value
    this.setData({ longBreakMinutes: minutes })
    app.globalData.longBreakDuration = minutes * 60
    if (this.data.mode === 'longBreak' && !this.data.isRunning) {
      this.setData({
        timeLeft: minutes * 60,
        timeDisplay: this.formatTime(minutes * 60)
      })
    }
  },

  onLongBreakIntervalChange(e) {
    const value = e.detail.value
    this.setData({ longBreakInterval: value })
    app.globalData.longBreakInterval = value
    this.updateDots()
  }
})
