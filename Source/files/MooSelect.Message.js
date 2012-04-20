(function($) {

MooSelect.Message = new Class({

  Implements : [Options, Events],

  options : {

  },

  initialize : function(options) {
    this.setOptions(options);
    this.element = new Element('div');
    this.setType('normal');
    this.hide();
  },

  setType : function(type) {
    var prefix = this.options.classPrefix || '';
    var elm = this.toElement();
    elm.className = prefix + 'message ' + prefix + 'message-'+type;
    if(this.options.globalClassName) {
      elm.addClass(this.options.globalClassName);
    }
    if(this.options.globalClassPrefix) {
      elm.addClass(this.options.globalClassPrefix + 'message');
    }
  },

  toElement : function() {
    return this.element;
  },

  setText : function(text) {
    this.toElement().set('html',text);
  },

  show : function() {
    this.toElement().setStyle('display','block');
  },

  hide : function() {
    this.toElement().setStyle('display','none');
  },

  destroy : function() {
    this.toElement().destroy();
  }

});

})(document.id);
