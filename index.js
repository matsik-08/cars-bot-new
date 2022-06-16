const puppeteer = require('puppeteer');
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

    await this.setupBrowser()
    this.setupTelegram()
    await this.checkFile()
  }

  async setupBrowser() {
    this.browser = await puppeteer.launch()
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
      const page = await this.browser.newPage()
      await page.goto(Tracker.URL)
      const url = await page.evaluate((className) => {
        const selector = document.querySelector(`.${className}`)
        return selector.getAttribute('href')
      }, Tracker.CLASSNAME)

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

    } catch (err) {
      console.log('Error appeared', err)
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
