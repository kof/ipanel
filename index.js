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
    this._maxLeft = null
    this._resetState()
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
    easingAfterDrag: 'ease-out',
    easingAfterSwipe: 'cubic-bezier(0, 1.000, 0.220, 1.000)',
    // If touchend - touchstart < 1000 -> swipe, otherwise - drag.
    swipeDurationThreshold: 1000,
    swipeDistanceThreshold: 5,
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
    // Animate slave container when moving/dragging master (ios like).
    slaveAnimation: true,
    // Max distance to move slave when slaveAnimation is true.
    slaveDisposition: 100,
    // False when master, slave and other elements have to be found on touch.
    // True if they can be found in the main container on init.
    dynamic: false,
    drag: true,
    // When hide/show complete previous animation fast when in progress and start
    // the new one immediately.
    skipPreviousAnimation: false
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
        .on('move', o.handle, $.proxy(this._onMove, this))
        .on('moveend', o.handle, $.proxy(this._onMoveEnd, this))

    if (!o.dynamic) {
        this._setElements(this.elements.container)
        this.refresh(o)
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

    if (this._moving || this._dragging|| !this._isHidden()) {
        setTimeout(callback)
        return this
    }

    this._emit('beforeshow')

    // Let something get rendered if needed.
    requestAnimationFrame(function() {
        self._toggle(false, duration, null, callback)
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

    if (this._moving || this._dragging || this._isHidden()) {
        setTimeout(callback)
        return this
    }

    this._emit('beforehide')

    // Let something get rendered if needed.
    requestAnimationFrame(function() {
        self._toggle(true, duration, null, callback)
    })

    return this
}

/**
 * Setter/getter for options.
 *
 * @param {String} name
 * @param {Mixed} [value]
 * @return {iPanel|Mixed} this
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

/**
 * Refresh positions.
 *
 * @return {iPanel} this
 * @api public
 */
iPanel.prototype.refresh = function(options) {
    // Cache and recalc slave width.
    var maxLeft = this._getMaxLeft(true)
    this._move(options && options.hidden || this._isHidden() ? maxLeft : 0 , 0)

    return this
}


/**
 * Get moving status.
 *
 * @return {Boolean}
 * @api public
 */
iPanel.prototype.moving = function() {
    return this._moving
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
iPanel.prototype._toggle = function(hide, duration, easing, callback) {
    var self = this,
        left = hide ? this._getMaxLeft() : 0

    this._move(left, duration, easing, function() {
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
iPanel.prototype._move = function(left, duration, easing, callback) {
    var self = this,
        o = this.options

    this._moving = true
    this._left = left

    this._translate(this.elements.master[0], left, duration, easing, function() {
        self._moving = false
        if (callback) callback()
    })

    if (o.slaveAnimation && this.elements.slave.length && !this._dragging) {
        this._slaveX = left > 0 ? 0 : -o.slaveDisposition
        this._translate(this.elements.slave[0], this._slaveX, duration, easing)
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
 iPanel.prototype._translate = function(el, left, duration, easing, callback) {
    var self = this,
        o = this.options

    duration != null || (duration = o.duration)
    easing != null || (easing = o.easing)

    if (duration) {
        this._onceTransitionEnd(el, duration, function() {
            self._setTransition(el, null)
            if (callback) callback()
        })
        this._setTransition(el, duration + 'ms ' + easing)
    } else {
        setTimeout(callback)
    }

    this._setTranslateX(el, left)

    return this
}

/**
 * Set state variables to initial values.
 *
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._resetState = function() {
    this._dragging = false
    this._horMovement = false
    this._vertMovement = false
    this._horDistance = 0
    this._moving = false
    this._moveStartTime = 0
    this._currentTarget = null
    this._directionX = 0

    return this
}

/**
 * Complete animation.
 *
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._endTransition = function() {
    if (this.elements.master)  {
        this._setTransition(this.elements.master[0], null)
        this.elements.master.triggerHandler(vendor + 'TransitionEnd')
    }

    return this
}

/**
 * Call back once when transition end
 *
 * @param {Element} el
 * @param {Number} duration
 * @param {Function} [callback]
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._onceTransitionEnd = function(el, duration, callback) {
    var $el = $(el)

    function end() {
        $el.off(vendor + 'TransitionEnd', end)
        // At the moment animation is done, touch event can still be triggered on
        // the old element position.
        setTimeout(callback, 10)
        callback = null
    }

    $el.on(vendor + 'TransitionEnd', end)

    // For the case we don't get the event.
    setTimeout(end, duration + 20)

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
iPanel.prototype._setTranslateX = function(el, x) {
    el.style[transform] = x == null ? '' : 'translateX(' + x + 'px)'

    return this
}

/**
 * Set transition property.
 *
 * @param {Element} el
 * @param {String} value
 * @return {iPanel}
 * @api private
 */
iPanel.prototype._setTransition = function(el, value) {
    el.style[vendor + 'Transition'] = value || ''

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

    // Reset transition and tranformation for previous master.
    if (this.elements.master) {
        this._left = 0
        this._setTranslateX(this.elements.master[0], null)
        this._setTransition(this.elements.master[0], null)
        this.elements.master.removeClass('ipanel-master')
    }

    this.elements.item = $item
    this.elements.master = $item
    if (o.master) {
        this.elements.master = typeof o.master == 'string' ? $item.find(o.master) : $(o.master)
    }
    this.elements.master.addClass('ipanel-master')
    if (this.elements.slave) this.elements.slave.removeClass('ipanel-slave')
    this.elements.slave = typeof o.slave == 'string' ? $item.find(o.slave) : $(o.slave)
    this.elements.slave.addClass('ipanel-slave')

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
    if (this._maxLeft != null && !force) return this._maxLeft
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
 * Touchend event handler, just for tap handling.
 *
 * @param {jQuery.Event} e
 * @api private
 */
iPanel.prototype._onTouchEnd = function(e) {
    var self = this,
        $master

    if (this._currentTarget !== e.currentTarget) this._endTransition()
    if (this._dragging || this._moving || this._vertMovement || this._horMovement) return
    this._resetState()
    if (this.options.dynamic) {
        $master = $(e.target).closest(this.options.master)
        if (!$master.length) return
        this._setElements($master.parent())
    }
    e.preventDefault()
    requestAnimationFrame(function() {
        self[self._isHidden() ? 'show' : 'hide']()
    })
}

/**
 * Drag event handler.
 *
 * @param {jQuery.Event} e
 * @api private
 */
iPanel.prototype._onMove = function(e) {
    var self = this,
        directionX = 0

    this._horDistance = Math.abs(e.distX)
    this._horMovement || (this._horMovement =  this._horDistance > 3)

    // No horizontal drag.
    if (!e.deltaX || !this._horMovement || !this.options.drag) return

    this._vertMovement || (this._vertMovement = Math.abs(e.distY) > 3)
    this._currentTarget = e.currentTarget

    if (e.deltaX) directionX = e.deltaX < 0 ? -1 : 1


    // Direction has changed. Ensure we recognize swipe later.
    if (this._dragging && directionX != this._directionX) {
        this._horDistance = 0
        this._moveStartTime = Date.now()
    }

    this._directionX = directionX

    // Move start.
    if (!this._dragging) {
        // If vertical movement is detected - ignore drag,
        // but only if not dragging already.
        if (this._vertMovement) return
        this._moveStartTime = Date.now()
        if (this.options.dynamic) {
            this._setElements($(e.target).closest(this.options.handle))
        }
    }

    // Hide direction - right.
    if (this._getMaxLeft() > 0) {
        // Move to the right, however already right.
        if (directionX > 0 && this._left >= this._getMaxLeft()) return
        // Move to the left, however already left.
        if (directionX < 0 && this._left <= 0) return
    // Hide direction - left.
    } else {
        // Move to the right, however already right.
        if (directionX > 0 && this._left >= 0) return
        // Move to the left, however already left
        if (directionX < 0 && this._left <= this._getMaxLeft()) return
    }

    // Move start.
    if (!this._dragging) {
        this._dragging = true
        this._emit('before' + (this._isHidden() ? 'show' : 'hide'))
    }

    this._left += e.deltaX
    this._setTranslateX(this.elements.master[0], this._left)
}

/**
 * Dragend event handler.
 *
 * @param {jQuery.Event} e
 * @api private
 */
iPanel.prototype._onMoveEnd = function(e) {
    var self = this,
        o = this.options,
        isSwipe,
        resetState = this._resetState.bind(this)

    // Handle drag end only if drag has been started. In case of vertical movement
    // drag is dragging is not true.
    if (!this._dragging) return resetState()

    isSwipe = this._horDistance > o.swipeDistanceThreshold &&
        Date.now() - this._moveStartTime < o.swipeDurationThreshold

    if (isSwipe) {
        if (o.hideDirection == 'right') {
            this._directionX > 0 ? this._toggle(true, null, o.easingAfterSwipe, resetState) : this._toggle(null, null, null, resetState)
        } else {
            this._directionX < 0 ? this._toggle(true, null, o.easingAfterSwipe, resetState) : this._toggle(null, null, null, resetState)
        }
    } else {
        if (o.hideDirection == 'right') {
            this._left >= this._getMaxLeft() / 2 ? this._toggle(true, null, o.easingAfterDrag, resetState) : this._toggle(false, null, o.easingAfterDrag, resetState)
        } else {
            this._left < this._getMaxLeft() / 2 ? this._toggle(true, null, o.easingAfterDrag, resetState) : this._toggle(false, null, o.easingAfterDrag, resetState)
        }
    }
}
