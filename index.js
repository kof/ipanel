/**
 * Mobile slide panels.
 *
 * @copyright Oleg Slobodskoi 2014
 * @website https://github.com/kof/ipanel
 * @license MIT
 */

'use strict'

var transform = require('transform-property'),
    vendor = transform.substr(0, transform.length - 9),
    $ = jQuery

/**
 * Panel constructor.
 *
 * @param {jQuery} $container
 * @param {Object} [options] see defaults.
 * @api public
 */
function iPanel($container, options) {
    this.options = $.extend({}, iPanel.defaults, options)
    this.elements = {container: $container}
    this._left = 0
    this._maxLeft = 0
    this._moveStartTime = 0
    this._dragging = false
    this._animating = false
}

/**
 * Default options.
 *
 * @api public
 */
iPanel.defaults = {
    duration: 500,
    // Easing functions https://github.com/yields/css-ease
    easing: 'cubic-bezier(0.190, 1.000, 0.220, 1.000)',
    // If touchend - touchstart < 1000 -> swipe, otherwise - drag.
    swipeDurationThreshold: 1000,
    // Selector/element for the drag/swipe handle.
    handle: '.ipanel-handle',
    // Selector/element of main container.
    master: null,
    // True if master container have to be in hidden state when initialized.
    hidden: false,
    // Direction for swipe/drag to hide the master container.
    hideDirection: 'right',
    // Selector/element for the slave container, which is hidden when master
    // Is shown.
    slave: null,
    // Animate slave container when animating/dragging master (ios like).
    slaveAnimation: true,
    // Max distance to move slave when slaveAnimation is true.
    slaveDisposition: 100,
    // False when master, slave and other elements have to be found on touch.
    // True if they can be found in the main container on init.
    dynamic: false
}

/**
 * Touch support.
 *
 * @type {Boolean}
 */
iPanel.touch = 'ontouchend' in document

module.exports = iPanel

/**
 * Initialize panels.
 *
 * @api private
 */
iPanel.prototype.init = function() {
    var o = this.options

    this.elements.container
        .addClass('ipanel' + (o.hidden ? ' ipanel-master-hidden' : ''))
        .on(iPanel.touch ? 'touchend' : 'mouseup', o.handle, $.proxy(this._onTouchEnd, this))
        .on('movestart', o.handle, $.proxy(this._onMoveStart, this))
        .on('move', o.handle, $.proxy(this._onMove, this))
        .on('moveend', o.handle, $.proxy(this._onMoveEnd, this))

    if (!o.dynamic) {
        this._setElements(this.elements.container)
        this.refresh()
    }
}

/**
 * Show master container.
 *
 * @param {Number} [duration] in ms.
 * @param {Function} [callback] will call back when animation is done.
 * @return {iPanel} this
 * @api public
 */
iPanel.prototype.show = function(duration, callback) {
    var self = this

    if (typeof duration == 'function') {
        callback = duration
        duration = null
    }

    if (this._animating) {
        setTimeout(callback)
        return this
    }

    this._emit('beforeshow')

    // Let something get rendered if needed.
    requestAnimationFrame(function() {
        self._toggle(false, duration, callback)
    })

    return this
}

/**
 * Hide master container.
 *
 * @param {Number} [duration] in ms.
 * @param {Function} [callback] will call back when animation is done.
 * @return {iPanel} this
 * @api public
 */
iPanel.prototype.hide = function(duration, callback) {
    var self = this

    if (typeof duration == 'function') {
        callback = duration
        duration = null
    }

    if (this._animating) {
        setTimeout(callback)
        return this
    }

    this._emit('beforehide')

    // Let something get rendered if needed.
    requestAnimationFrame(function() {
        self._toggle(true, duration, callback)
    })

    return this
}

/**
 * Setter/getter for options.
 *
 * @param {String} name
 * @param {Mixed} [value]
 * @return {iPanel|Mixed}
 * @api public
 */
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

    this._translateX(this.elements.master[0], this.options.hidden ? maxLeft : 0)

    return this
}

iPanel.prototype.animating = function() {
    return this._animating
}

/**
 * Move containers to show/hide master.
 *
 * @param {Boolean} hide when true.
 * @param {Number} [duration] in ms.
 * @param {Function} [callback] will call back when animation is done.
 * @return {iPanel} this
 * @api private
 */
iPanel.prototype._toggle = function(hide, duration, callback) {
    var self = this,
        left = hide ? this._getMaxLeft() : 0

    this._animate(left, duration, function() {
        if (!self.options.dynamic) self.elements.container.toggleClass('ipanel-master-hidden', hide)
        if (callback) callback()
        self._emit(hide ? 'hide' : 'show')
    })

    return this
}

/**
 * Move master and slave containers.
 *
 * @param {Number} left px.
 * @param {Number} [duration] in ms.
 * @param {Function} [callback] will call back when animation is done.
 * @return {iPanel} this
 * @api private
 */
iPanel.prototype._animate = function(left, duration, callback) {
    var self = this,
        o = this.options

    if (typeof duration == 'function') {
        callback = duration
        duration = o.duration
    }

    this._animating = true

    this._translate(this.elements.master[0], left, duration, function() {
        self._animating = false
        if (callback) callback()
    })

    if (o.slaveAnimation && this.elements.slave.length && !this._dragging) {
        this._slaveX = left > 0 ? 0 : -o.slaveDisposition
        this._translate(this.elements.slave[0], this._slaveX, duration)
    }

    return this
}

/**
 * Set transformation and transition.
 *
 * @param {Element} el
 * @param {Number} left
 * @param {Number} [duration]
 * @param {Function} [callback]
 * @return {iPanel}
 * @api private
 */
 iPanel.prototype._translate = function(el, left, duration, callback) {
    var o = this.options

    duration != null || (duration = o.duration)

    if (duration) {
        this._transit(el, duration, o.easing, callback)
    } else {
        setTimeout(callback)
    }

    this._translateX(el, left)

    return this
}

/**
 * Set transition.
 *
 * @param {Element} el
 * @param {Number} duration
 * @param {String} easing
 * @param {Function} [callback]
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._transit = function(el, duration, easing, callback) {
    if (callback) {
        el.addEventListener(vendor + 'TransitionEnd', function onTransitionEnd() {
            el.style[vendor + 'Transition'] = ''
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

/**
 * Set translate X.
 *
 * @param {Element} el
 * @param {Number} x
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._translateX = function(el, x) {
    this._left = x || 0
    el.style[transform] = x == null ? '' : 'translateX(' + x + 'px)'

    return this
}

/**
 * Find and set elements references.
 *
 * @param {jQuery} $item
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._setElements = function($item) {
    var o = this.options

    // Item has not changed.
    if (this.elements.item && $item[0] === this.elements.item[0]) return this

    if (this.elements.master) this._translateX(this.elements.master[0], null)

    this.elements.item = $item
    this.elements.master = $item
    if (o.master) {
        this.elements.master = typeof o.master == 'string' ? $item.find(o.master) : $(o.master)
    }
    this.elements.slave = typeof o.slave == 'string' ? $item.find(o.slave) : $(o.slave)

    return this
}

/**
 * Calc, cache and return slave with.
 *
 * @param {Boolean} [force] recalc if true.
 * @return {Number}
 * @api private
 */
iPanel.prototype._getMaxLeft = function(force) {
    if (this._maxLeft && !force) return this._maxLeft
    this._maxLeft = this.elements.slave.outerWidth()
    if (this.options.hideDirection == 'left') this._maxLeft *= -1

    return this._maxLeft
}

/**
 * Trigger/emit event.
 *
 * @param {String} name of event
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._emit = function(name) {
    this.elements.master.trigger(name + '.ipanel')

    return this
}

/**
 * Returns true if master is hidden or on the way.
 *
 * @return {Boolean}
 * @api private
 */
iPanel.prototype._isHidden = function() {
    if (this.options.hideDirection == 'right') {
        return this._left > 0
    }

    return this._left < 0
}

/**
 * Touchend event handler.
 *
 * @param {jQuery.Event} e
 * @api private
 */
iPanel.prototype._onTouchEnd = function(e) {
    if (this._dragging || this._animating) return
    if (this.options.dynamic) this._setElements($(e.target).parent())
    e.preventDefault()
    this[this._isHidden() ? 'show' : 'hide']()
}

/**
 * Dragstart event handler.
 *
 * @param {jQuery.Event} e
 * @api private
 */
iPanel.prototype._onMoveStart = function(e) {
    this._dragging = true
    this._moveStartTime = Date.now()
    if (this.options.dynamic) this._setElements($(e.target).parent())
    this._emit('before' + (this._isHidden() ? 'show' : 'hide'))
}

/**
 * Drag event handler.
 *
 * @param {jQuery.Event} e
 * @api private
 */
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
    this._translateX(e.target, this._left + e.deltaX)
}

/**
 * Dragend event handler.
 *
 * @param {jQuery.Event} e
 * @api private
 */
iPanel.prototype._onMoveEnd = function(e) {
    var self = this,
        isSwipe = Date.now() - this._moveStartTime < this.options.swipeDurationThreshold

    this._dragging = false

    if (isSwipe) {
        if (this.options.hideDirection == 'right') {
            e.deltaX > 0 ? this._toggle(true) : this._toggle()
        } else {
            e.deltaX < 0 ? this._toggle(true) : this._toggle()
        }
    } else {
        if (this.options.hideDirection == 'right') {
            this._left >= this._getMaxLeft() / 2 ? this._toggle(true) : this._toggle()
        } else {
            this._left < this._getMaxLeft() / 2 ? this._toggle(true) : this._toggle()
        }
    }
}

