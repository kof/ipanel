## Mobile panels

Currently there are 2 sorts of panels one can build using this module:
- ios7 style slide menu
- edit menu within table/list view items

## Create instance

    // From global
    var panel = new iPanel($elem, options)

    // As a jquery plugin
    $(container).iPanel(options)

    // Commonjs
    var iPanel = require('iPanel')


## Options/defaults

    {
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

## License MIT
