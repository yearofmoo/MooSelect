(function($) {

MooSelect.Searcher = new Class({

  Implements : [Options, Events],

  options : {

  },

  initialize : function(options) {
    this.setOptions(options);
    this.build();
  },

  build : function() {
    var prefix = this.options.classPrefix || '';
    klass = prefix + 'searcher';
    this.container = new Element('div').set('class',klass);
    this.input = new Element('input',{
      'class' : prefix + 'searcher-input',
      'type' : 'text'
    }).inject(this.container);
    if(this.options.tabIndex) {
      this.input.set('tabindex',this.options.tabIndex);
    }
    if(this.options.globalClassName) {
      this.container.addClass(this.options.globalClassName);
      this.input.addClass(this.options.globalClassName);
    }
    if(this.options.globalClassPrefix) {
      this.container.addClass(this.options.globalClassPrefix + 'searcher');
      this.input.addClass(this.options.globalClassPrefix + 'searcher-input');
    }
    this.setupEvents();

    this.searchIcon = new Element('div',{
      'class' : prefix + 'search-icon'
    }).inject(this.container);
  },

  setupEvents : function() {
    this.getInput().addEvents({
      'blur' : function() {
        this.focus = false;
      }.bind(this),
      'focus' : this.onFocus.bind(this),
      'click' : this.onClick.bind(this),
      'keyup' : this.onKeyInput.bind(this),
      'keydown' : this.onKeyMovement.bind(this)
    }); 
  },

  onKeyMovement : function(event) {
    switch(event.key) {
      case 'alt':
      case 'shift':
      case 'ctrl':
      case 'cmd':
      case 'command':
      case 'control':
      case 'meta':
        return; //these keys do nothing
      break;

      case 'up':
        event.stop();
        this.fireEvent('up');
      break;
      case 'backspace':
        if(!this.hasValue()) {
          this.fireEvent('emptyBackspace');
        }
        else {
          this.fireEvent('backspace');
          this.onSearchInput();
        }
      break;
      case 'down':
        event.stop();
        this.fireEvent('down');
      break;
      case 'esc':
        event.stop();
        this.onEscapeKeyPress();
        return;
      break;
      case 'shift':
      case 'capslock':
      break;
      case 'tab':
        this.onBlur();
        return;
      break;
      default:
        this.onSearchInput();
      break;
      case 'space':
        this.fireEvent('space',[event]);
        return;
      break;
      case 'enter':
        event.stop();
        return;
      break;
    }
    this.fireEvent('input');
  },

  onKeyInput : function(event) {
    var key = event.key;
    switch(key) {
      case 'enter':
        event.stop();
        this.fireEvent('enter');
      break;
    }
  },

  onEscapeKeyPress : function() {
    if(this.hasValue()) {
      this.clearValue();
      this.onSearchInput();
    }
    else {
      this.fireEvent('escape');
    }
  },

  onSearchInput : function() {
    if(this.timer) {
      clearTimeout(this.timer);
      delete this.timer;
    }
    this.timer = this.onSearch.delay(50,this);
  },

  getContainer : function() {
    return this.container;
  },

  getInput : function() {
    return this.input;
  },

  onShow : function() {
  },

  getValue : function() {
    return this.getInput().get('value');
  },

  setValue : function(value) {
    this.getInput().set('value',value);
  },

  clearValue : function() {
    this.setValue('');
    this.fireEvent('clear');
  },

  hasValue : function() {
    return this.getValue().length > 0;
  },

  onFocus : function(event) {
    if(event) event.stop();
    this.focus = true;
    this.fireEvent('focus');
  },

  onBlur : function() {
    this.fireEvent('blur');
  },

  onClick : function(event) {
    if(event) event.stopPropagation();
    if(this.hasFocus()) {
      this.onFocus();
    }
  },

  hasFocus : function() {
    return this.focus;
  },

  onSearch : function() {
    this.fireEvent('search',[this.getValue()]);
  },

  toElement : function() {
    return this.getContainer();
  },

  disable : function() {
    this.toElement().addClass('disabled');
  },

  enable : function() {
    this.toElement().removeClass('disabled');
  },

  isDisabled : function() {
    return this.toElement().hasClass('disabled');
  },

  isEnabled : function() {
    return !this.isDisabled();
  },

  destroy : function() {
    this.toElement().destroy();
  }

});

})(document.id);
