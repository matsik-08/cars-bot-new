const Nightmare = require('nightmare')
const { Telegram } = require('telegraf')

const configs = require('./config.json')

class Tracker {
  static TIMEOUT_IN_MIN = configs.TIMEOUT_IN_MIN
  static URL = configs.URL
  static CLASSNAME = configs.CLASSNAME
  static TELEGRAM_KEY = configs.TELEGRAM_KEY
  static TELEGRAM_IDS = configs.TELEGRAM_IDS

  constructor() {
    this.browser = null
    this.carsFileUrl = null
  }

  async start() {
    console.log('Start tracking...')

    this.setupBrowser()
    this.setupTelegram()
    await this.checkFile()
  }

  setupBrowser() {
    this.browser = Nightmare({
      waitTimeout: 10000,
    })
  }

  setupTelegram() {
    this.telegram = new Telegram(Tracker.TELEGRAM_KEY)
    this.sendNotification('Start tracking...')
  }

  changeURL(url) {
    this.carsFileUrl = url
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async checkFile() {
    try {
      this.browser
        .goto(Tracker.URL)
        .refresh()
        .wait(`.${Tracker.CLASSNAME}`)
        .evaluate((className) => {
          const selector = document.querySelector(`.${className}`)
          return selector.getAttribute('href')
        }, Tracker.CLASSNAME)
        .then((url) => {
          if (!this.carsFileUrl) {
            console.log('File url was checked first time')

            this.carsFileUrl = url
          } else if (this.carsFileUrl !== url) {
            const message = `File url was updated. Old url: ${this.carsFileUrl}. New url: ${url}`

            console.log(message)

            this.sendNotification(message)
            this.changeURL(url)
          } else {
            console.log(`File is still the same. URL: ${this.carsFileUrl}`)
          }
        })
        .catch((err) => {
          console.log('Error appeared', err)
          this.sendNotification(`Error appeared: ${err}`)
        })

    } catch (err) {
      console.log('Error appeared', err)
      this.sendNotification(`Error appeared: ${err}`)
    } finally {
      await this.sleep(Tracker.TIMEOUT_IN_MIN * 60 * 1000)
      this.checkFile()
    }
  }

  async sendNotification(message) {
    console.log('Sending notification...')

    for (let destination of Tracker.TELEGRAM_IDS) {
      try {
        await this.telegram.sendMessage(destination, message)
      } catch (err) {
        console.log('Error when sending message to telegram', err)
        await this.sleep(10000)
        await this.sendNotification(message)
      }
    }
  }

}

const tracker = new Tracker()
tracker.start()
