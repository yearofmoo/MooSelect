(function($) {

MooSelect.Result = new Class({

  Implements : [Options, Events],

  options : {

  },

  initialize : function(text,value,options) {
    this.text = text;
    this.value = value;
    this.setOptions(options);
    this.build();
  },

  build : function() {
    var klass = this.options.classPrefix || '';
    klass += 'result';
    var html = this.getInnerHTML();
    this.element = new Element('div').addClass(klass);
    this.element.set('html',html);
    this.element.store('value',this.getValue());
    if(this.options.globalClassName) {
      this.element.addClass(this.options.globalClassName);
    }
    if(this.options.globalClassPrefix) {
      this.element.addClass(this.options.globalClassPrefix + 'result');
    }
    this.setupEvents();
  },

  setupEvents : function() {
    this.toElement().addEvents({
      'click' : this.onClick.bind(this),
      'mousedown' : this.onLinger.bind(this)
    });
  },

  forceHide : function() {
    if(!this.forceHidden) {
      this.forceHidden = true;
      this.hide();
      this._show = this.show;
      this.show = function() { };
    }
  },

  forceShow : function() {
    if(this.forceHidden) {
      this.show = this._show;
      this.forceHidden = false;
      this.show();
    }
  },

  toElement : function() {
    return this.element;
  },

  getInnerHTML : function() {
    var html = this.getText();
    var fn = this.options.customBuildResultHTML;
    if(fn) {
      html = fn(this,html);
    }
    return html;
  },

  getRawData : function() {
    return this.options.rawData;
  },

  getText : function() {
    return this.text;
  },

  getValue : function() {
    return this.value;
  },

  matches : function(value) {
    return this.getValue() == value;
  },

  equalTo : function(result) {
    return this.matches(result.getValue()) && this.getText().toLowerCase() == result.getText().toLowerCase();
  },

  contains : function(value) {
    text = this.getText().toLowerCase();
    return text.contains(value.toLowerCase());
  },

  hover : function() {
    this.onHover();
  },

  blur : function() {
    this.onBlur();
  },

  select : function() {
    this.onSelect();
  },

  isSelected : function() {
    return this.toElement().hasClass('selected');
  },

  isHover : function() {
    return this.toElement().hasClass('hover');
  },

  deSelect : function() {
    this.toElement().removeClass('selected');
  },

  hide : function() {
    this.toElement().setStyle('display','none');
  },

  show : function() {
    this.toElement().setStyle('display','block');
  },

  isVisible : function() {
    return this.toElement().getStyle('display') == 'block';
  },

  isGrouped : function() {
    return !!this.group;
  },

  setGroup : function(group) {
    this.group = group;
    this.toElement().addClass('grouped');
  },

  isHidden : function() {
    return this.toElement().getStyle('display') == 'none';
  },

  onClick : function(event) {
    event.stop();
    this.onSelect();
  },

  onLinger : function(event) {
    if(event) event.stop();
    this.fireEvent('linger');
  },

  onBlur : function() {
    this.toElement().removeClass('hover');
    this.fireEvent('blur',[this]);
  },

  onHover : function() {
    this.toElement().addClass('hover');
    this.fireEvent('hover',[this]);
  },

  onSelect : function() {
    this.toElement().addClass('selected');
    this.fireEvent('select',[this]);
  }

});

})(document.id);
