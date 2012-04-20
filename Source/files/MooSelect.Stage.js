(function($) {

MooSelect.Stage = new Class({

  Implements : [Options, Events],

  options : {
    resultClassName : 'stage-result'
  },

  initialize : function(options) {
    this.setOptions(options);
    this.total = 0;
    this.build();
  },

  isMultiple : function() {
    return !!this.options.multiple;
  },

  allowDeselect : function() {
    return this.isMultiple() || this.options.allowDeselectSingle;
  },

  build : function() {
    var prefix = this.options.classPrefix || '';
    klass = prefix + 'stage';
    this.element = new Element('div').set('class',klass);
    this.element.addEvent('click',this.onClick.bind(this));
    this.listElement = new Element('div').set('class',prefix + 'stage-results').inject(this.element,'top');

    if(this.options.globalClassName) {
      this.element.addClass(this.options.globalClassName);
      this.listElement.addClass(this.options.globalClassName);
    }
    if(this.options.globalClassPrefix) {
      this.element.addClass(this.options.globalClassPrefix + 'stage');
      this.listElement.addClass(this.options.globalClassPrefix + 'stage-results');
    }

    if(this.options.placeholder) {
      this.placeholder = new Element('div').set('class',prefix+'placeholder').inject(this.toElement());
      this.placeholder.addEvent('click',this.onClick.bind(this));

      if(this.options.globalClassName) {
        this.placeholder.addClass(this.options.globalClassName);
      }
      if(this.options.globalClassPrefix) {
        this.placeholder.addClass(this.options.globalClassPrefix + 'placeholder');
      }

      this.setPlaceholderText(this.options.placeholder);
    }

    this.arrowContainer = new Element('div',{
      'class' : prefix + 'arrow-background'
    }).inject(this.element);
    if(this.options.globalClassName) {
      this.arrowContainer.addClass(this.options.globalClassName);
    }
    if(this.options.globalClassPrefix) {
      this.arrowContainer.addClass(this.options.globalClassPrefix + 'arrow-background');
    }

    this.arrow = new Element('div',{
      'class' : prefix + 'arrow'
    }).inject(this.arrowContainer);
    if(this.options.globalClassName) {
      this.arrow.addClass(this.options.globalClassName);
    }
    if(this.options.globalClassPrefix) {
      this.arrow.addClass(this.options.globalClassPrefix + 'arrow');
    }
  },

  hasPlaceholder : function() {
    return !!this.placeholder;
  },

  getPlaceholder : function() {
    return this.placeholder;
  },

  setPlaceholderText : function(text) {
    this.getPlaceholder().set('html',text);
  },

  showPlaceholder : function() {
    if(this.hasPlaceholder()) {
      this.getPlaceholder().setStyle('display','block');
    }
  },

  hidePlaceholder : function() {
    if(this.hasPlaceholder()) {
      this.getPlaceholder().setStyle('display','none');
    }
  },

  toElement : function() {
    return this.getElement();
  },

  getElement : function() {
    return this.element;
  },

  getListElement : function() {
    return this.listElement;
  },

  show : function() {
    this.toElement().setStyle('display','block');
  },

  hide : function() {
    this.toElement().setStyle('display','none');
  },

  onClick : function(event) {
    event.stop();
    this.fireEvent('click');
  },

  getTotal : function() {
    return this.total;
  },

  hasResults : function() {
    return this.getTotal() > 0;
  },

  hasResult : function(value) {
    return !! this.getResult(value);
  },

  clear : function() {
    this.results = null;
  },

  getResults : function() {
    return this.results || {};
  },

  getResultValues : function() {
    return Object.keys(this.getResults());
  },

  getResult : function(value) {
    return this.getResults()[value];
  },

  getLastResult : function() {
    var klass = this.options.classPrefix + this.options.resultClassName;
    return (this.toElement().getElements('.'+klass) || []).getLast();
  },

  addResult : function(text,value,animate) {
    if(value == '') {
      return;
    }
    animate = animate == null ? true : animate;
    if(!this.results) {
      this.results = {};
    }
    this.hidePlaceholder();
    if(!this.results[value]) {
      var element = this.buildResultElement(text,value)
      element.inject(this.getListElement());
      if(animate) {
        element.set('opacity',0);
        element.fade('in');
      }
      element.store('value',value);
      this.results[value] = element;

      var prefix = this.options.classPrefix || '';
      var x = element.getElement('.'+prefix+'x');
      var klass = prefix+this.options.resultClassName;
      if(this.allowDeselect()) {
        x.addEvent('click',function(event) {
          event.stop();
          var target = $(event.target);
          target = target.hasClass(klass) ? target : target.getParent('.'+klass);
          var value = target.retrieve('value');
          this.removeResult(value,true);
        }.bind(this));
      }
      else {
        x.destroy();
      }

      this.removeActiveResult();
      this.fireEvent('addResult',[text,value]);
      this.total++;
    }
  },

  onBackspace : function() {
    var active = this.getActiveResult();
    if(!active) {
      var result = this.getLastResult();
      if(result) {
        this.setActiveResult(result);
      }
    }
    else {
      var value = this.activeResult.retrieve('value');
      this.removeResult(value);
    }
  },

  removeResult : function(value,animate) {
    var result = this.getResult(value);
    if(result) {
      var text = result.retrieve('text');
      var D = function() { 
        result.destroy();
        if(!this.hasResults()) {
          this.total = 0;
          this.onNoResults();
        }
        this.fireEvent('removeResult',[text,value]);
      }.bind(this);

      delete this.results[value];
      this.total--;

      if(animate) {
        result.get('tween').start('opacity',0).chain(D);
      }
      else {
        D();
      }
    }
    this.removeActiveResult();
  },

  clearResults : function() {
    var results = this.getResults();
    Object.each(results,function(result) {
      result.destroy();
    });
    this.results = [];
    this.total = 0;
  },

  onNoResults : function() {
    this.fireEvent('noResults');
  },

  removeLastResult : function() {
    var last = this.getLastResult();
    if(last) {
      var value = last.retrieve('value');
      this.removeResult(value);
    }
  },

  getActiveResult : function() {
    return this.activeResult;
  },

  removeActiveResult : function() {
    var result = this.getActiveResult();
    if(result) {
      $(result).removeClass('active');
    }
    delete this.activeResult;
  },

  setActiveResult : function(result) {
    result.addClass('active');
    this.activeResult = result;
  },

  buildResultElement : function(text,value) {
    var prefix = this.options.classPrefix;
    var klass = prefix + this.options.resultClassName;
    var inner = this.buildResultElementHTML(text,value);
    var html = '<span class="'+prefix+'label">' + inner + '</span>';
    var element = new Element('div',{
      'class' : klass,
      'html' : html,
      'events' : {
        'mousedown' : function(event) {
          event.stop();
        },
        'click' : function(event) {
          event.stop();
          var target = $(event.target);
          target = target.hasClass(klass) ? target : target.getParent('.'+klass);
          this.fireEvent('resultClick',[target]);
        }.bind(this)
      }
    }).adopt(new Element('span').addClass(prefix+'x'));
    element.store('text',text);
    if(this.options.globalClassName) {
      element.addClass(this.options.globalClassName);
    }
    if(this.options.globalClassPrefix) {
      element.addClass(this.options.globalClassPrefix + this.options.resultClassName);
    }
    return element;
  },

  buildResultElementHTML : function(text,value) {
    var fn = this.options.customBuildStageResultHTML;
    if(fn) {
      text = fn(text,value);
    }
    return text;
  },

  destroy : function() {
    this.toElement().destroy();
  }

});

})(document.id);
