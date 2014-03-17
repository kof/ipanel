'use strict'

var iPanel = require('./index'),
    slice = [].slice

/**
 * jQuery plugin binding.
 *
 * @param {Object} options, see iPanel.defaults
 * @return {jQuery}
 * @api public
 */
$.fn.iPanel = function(options) {
    var ret, args = slice.call(arguments, 1)

    this.each(function() {
        var $this = $(this),
            inst = $this.data('iPanel')

        if (inst) {
            ret = inst[options].apply(inst, args)
            if (ret === inst) ret = null
        } else {
            inst = new iPanel($this, options)
            inst.init()
            $this.data('iPanel', inst)
        }
    })

    return ret != null ? ret : this
}

// Expose constructor to jquery namespace.
$.fn.iPanel.iPanel = iPanel
