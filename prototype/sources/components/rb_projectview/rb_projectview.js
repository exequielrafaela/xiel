(function (factory) {
    if (typeof module === 'object' && module.exports) {
        require('../rb_panelgroup/rb_panelgroup');
        require('../../js/utils/rb_scrollintoview');
        // require('../../js/utils/rb_position');
        module.exports = factory();
    } else {
        factory();
    }
}(function () {
    'use strict';
    /* jshint eqnull: true */
    var rb = window.rb;
    var $ = rb.$;
    var life = rb.life;
    var components = rb.components;

    var cleanupCSS = function () {
        var css = {display: ''};

        if (!this.style.height.startsWith('0')) {
            css.height = '';
            css.overflow = '';
        }

        $(this).css(css);
    };

    components.panelgroup.extend('projectview',
        /** @lends rb.components.projectview.prototype */
        {
            /**
             * @static
             * @mixes rb.components.panelgroup.defaults
             * @property {Object} defaults Changed options compared to the panelgroup component. Go to {@link rb.components.panelgroup#defaults} for detailed option descriptions.
             * @property {Boolean}  defaults.toggle=false
             * @property {Number}  defaults.selectedIndex=0
             * @property {String}  defaults.animation='adaptHeight'
             */
            defaults: {
                multiple: false,
                toggle: false,
                animation: false, // 'adaptHeight' || 'slide'
                easing: '',
                duration: 500,
                closeOnFocusout: false,
                selectedIndex: 0,
                adjustScroll: false, //true || false
                setFocus: true,
                switchedOff: false,
                resetSwitchedOff: true,
                panelName: '{name}-panel',
                panelSel: 'find(.{name}-panel)',
                btnSel: 'find(.{name}-btn)',
                groupBtnSel: 'find(.{name}-ctrl-btn)',
                panelWrapperSel: 'find(.{name}-panel-wrapper):0',
                btnWrapperSel: 'find(.{name}-btn-wrapper):0',
                itemWrapper: '',

                //special options compared to panelgroup
                panelComponentName: '{name}panel',
                preventDefault: true,
                closeOnEsc: true,
                scrollIntoView: true,
            },

            init: function (element, initialDefaults) {
                var that = this;

                this._super(element, initialDefaults);
            },

            _handleAnimation: function(animationData){
                if(animationData.animation == 'slide' && animationData.panel.isOpen){
                    this.adjustScroll(animationData.panel, animationData.options);
                } else if(animationData.animation == 'adaptHeight' && animationData.panel.isOpen){
                    this.animateWrapper(animationData.panel.element);
                } else if(animationData.animation == 'adaptHeight') {
                    this.animateWrapper();
                }

                //scroll into view
                this.$panelWrapper.scrollIntoView();
            },

            panelChangeCB: function (panelComponent, action) {
                var options = this.options;
                this._super(panelComponent, action);

                switch (action) {
                    case 'afterclose':
                        if (!this.selectedIndexes.length) {
                            this.selectIndex(this.options.selectedIndex, {setFocus: options.setFocus});
                        }
                        break;
                }
            },

            //initialize panels with given panelComponentName or default panel component
            _getElements: function () {
                var panels;
                var that = this;
                var options = this.options;

                var buttonWrapper = this.getElementsFromString(options.btnWrapperSel)[0];
                var itemWrapper = this.interpolateName(this.options.itemWrapper || '');

                var panelName = this.interpolateName(this.options.panelName);
                var jsPanelName = this.interpolateName(this.options.panelName, true);
                this.$panelWrapper = $(this.getElementsFromString(options.panelWrapperSel));

                var panelComponentName = this.interpolateName(this.options.panelComponentName || 'panel');

                //check if there is a special sub-class panel for this component, if not, fall back to normal panel
                if(!(panelComponentName in rb.components)){
                    console.warn('projectview | did not found given panelComponentName in rb.components', panelComponentName);
                    panelComponentName = 'panel';
                }

                this.$panels = $(this.getElementsFromString(options.panelSel, this.$panelWrapper.get(0))).each(function (index) {
                    var panel = life.create(this, rb.components[panelComponentName], {
                        jsName: jsPanelName,
                        name: panelName,
                        resetSwitchedOff: options.resetSwitchedOff,
                        setFocus: options.setFocus,
                        itemWrapper: itemWrapper,
                        closeOnEsc: options.closeOnEsc,
                    });

                    panel.group = that.element;
                    panel.groupComponent = that;
                });

                components.panel.prototype.name = panelComponentName;

                panels = this.$panels;

                this.$buttons = $(this.getElementsFromString(options.btnSel, buttonWrapper)).each(function (index) {
                    var btn = life.create(this, components.panelbutton, {
                        type: (options.toggle) ? 'toggle' : 'open',
                        preventDefault: options.preventDefault,
                    });
                    btn.setTarget(panels.get(index));
                });

                this.$groupButtons = $(this.getElementsFromString(options.groupBtnSel)).each(function (index) {
                    var btn = life.create(this, components.panelgroupbutton, {
                        preventDefault: options.preventDefault
                    });
                    btn.setTarget(that.element);
                });
            },
        }
    );

    components.panel.extend('projectviewpanel',
        /** @lends rb.components.projectview.prototype */
        {
            /**
             * @static
             * @mixes rb.Component.defaults
             * @property {Object} defaults
             * @property {String} defaults.animation='' Predefined animation: 'slide'. These should be combined with CSS transitions or animations.
             * @property {String} defaults.easing='' CSS Easing function for the animation.
             * @property {Number} defaults.duration=400 Duration of the animation.
             * @property {Boolean} defaults.setFocus=true Whether the component should set the focus on open.
             * @property {Boolean} defaults.closeOnOutsideClick=false Whether the component should be closed, if clicked outside the component.
             * @prop {Boolean} defaults.switchedOff=false Turns off panel.
             * @prop {Boolean} defaults.resetSwitchedOff=true Resets panel to initial state on reset switch.
             * @prop {Boolean} defaults.closeOnEsc=false Whether panel should be closed on esc key.
             * @prop {String} defaults.itemWrapper='' Wheter the closest itemWrapper should get the class `is-selected-within'.
             */
            defaults: {
                animation: '', // || 'slide'
                duration: 400,
                easing: '',
                setFocus: true, // true || false
                closeOnOutsideClick: false,
                resetSwitchedOff: true,
                switchedOff: false,
                closeOnEsc: true,
                itemWrapper: '',
            },

            init: function (element, initialDefaults) {
                this._super(element, initialDefaults);
            },

            loadPanelContent: function(delay){
                var that = this;

                if(this.panelAjaxContent || !(this.buttonComponent && this.buttonComponent.element)){
                    return false
                }

                var buttonElement = this.buttonComponent.element;
                var buttonHref = buttonElement.href;

                if(buttonHref && buttonHref !== '#'){
                    that.panelAjaxContent = ajax(buttonHref + '?ajax=true');

                    that.panelAjaxContent.then(function(data) {
                        // that.$element.html(data);
                    }, function(reason) {
                        // on rejection
                        console.error(reason);
                    });
                }

                function ajax(url) {
                    return new Promise(function(resolve, reject){
                        var xhr = new XMLHttpRequest();

                        xhr.open('GET', url);
                        xhr.onreadystatechange = handler;
                        // xhr.responseType = 'json';
                        // xhr.setRequestHeader('Accept', 'application/json');
                        
                        setTimeout(function(){
                            xhr.send();
                        }, delay || 0);

                        function handler() {
                            if (this.readyState === this.DONE) {
                                if (this.status === 200) {
                                    resolve(this.response);
                                } else {
                                    reject(new Error('ajax: `' + url + '` failed with status: [' + this.status + ']'));
                                }
                            }
                        };
                    });
                }
            },

            _switchOn: function () {
                this._super();
                var that = this;

                //initially load contents from remote resources
                requestAnimationFrame(function(){
                    if(!that.panelAjaxContent && that.buttonComponent) {
                        that.loadPanelContent(400);
                    }
                });
            },

            /**
             * Opens the panel
             * @param {Object} [options] Options are also dispatched with the event.detail property.
             * @param {Boolean} [options.animationPrevented] If `true` panel opens without animation.
             * @param {Boolean} [options.setFocus] Overrides the general `setFocus` option of the component instance.
             * @returns {boolean}
             * @example
             * //opens a panel without animation and without setting focus.
             * rb.$('.rb-panel').rbComponent().open({animationPrevented: true, setFocus: false});
             */
            open: function (options) {
                if (this.isOpen) {
                    return false;
                }

                var that = this;

                if(options === undefined){
                    options = {
                        setFocus: true
                    };
                }

                if(!this.panelAjaxContent && this.buttonComponent) {
                    this.loadPanelContent();
                }

                if(this.panelAjaxContent && 'then' in this.panelAjaxContent){
                    this.panelAjaxContent
                        .then(function(data) {
                            
                            requestAnimationFrame(function(){
                                //render loaded html
                                that.$element.html(data);
                                that.open(options);
                            });

                            //remove the promise, so next time open gets called, it shows the content
                            that.panelAjaxContent = {};

                        }, function(reason) {
                            console.error(reason);
                        })
                    ;
                } else {
                    this._super(options);
                }

                return true;
            },
        }
    );

    return components;
}));
