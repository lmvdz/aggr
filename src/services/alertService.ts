import store from '@/store'
import { getApiUrl, handleFetchError } from '@/utils/helpers'
import aggregatorService from './aggregatorService'
import dialogService from './dialogService'
import { formatMarketIndicatorValue } from './productsService'
import workspacesService from './workspacesService'

interface AlertResponse {
  error?: string
  markets?: string[]
  alert?: any
  valueOffset?: number
}

export interface MarketAlerts {
  market: string
  alerts: MarketAlert[]
}

export interface MarketAlert {
  triggerValue: number
  indicator: string
  market: string
  message?: string
  active?: boolean
  timestamp?: number
  triggered?: boolean
}

export interface AlertEvent {
  type: AlertEventType
  triggerValue: number
  market: string
  indicator: string
  message?: string
  timestamp?: number
  newTriggerValue?: number
}

export enum AlertEventType {
  CREATED,
  ACTIVATED,
  DELETED,
  STATUS,
  DEACTIVATED,
  TRIGGERED,
  UPDATED
}

class AlertService {
  alerts: {
    [market: string]: MarketAlert[]
  } = {}

  private publicVapidKey = process.env.VUE_APP_PUBLIC_VAPID_KEY
  private pushSubscription: PushSubscription
  private url: string
  private _promiseOfSync: Promise<void>

  constructor() {
    this.url = getApiUrl('alert')
  }

  formatPrice(price) {
    return +price.toFixed(8)
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Query database alerts for given markets
   * Wait for sync to complete before query
   * @param market
   * @returns
   */
  async getAlerts(market) {
    if (this.alerts[market]) {
      return this.alerts[market]
    }

    if (this._promiseOfSync) {
      await this._promiseOfSync
    }

    const alerts = await workspacesService.getAlerts(market)

    this.alerts[market] = alerts

    return this.alerts[market]
  }

  async getAlert(
    market,
    indicator,
    triggerValue
  ): Promise<[MarketAlert, number]> {
    if (!this.alerts[market]) {
      await this.getAlerts(market)
    }

    const alertIndex = this.alerts[market].findIndex(
      (alert: MarketAlert) =>
        alert.triggerValue === triggerValue && alert.indicator === indicator
    )
    const alert = this.alerts[market][alertIndex]
    return [alert, alertIndex]
  }

  /**
   * Update alerts triggered status using pending notifications
   */
  async syncTriggeredAlerts() {
    this._promiseOfSync = new Promise<void>(resolve => {
      // recover recent triggers
      navigator.serviceWorker.ready.then(async registration => {
        await this.markAlertsAsTriggered(
          (
            await registration.getNotifications()
          ).map(notification => ({
            triggerValue: notification.data.triggerValue,
            direction: notification.data.direction,
            message: notification.data.message,
            market: notification.data.market,
            indicator: notification.data.indicator
          }))
        )

        resolve()
      })
    }).then(() => {
      // subscribe to triggers
      navigator.serviceWorker.addEventListener('message', event => {
        this.markAlertsAsTriggered([event.data])

        aggregatorService.emit('alert', {
          ...event.data,
          type: AlertEventType.TRIGGERED
        })
      })
    })
  }

  async markAlertsAsTriggered(
    alerts: { triggerValue: number; market: string; indicator: string }[]
  ) {
    const markets = alerts.reduce(
      (acc, { triggerValue, market, indicator }) => {
        if (!market || typeof triggerValue !== 'number') {
          return acc
        }

        if (!acc[market]) {
          acc[market] = {}
        }

        acc[market][indicator].push(triggerValue)

        return acc
      },
      {}
    )

    for (const market in markets) {
      for (const indicator in markets[market]) {
        if (!this.alerts[market]) {
          this.alerts[market] = await workspacesService.getAlerts(market)
        }

        if (
          !this.alerts[market].filter(a => a.indicator === indicator).length
        ) {
          continue
        }

        let mutation = false

        for (const triggerValue of markets[market]) {
          const alert = this.alerts[market].find(
            a => a.triggerValue === triggerValue && a.indicator === indicator
          )

          if (alert && !alert.triggered) {
            alert.triggered = true
            mutation = true
          } else {
            console.error(
              `[alertService] couldn't set alert as triggered for ${market} on ${indicator} (alert not found @${triggerValue})`
            )
          }
        }

        if (mutation) {
          await workspacesService.saveAlerts({
            market,
            alerts: this.alerts[market]
          })
        }
      }
    }
  }

  async getPushSubscription() {
    if (!this.publicVapidKey) {
      return
    }

    if (this.pushSubscription) {
      return this.pushSubscription
    }

    if ('serviceWorker' in navigator) {
      const register = await navigator.serviceWorker.getRegistration('sw.js')

      this.pushSubscription = JSON.parse(
        JSON.stringify(
          await register.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              this.publicVapidKey
            )
          })
        )
      )
    }

    return this.pushSubscription
  }

  async subscribe(
    market: string,
    indicator: string,
    triggerValue: number,
    currentValue?: number,
    message?: string
  ) {
    const data = await this.toggleAlert(
      market,
      indicator,
      triggerValue,
      currentValue,
      false,
      false,
      message
    )

    if (!data.error) {
      store.dispatch('app/showNotice', {
        title: `Added ${market} ${this.getNoticeLabel(
          market,
          indicator,
          triggerValue,
          data.valueOffset
        )}`,
        type: 'success'
      })
    }

    return data
  }

  async unsubscribe(market: string, indicator: string, triggerValue: number) {
    const data = await this.toggleAlert(
      market,
      indicator,
      triggerValue,
      null,
      true
    )

    if (data.alert) {
      const { alert } = data

      store.dispatch('app/showNotice', {
        title: `Removed ${alert.market} ${
          alert.indicator
        } ${this.getNoticeLabel(market, indicator, triggerValue)}`,
        type: 'success'
      })
    }

    return data
  }

  getValue(market, indicator): Promise<number> {
    return new Promise(resolve => {
      // TODO: get indicator value for market
      aggregatorService.once('prices', marketsStats => {
        const stats = marketsStats[market]

        if (!stats) {
          return resolve(null)
        }

        resolve(stats.price)
      })
    })
  }

  async toggleAlert(
    market: string,
    indicator: string,
    triggerValue: number,
    currentValue?: number,
    unsubscribe?: boolean,
    status?: boolean,
    message?: string
  ): Promise<AlertResponse> {
    const subscription = await this.getPushSubscription()

    if (!subscription) {
      return
    }

    const origin = location.href.replace(/#.*/, '')

    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        ...subscription,
        origin,
        market,
        indicator,
        triggerValue,
        currentValue,
        unsubscribe,
        message,
        status
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error)
        }

        return data
      })
      .catch(err => {
        handleFetchError(err)

        return { error: err.message }
      })
  }

  async createAlert(
    createdAlert: MarketAlert,
    referenceValue?: number,
    askMessage?: boolean
  ) {
    if (!this.alerts[createdAlert.market]) {
      await this.getAlerts(createdAlert.market)
    }

    aggregatorService.emit('alert', {
      triggerValue: createdAlert.triggerValue,
      market: createdAlert.market,
      indicator: createdAlert.indicator,
      timestamp: createdAlert.timestamp,
      type: AlertEventType.CREATED
    })

    if (askMessage) {
      createdAlert.message = await dialogService.openAsPromise(
        (
          await import('@/components/alerts/CreateAlertDialog.vue')
        ).default,
        {
          triggerValue: +formatMarketIndicatorValue(
            createdAlert.triggerValue,
            createdAlert.market,
            createdAlert.indicator
          )
        }
      )

      if (typeof createdAlert.message !== 'string') {
        aggregatorService.emit('alert', {
          triggerValue: createdAlert.triggerValue,
          market: createdAlert.market,
          indicator: createdAlert.indicator,
          type: AlertEventType.DELETED
        })
        return
      }
    }

    this.alerts[createdAlert.market][createdAlert.indicator].push(createdAlert)

    await this.subscribe(
      createdAlert.market,
      createdAlert.indicator,
      createdAlert.triggerValue,
      referenceValue,
      createdAlert.message
    )
      .then(data => {
        createdAlert.active = !data.error
      })
      .catch(err => {
        store.dispatch('app/showNotice', {
          id: 'alert-registration-failure',
          title: `${err.message}\nYou need to make sure your browser is set to allow push notifications.`,
          type: 'error'
        })
      })

    if (createdAlert.active) {
      aggregatorService.emit('alert', {
        triggerValue: createdAlert.triggerValue,
        market: createdAlert.market,
        indicator: createdAlert.indicator,
        timestamp: createdAlert.timestamp,
        message: createdAlert.message,
        type: AlertEventType.ACTIVATED
      })
    }

    workspacesService.saveAlerts({
      market: createdAlert.market,
      alerts: this.alerts[createdAlert.market]
    })
  }

  async moveAlert(
    market: string,
    indicator: string,
    triggerValue: number,
    newAlert: MarketAlert,
    currentValue: number
  ): Promise<void> {
    const subscription = await this.getPushSubscription()

    if (subscription) {
      const origin = location.href

      newAlert.triggered = false

      newAlert.active = await fetch(this.url, {
        method: 'POST',
        body: JSON.stringify({
          ...subscription,
          origin,
          market,
          indicator,
          triggerValue,
          newTriggerValue: newAlert.triggerValue,
          message: newAlert.message,
          currentValue
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(json => {
          if (json.error) {
            throw new Error(json.error)
          }

          store.dispatch('app/showNotice', {
            title: `Moved ${market} ${this.getNoticeLabel(
              market,
              indicator,
              triggerValue,
              json.valueOffset
            )}`,
            type: 'success'
          })

          return true
        })
        .catch(err => {
          handleFetchError(err)

          return false
        })
    }

    const [alert, _alertIndex] = await this.getAlert(
      market,
      indicator,
      triggerValue
    )
    if (alert) {
      this.alerts[market][_alertIndex] = {
        ...alert,
        ...newAlert
      }
      await workspacesService.saveAlerts({
        market: market,
        alerts: this.alerts[market]
      })
    } else {
      console.error(
        `[alertService] couldn't update alert (alert not found @${triggerValue})`,
        this.alerts[market]
      )
    }

    aggregatorService.emit('alert', {
      triggerValue,
      market,
      newTriggerValue: newAlert.triggerValue,
      type: AlertEventType.UPDATED
    })

    if (newAlert.active) {
      aggregatorService.emit('alert', {
        triggerValue: newAlert.triggerValue,
        market,
        message: newAlert.message,
        type: AlertEventType.ACTIVATED
      })
    }
  }

  async deactivateAlert({
    market,
    indicator,
    triggerValue
  }: {
    market: string
    indicator: string
    triggerValue: number
  }) {
    const [alert] = await this.getAlert(market, indicator, triggerValue)

    if (alert) {
      alert.active = false

      await workspacesService.saveAlerts({
        market,
        alerts: this.alerts[market]
      })
    }

    aggregatorService.emit('alert', {
      triggerValue,
      market,
      indicator,
      type: AlertEventType.DEACTIVATED
    })
  }

  async removeAlert(removedAlert: MarketAlert) {
    aggregatorService.emit('alert', {
      triggerValue: removedAlert.triggerValue,
      market: removedAlert.market,
      indicator: removedAlert.indicator,
      type: AlertEventType.DELETED
    })

    if (!removedAlert.triggered) {
      try {
        await this.unsubscribe(
          removedAlert.market,
          removedAlert.indicator,
          removedAlert.triggerValue
        )
      } catch (err) {
        if (alert && removedAlert.active) {
          store.dispatch('app/showNotice', {
            id: 'alert-registration-failure',
            title: `${err.message}\nYou need to make sure your browser is set to allow push notifications.`,
            type: 'error'
          })
        }
      }
    }

    if (!this.alerts[removedAlert.market]) {
      await this.getAlerts(removedAlert.market)
    }

    if (this.alerts[removedAlert.market][removedAlert.indicator].length) {
      const removedAlertIndex = this.alerts[removedAlert.market][
        removedAlert.indicator
      ].findIndex(alert => alert.triggerValue === removedAlert.triggerValue)

      if (removedAlertIndex !== -1) {
        this.alerts[removedAlert.market][removedAlert.indicator].splice(
          removedAlertIndex,
          1
        )

        await workspacesService.saveAlerts({
          market: removedAlert.market,
          alerts: this.alerts[removedAlert.market]
        })
      } else {
        console.error(
          `[alertService] couldn't splice alert (no alerts for ${removedAlert.indicator} with triggerValue @${removedAlert.triggerValue})`,
          this.alerts[removedAlert.market]
        )
      }
    } else {
      console.error(
        `[alertService] couldn't update alert (no alerts data for market-indicator ${removedAlert.market}-${removedAlert.indicator})`
      )
    }
  }

  getNoticeLabel(
    market: string,
    indicator: string,
    value: number,
    offset?: number
  ) {
    const valueLabel = `@${formatMarketIndicatorValue(
      value,
      indicator,
      market
    )}`

    let offsetLabel = ''

    if (offset) {
      const percent = Math.abs((1 - (value + offset) / value) * -1 * 100)
      offsetLabel = ` (± ${formatMarketIndicatorValue(
        value,
        indicator,
        market
      )}${percent > 0.5 ? ` ⚠️` : ''})`
    }

    return valueLabel + offsetLabel
  }
}

export default new AlertService()
