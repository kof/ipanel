!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.iPanel=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

var styles = [
  'webkitTransform',
  'MozTransform',
  'msTransform',
  'OTransform',
  'transform'
];

var el = document.createElement('p');
var style;

for (var i = 0; i < styles.length; i++) {
  style = styles[i];
  if (null != el.style[style]) {
    module.exports = style;
    break;
  }
}

},{}],2:[function(_dereq_,module,exports){
'use strict'

var transform = _dereq_('transform-property'),
    vendor = transform.substr(0, transform.length - 9),
    $ = jQuery

function iPanel($container, options) {
    this.options = $.extend({}, iPanel.defaults, options)
    this.elements = {container: $container}
    this._left = 0
    this._maxLeft = 0
    this._moveStartTime = 0
    this._dragging = false
    this._animating = false
}

iPanel.defaults = {
    duration: 300,
    // Easing functions https://github.com/yields/css-ease
    easing: 'cubic-bezier(0.190, 1.000, 0.220, 1.000)',
    swipeDurationThreshold: 1000,
    handle: '.ipanel-handle',
    master: null,
    hidden: false,
    hideDirection: 'right',
    slave: 'prev',
    slaveAnimation: true,
    slaveDisposition: 100,
    static: true
}

iPanel.touch = 'ontouchend' in document

module.exports = iPanel

iPanel.prototype.init = function() {
    var o = this.options

    this.elements.container
        .addClass('ipanel' + (o.hidden ? ' ipanel-master-hidden' : ''))
        .on(iPanel.touch ? 'touchend' : 'mouseup', o.handle, $.proxy(this._onTouchEnd, this))
        .on('movestart', o.handle, $.proxy(this._onMoveStart, this))
        .on('move', o.handle, $.proxy(this._onMove, this))
        .on('moveend', o.handle, $.proxy(this._onMoveEnd, this))

    if (o.static) {
        this._setElements(this.elements.container)
        this.refresh()
    }
}

iPanel.prototype.show = function(duration, callback) {
    var self = this

    if (typeof duration == 'function') {
        callback = duration
        duration = null
    }

    if (this._animating || !this.options.hidden) {
        setTimeout(callback)
        return this
    }

    this._trigger('beforeshow')

    // Let something get rendered if needed.
    requestAnimationFrame(function() {
        self._show(duration, callback)
    })

    return this
}

iPanel.prototype._show = function(duration, callback) {
    var self = this

    this.options.hidden = false

    this.move(0, duration, function() {
        self._setMasterHidden(false)
        if (callback) callback()
        self._trigger('show')
    })

    return this
}

iPanel.prototype.hide = function(duration, callback) {
    var self = this

    if (typeof duration == 'function') {
        callback = duration
        duration = null
    }

    if (this._animating || this.options.hidden) {
        setTimeout(callback)
        return this
    }

    this._trigger('beforehide')

    // Let something get rendered if needed.
    requestAnimationFrame(function() {
        self._hide(duration, callback)
    })

    return this
}

iPanel.prototype._hide = function(duration, callback) {
    var self = this

    this.options.hidden = true

    self.move(self._getMaxLeft(), duration, function() {
        self._setMasterHidden(true)
        if (callback) callback()
        self._trigger('hide')
    })

    return this
}

iPanel.prototype.move = function(left, duration, callback) {
    var self = this,
        o = this.options

    if (typeof duration == 'function') {
        callback = duration
        duration = o.duration
    }

    this._left = left

    this._translate(this.elements.master, left, duration, function() {
        self._animating = false
        if (callback) callback()
    })

    if (o.slaveAnimation && this.elements.slave.length && !this._dragging) {
        this._slaveX = left > 0 ? 0 : -o.slaveDisposition
        this._translate(this.elements.slave, this._slaveX, duration)
    }

    return this
}

iPanel.prototype.option = function(name, value) {
    var setter

    // Its a getter.
    if (value == null) {
        return this.options[name]
    }

    this.options[name] = value
    setter = '_set' + name.charAt(0).toUpperCase() + name.substr(1)
    if (this[setter]) this[setter](value)

    return this
}

iPanel.prototype.refresh = function() {
    var maxLeft = this._getMaxLeft(true)

    this.move(this.options.hidden ? maxLeft : 0, 0)

    return this
}

iPanel.prototype.animating = function() {
    return this._animating
}

iPanel.prototype._translate = function($el, x, duration, callback) {
    var o = this.options

    duration != null || (duration = o.duration)

    if (duration) {
        this._transit($el[0], duration, o.easing, callback)
    } else {
        setTimeout(callback)
    }

    this._transform($el[0], 'translateX(' + x + 'px)')

    return this
}

iPanel.prototype._transit = function(el, duration, easing, callback) {
    if (callback) {
        el.addEventListener(vendor + 'TransitionEnd', function onTransitionEnd() {
            el.removeEventListener(vendor + 'TransitionEnd', onTransitionEnd)
            if (callback) callback()
            callback = null
        }, false)

        // For the case we don't get the event.
        setTimeout(function() {
            if (callback) callback()
            callback = null
        }, duration + 20)
    }

    el.style[vendor + 'Transition'] = duration + 'ms ' + (easing || '')

    return this
}

iPanel.prototype._transform = function(el, value) {
    el.style[transform] = value

    return this
}

iPanel.prototype._setMasterHidden = function(value) {
    this.elements.container.toggleClass('ipanel-master-hidden', value)

    return this
}

iPanel.prototype._setElements = function($item) {
    var o = this.options

    if (this.elements.item && $item[0] === this.elements.item[0]) return this

    this._resetTransform()
    this.elements.item = $item
    this.elements.master = $item.find(o.master)

    if (o.slave) {
        if (o.slave == 'prev' || o.slave == 'next') {
            this.elements.slave = this.elements.master[o.slave]()
        } else if (typeof o.slave == 'string') {
            this.elements.slave = $item.find(o.slave)
        } else {
            this.elements.slave = $(o.slave)
        }
    }

    return this
}

iPanel.prototype._resetTransform = function() {
    if (this.elements.master) this._transform(this.elements.master[0], '')
}

iPanel.prototype._getMaxLeft = function(force) {
    if (this._maxLeft && !force) return this._maxLeft
    this._maxLeft = this.elements.slave.outerWidth()
    if (this.options.hideDirection == 'left') this._maxLeft *= -1

    return this._maxLeft
}

iPanel.prototype._trigger = function(event) {
    this.elements.master.trigger(event + '.ipanel')

    return this
}

iPanel.prototype._isHidden = function() {
    if (this.options.hideDirection == 'right') {
        return this._left > 0
    }

    return this._left < 0
}

iPanel.prototype._onTouchEnd = function(e) {
    if (this._dragging || this._animating) return
    if (!this.options.static) this._setElements($(e.target).parent())
    e.preventDefault()
    this[this._isHidden() ? 'show' : 'hide']()
}

iPanel.prototype._onMoveStart = function(e) {
    this._dragging = true
    this._moveStartTime = Date.now()
    if (!this.options.static) this._setElements($(e.target).parent())
    this._trigger('before' + (this._isHidden() ? 'show' : 'hide'))
}

iPanel.prototype._onMove = function(e) {
    var self = this,
        dist

    // No movement
    if (!e.deltaX) return

    // Hide direction - right.
    if (this._getMaxLeft() > 0) {
        // Move to the right, however already right.
        if (e.deltaX > 0 && this._left >= this._getMaxLeft()) return
        // Move to the left, however already left.
        if (e.deltaX < 0 && this._left <= 0) return
    // Hide direction - left.
    } else {
        // Move to the right, however already right.
        if (e.deltaX > 0 && this._left >= 0) return
        // Move to the left, however already left
        if (e.deltaX < 0 && this._left <= this._getMaxLeft()) return
    }
    this.move(this._left + e.deltaX, 0)
}

iPanel.prototype._onMoveEnd = function(e) {
    var self = this,
        isSwipe = Date.now() - this._moveStartTime < this.options.swipeDurationThreshold

    if (isSwipe) {
        this._dragging = false
        if (this.options.hideDirection == 'right') {
            e.deltaX > 0 ? this._hide() : this._show()
        } else {
            e.deltaX < 0 ? this._hide() : this._show()
        }
    } else {
        this._dragging = false
        if (this.options.hideDirection == 'right') {
            this._left >= this._getMaxLeft() / 2 ? this._hide() : this._show()
        } else {
            this._left < this._getMaxLeft() / 2 ? this._hide() : this._show()
        }
    }
}


},{"transform-property":1}]},{},[2])
(2)
});