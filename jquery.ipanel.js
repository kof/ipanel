(function(factory) {
    if (typeof define == 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory)
    } else {
        // Browser globals
        factory(jQuery)
    }
})(function($, undefined) {
    'use strict'

    function Panel($container, options) {
        this.options = $.extend({}, Panel.defaults, options)
        this.elements = {container: $container}
        this._left = 0
        this._maxLeft = 0
        this._moveStartTime = 0
        this._dragging = false
        this._animating = false
    }

    Panel.defaults = {
        speed: 500,
        easing: 'ease-out-expo',
        swipeDurationThreshold: 1000,
        handle: '.ipanel-handle',
        primary: null,
        secondary: 'prev',
        animateSecondary: true,
        secondaryDisposition: 100,
        primaryHidden: false,
        hideDirection: 'right',
        delegate: false
    }

    Panel.prototype.init = function() {
        var o = this.options

        this.elements.container
            .addClass('ipanel' + (o.primaryHidden ? ' ipanel-primary-hidden' : ''))
            .on('touchend mouseup', o.handle, $.proxy(this._onTouchEnd, this))
            .on('movestart', o.handle, $.proxy(this._onMoveStart, this))
            .on('move', o.handle, $.proxy(this._onMove, this))
            .on('moveend', o.handle, $.proxy(this._onMoveEnd, this))

        if (!o.delegate) {
            this._setElements(this.elements.container)
            this.refresh()
        }
    }

    Panel.prototype.show = function(speed, callback) {
        var self = this

        if (typeof speed == 'function') {
            callback = speed
            speed = null
        }

        if (this._animating || !this.options.primaryHidden) {
            setTimeout(callback)
            return this
        }

        this.options.primaryHidden = false
        this._trigger('beforeshow')

        // Let something get rendered if needed.
        requestAnimationFrame(function() {
            self.animate(0, speed, function() {
                self._setPrimaryHidden(false)
                if (callback) callback()
                self._trigger('show')
            })
        })

        return this
    }

    Panel.prototype.hide = function(speed, callback, noBeforeHide) {
        var self = this

        if (typeof speed == 'function') {
            callback = speed
            speed = null
        }

        if (this._animating || this.options.primaryHidden) {
            if (callback) callback()
            return this
        }

        this.options.primaryHidden = true

        // Flag used when called from "moveend".
        if (!noBeforeHide) this._trigger('beforehide')

        // Let something get rendered if needed.
        requestAnimationFrame(function() {
            self.animate(self._getMaxLeft(), speed, function() {
                self._setPrimaryHidden(true)
                if (callback) callback()
                self._trigger('hide')
            })
        })

        return this
    }

    Panel.prototype.animate = function(left, speed, callback) {
        var self = this,
            o = this.options

        if (typeof speed == 'function') {
            callback = speed
            speed = o.speed
        }

        speed != null || (speed = o.speed)

        this._left = left

        this._translate(this.elements.primary, left, speed, function() {
            self._animating = false
            if (callback) callback()
        })

        if (o.animateSecondary && this.elements.secondary.length && !this._dragging) {
            this._secondaryX = left > 0 ? 0 : -o.secondaryDisposition
            this._translate(this.elements.secondary, this._secondaryX, speed)
        }

        return this
    }

    Panel.prototype.option = function(name, value) {
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

    Panel.prototype.refresh = function() {
        var maxLeft = this._getMaxLeft(true)

        this.animate(this.options.primaryHidden ? maxLeft : 0, 0)

        return this
    }

    Panel.prototype.animating = function() {
        return this._animating
    }

    Panel.prototype._translate = function($el, x, duration, callback) {
        $el.css('-webkit-transform', 'translateX(' + x + 'px)')
        if (callback) callback()
        return this
    }

    Panel.prototype._setPrimaryHidden = function(value) {
        this.elements.container.toggleClass('ipanel-primary-hidden', value)

        return this
    }

    Panel.prototype._setElements = function($container) {
        var o = this.options

        this._resetTransform()
        this.elements.primary = $container.find(o.primary)

        if (o.secondary) {
            if (o.secondary == 'prev' || o.secondary == 'next') {
                this.elements.secondary = this.elements.primary[o.secondary]()
            } else if (typeof o.secondary == 'string') {
                this.elements.secondary = $container.find(o.secondary)
            } else {
                this.elements.secondary = $(o.secondary)
            }
        }

        return this
    }

    Panel.prototype._resetTransform = function() {
        if (this.elements.primary) this.elements.primary.css('-webkit-transform', '')
    }

    Panel.prototype._getMaxLeft = function(force) {
        if (this._maxLeft && !force) return this._maxLeft
        this._maxLeft = this.elements.secondary.outerWidth()
        if (this.options.hideDirection == 'left') this._maxLeft *= -1

        return this._maxLeft
    }

    Panel.prototype._trigger = function(event) {
        this.elements.primary.trigger(event + '.ipanel')

        return this
    }

    Panel.prototype._isHidden = function() {
        if (this.options.hideDirection == 'right') {
            return this._left > 0
        }

        return this._left < 0
    }

    Panel.prototype._onTouchEnd = function(e) {
        if (this._dragging || this._animating) return
        if (this.options.delegate) this._setElements($(e.target).parent())
        e.preventDefault()
        this[this._isHidden() ? 'show' : 'hide']()
    }

    Panel.prototype._onMoveStart = function(e) {
        this._dragging = true
        this._moveStartTime = Date.now()
        if (this.options.delegate) this._setElements($(e.target).parent())
        this._trigger('before' + (this._isHidden() ? 'show' : 'hide'))
    }

    Panel.prototype._onMove = function(e) {
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
        this.animate(this._left + e.deltaX, 0)
    }

    Panel.prototype._onMoveEnd = function(e) {
        var self = this,
            isSwipe = Date.now() - this._moveStartTime < this.options.swipeDurationThreshold

        if (isSwipe) {
            this._dragging = false
            e.deltaX > 0 ? this.hide(null, null, true) : this.show()
        } else {
            this._left > this._getMaxLeft() / 2 ? this.hide(null, null, true) : this.show()
            this._dragging = false
        }
    }

    $.fn.iPanel = function(options, param1, param2) {
        var ret

        this.each(function() {
            var $this = $(this),
                inst = $this.data('iPanel')

            if (inst) {
                ret = inst[options](param1, param2)
                if (ret === inst) ret = null
            } else {
                inst = new Panel($this, options)
                inst.init()
                $this.data('iPanel', inst)
            }
        })

        return ret != null ? ret : this
    }

    $.fn.iPanel.Panel = Panel
})
