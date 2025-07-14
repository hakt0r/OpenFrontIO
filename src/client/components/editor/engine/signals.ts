export class Signal<T> {
  private _value: T
  private listeners = new Set<() => void>()

  constructor(initial: T) {
    this._value = initial
  }

  get value(): T {
    return this._value
  }

  set value(newVal: T) {
    if (this._value !== newVal) {
      this._value = newVal
      this.listeners.forEach((fn) => fn())
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
