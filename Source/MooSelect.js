/*
---
description: MooSelect is a full-fledged select, multiple select and autocomplete replacement for HTML forms.

license: MIT License http://www.opensource.org/licenses/mit-license.php

authors:
- Matias Niemelä (matias [at] yearofmoo [dot] com)

home:
- http://www.yearofmoo.com/MooSelect

requires:
- core
- more (Class.Refactor, Fx.Scroll, Locale.js)
- optional (Form.Validator, Formular.js)
- sprite.png
- mooselect.css

provides: 
- MooSelect
- MooSelect.Remote

*/
var MooSelect, $mooselect;

(function($,$$) {

MooSelect = new Class;
MooSelect.extend({

  getNextTabIndex : function(form) {
    var elms = form.getElements('input','select','textarea').filter(function(field) {
      return field.type != 'hidden' && !field.disabled && field.isVisible();
    });
    var index = elms.length;
    elms.each(function(elm) {
      index = Math.max(index,elm.get('tabindex') || 0);
    });
    return ++index;
  },

  hideAllOthers : function(mooselect) {
    Object.each(this.getInstances(),function(moo) {
      if(moo!=mooselect) {
        moo.hide();
      }
    });
  },

  addInstance : function(moo) {
    if(!this.instances) {
      this.instances = {};
    }
    this.instances[moo.getID()]=moo;
  },

  removeInstance : function(moo) {
    var id = moo.getID();
    var instances = this.getInstances();
    if(instances[id]) {
      delete instances[id];
    }
  },

  getInstances : function() {
    return this.instances;
  },

  getInstance : function(id) {
    return this.getInstances()[id];
  }

});

$mooselect = function(key) {
  switch(typeOf(key)) {
    case 'object':
      if(instanceOf(key,MooSelect)) {
        return key;
      }

    case 'element':
      return key.retrieve('MooSelect');

    case 'string':
      return MooSelect.getInstance(key);
  }
}

Locale.define('en-US','MooSelect',{

  messages : {
    noResults : 'No results found for %(SEARCH)',
    loading : 'Searching Please Wait...',
    minSearch : 'Please enter %(MIN) or more characters...',
    otherResult : 'Press enter to create &quot;%(VALUE)&quot; as an option'
  }

});

MooSelect.implement({

  Implements : [Options, Events],

  options : {

    //Element-Spefici
    zIndex : 1000,
    performAutoTabIndexing : true,
    tabIndex : null,

    //Class Related Prefixing
    className : 'container',
    classPrefix : 'MooSelect-',
    globalClassName : null,
    globalClassPrefix : null,

    //Results-Related Options
    selectFirstOnDefault : true,
    allowOtherResult : false,
    allowDeselectSingle : false,
    customBuildResultHTML : null,
    customBuildStageResultHTML : null,

    //Whether to animate the addition of results
    animations : true,
    fireSelectEvents : true,
    disableSearcher : false,

    //Message Locales
    messages : {
      noResults : Locale.get('MooSelect.messages.noResults'),
      otherResult : Locale.get('MooSelect.messages.otherResult')
    }
  },

  initialize : function(element,options) {
    element = $(element);
    element.store('MooSelect',this);

    this.input = element;
    this.multiple = this.input.get('multiple');
    if(this.isMultiple()) {
      this.input.set('multiple','multiple');
      var name = this.input.get('name');
      if(name && !name.test(/\[\]$/)) {
        this.input.set('name',name + '[]');
      }
    }
    options = options || {};
    var messages = options.messages;
    delete options.messages;
    this.setOptions(options);

    if(options.tabIndex==null) {
      options.tabIndex = element.get('tabindex');
      if(options.tabIndex == null && this.options.performAutoTabIndexing) {
        var form = options.form || element.getParent('form');
        if(form) {
          options.tabIndex = MooSelect.getNextTabIndex(form);
        }
      }

      this.options.tabIndex = options.tabIndex;
    }


    if(messages) {
      Object.append(this.options.messages,messages);
    }

    MooSelect.addInstance(this);

    this.build();
    this.populate();
    this.hide();
  },

  build : function() {
    this.buildContainer();
    this.replaceInput();
    this.buildStage();
    this.buildInner();
    this.buildSearcher();
    this.buildResults();
    this.buildMessage();
    this.resizeContainerBasedOnInput();
    this.setupEvents();
  },

  buildContainer : function() {
    var options = this.options;
    var klass = options.classPrefix + options.className + ' ';
    klass += this.isMultiple() ? 'multiple' : 'single';
    this.container = new Element('div',{
      'class':'MooSelectElement ' + klass
    });
    if(options.globalClassName) {
      this.container.addClass(options.globalClassName);
    }
    if(options.globalClassPrefix) {
      this.container.addClass(options.globalClassPrefix + options.className);
    }
    if(options.id) {
      this.container.set('id',options.id);
    }
    if(options.classes) {
      this.container.className += ' ' + options.classes;
    }
    this.container.inject(this.getInput(),'after');
    this.container.store('MooSelect',this);
  },

  getID : function() {
    if(!this.id) {
      this.id = this.getInput().get('id');
      if(!this.id) {
        this.id = 'MooSelect-Instance-' + Math.random();
      }
    }
    return this.id;
  },

  populate : function(input) {
    input = input || this.getInput();
    var options = input.options; 
    var items = input.getElements('> *');
    var groups = [], options = [];
    var selected = input.selectedIndex ? input.selectedIndex : input.options.selectedIndex;

    items.each(function(item) {
      var array = item.get('tag') == 'optgroup' ? groups : options;
      array.push(item);
    });

    var results = [];
    if(groups.length > 0) {
      results = results.append(this.buildGroups(groups));
    }
    if(options.length > 0) {
      results = results.append(this.buildOptions(options));
    }

    //just in case it wasn't picked up
    if(selected >= 0 && !this.hasSelectedValue()) {
      var option = input.getElements('option')[selected];
      if(option) {
        option.selected = true;
      }
    }

    this.getResults().setResults(results);

    if(!this.isMultiple() && this.options.selectFirstOnDefault && !this.hasSelectedValue()) {
      this.getResults().selectFirst();
    }

    this.fireEvent('populate',[items,results]);
  },

  buildGroups : function(groups) {
    return groups.map(function(group) {
      var options = group.getElements('option').map(this.buildOption,this).clean();
      return { 
        'name' : group.get('label'),
        'results' : options,
        'group' : true
      };
    },this);
  },

  buildOptions : function(options) {
    return options.map(this.buildOption,this).clean();
  },

  buildOption : function(option) {
    if(!option.disabled) {
      return {
        'text' : option.text,
        'value' : option.value,
        'selected' : this.isOptionSelected(option)
      };
    }
  },

  isOptionSelected : function(option) {
    return option.selected;
  },

  setupEvents : function() {
    $(document.body).addEvent('click',function(event) {
      this.hide();
    }.bind(this));
    this.getContainer().addEvent('click',function(event) {
      event.stop();
      this.toggle();
    }.bind(this));
    this.getInner().addEvent('click',function(event) {
      event.stop();
    });
  },

  onSpaceKeyInput : function(event) {
    if(this.isHidden()) {
      event.stop();
      this.show();
    }
  },

  buildInner : function() {
    var klass = this.options.classPrefix + 'inner';
    klass += ' ' + (this.isMultiple() ? 'multiple' : 'single');
    this.inner = new Element('div',{
      'class':klass,
      'styles':{
        'position':'absolute',
        'top':-9999,
        'left':-9999
      }
    }).inject(document.body);
    this.setZIndex(this.options.zIndex);
  },

  setZIndex : function(z) {
    this.options.zIndex = z;
    this.inner.setStyle('z-index',z);
  },

  buildStage : function() {
    var options = this.options.stageOptions || {};
    var input = this.getInput();
    options.placeholder = input.get('placeholder') || input.get('data-placeholder') || this.options.placeholder;
    options.classPrefix = this.options.classPrefix;
    options.multiple = this.isMultiple();
    options.allowDeselectSingle = this.options.allowDeselectSingle;
    options.globalClassName = this.options.globalClassName;
    options.customBuildStageResultHTML = this.options.customBuildStageResultHTML;
    options.globalClassPrefix = this.options.globalClassPrefix;
    this.stage = new MooSelect.Stage(options);
    this.stage.addEvents({
      'click' : this.toggle.bind(this),
      'noResults' : function() {
        if(!this.isMultiple()) {
          this.getStage().showPlaceholder();
        }
        this.fireEvent('resultsClear');
      }.bind(this),
      'addResult' : function(text,value) {
        this.repositionResults();
        if(this.isMultiple()) {
          var results = this.getStage().getResultValues();
          this.forceHideResults(results);
        }
        this.fireEvent('addResult',[text,value])
      }.bind(this),
      'resultClick' : function(result) {
        if(!this.isMultiple()) {
          this.toggle();
        }
        this.fireEvent('resultClick',[result]);
      }.bind(this),
      'removeResult' : function(text,value) {
        if(this.isMultiple()) {
          this.repositionResults();
          this.forceShowResults();
          var results = this.getStage().getResultValues();
          this.forceHideResults(results);
          this.updateSelectedInputValues();
        }
        else {
          this.clearSelectedInputValue();
        }
        this.fireEvent('removeResult',[text,value])
      }.bind(this)
    });
    $(this.stage).inject(this.getContainer(),'top');
  },

  buildSearcher : function() {
    options = this.options.searcherOptions || {};
    options.classPrefix = this.options.classPrefix;
    options.tabIndex = this.options.tabIndex;
    options.globalClassName = this.options.globalClassName;
    options.globalClassPrefix = this.options.globalClassPrefix;
    this.searcher = new MooSelect.Searcher(options);
    this.searcher.addEvents({
      'emptyBackspace' : this.onEmptyBackspace.bind(this),
      'backspace' : this.onBackspace.bind(this),
      'search' : this.filterResultsFromSearch.bind(this),
      'clear' : this.filterResultsFromSearch.bind(this),
      'space' : this.onSpaceKeyInput.bind(this),
      'enter' : function() {
        if(this.isVisible()) {
          this.selectAndClose();
        }
        else {
          this.show();
        }
      }.bind(this),
      'up' : this.moveUp.bind(this),
      'down' : this.moveDown.bind(this),
      'escape' : function() {
        this.hide();
        this.hover();
      }.bind(this),
      'blur' : function() {
        this.hide();
      }.bind(this),
      'focus' : this.toggleFocus.bind(this),
      'input' : this.focus.bind(this)
    });

    if(this.options.disableSearcher) {
      this.searcher.disable();
    }

    var container = $(this.isMultiple() ? this.getStage() : this.getInner());
    $(this.searcher).inject(container,'bottom');
  },

  buildResults : function() {
    var options = this.options.resultsOptions || {};
    options.multiple = this.isMultiple();
    options.classPrefix = this.options.classPrefix;
    options.customBuildResultHTML = this.options.customBuildResultHTML;
    this.results = this.buildResultsObject(options);
    this.results.addEvents({
      'select' : function(text,value) {
        this.onSelect(text,value);
        this.hide();
        this.hover();
        this.fireEvent('select',[text,value]);
      }.bind(this),
      'linger' : function() {
        this.stopHideDelay();
      }.bind(this),
      'empty' : this.onEmpty.bind(this)
    });
    $(this.results).inject(this.getInner(),'bottom');
  },

  buildResultsObject : function(options) {
    options.globalClassName = this.options.globalClassName;
    options.globalClassPrefix = this.options.globalClassPrefix;
    return new MooSelect.Results(options);
  },

  buildMessage : function() {
    var options = this.options.messageOptions || {};
    options.classPrefix = this.options.classPrefix;
    options.globalClassName = this.options.globalClassName;
    options.globalClassPrefix = this.options.globalClassPrefix;
    this.message = new MooSelect.Message(options);
    $(this.message).inject(this.getInner(),'bottom');
  },

  getMessage : function() {
    return this.message;
  },

  replaceInput : function() {
    var input = this.getInput();
    var sizes = input.getSize();
    this.inputWidth = sizes.x;
    this.inputHeight = sizes.y;
    input.setStyles({
      display : 'none'
    });
    input.set('tabindex','');
    input.store('MooSelect',this);
    if(input.hasClass('required')) {
      input.store('Form.Validator-proxy',this.getContainer());
      input.store('Formular-element-proxy',this.getContainer());
      input.addClass('validate-mooselect');
    }
    if(!this.isMultiple()) {
      var option = new Element('option',{
        'value':'',
        'class':'mooselect-null'
      });
      option.inject(this.getInput(),'top');
    }
  },

  isMultiple : function() {
    return this.multiple;
  },

  getInputWidth : function() {
    return this.inputWidth;
  },

  getInputHeight : function() {
    return this.inputHeight;
  },

  resizeContainerBasedOnInput : function() {
    this.getContainer().setStyles({
      'width' : this.getInputWidth()
    });

    var stage = $(this.getStage());
    var height = stage.getSize().y;

    var inner = this.getInner();
    inner.setStyles({
      'top':height
    });
  },

  afterShow : function() {
    this.fireEvent('show');
  },

  afterHide : function() {
    this.fireEvent('hide');
  },

  repositionResults : function() {
    var container = this.getContainer();
    var pos = container.getPosition();
    var x = pos.x;
    var y = pos.y;
    var width = container.getSize().x-2;
    var height = $(this.getStage()).getSize().y;
    y += height;
    this.getInner().setStyles({
      'top':y,
      'left':x,
      'width':width
    });
  },

  hideInner : function() {
    this.getInner().setStyles({
      'left':-9999,
      'top':-9999
    });
  },

  forceHideResults : function(results) {
    var that = this.getResults();
    results.each(that.forceHideResult,that); //hide the others
  },

  forceShowResults : function(results) {
    var that = this.getResults();
    results = results || that.getResults();
    results.each(that.forceShowResult,that);
  },

  toggleFocus : function() {
    if(!this.isMultiple() && !this.isVisible()) {
      this.hover();
    }
    else {
      this.focus();
    }
  },

  show : function() {
    var container = this.getContainer();
    var inner = this.getInner();
    this.stopHideDelay();
    container.addClass('open');
    inner.addClass('open');
    container.removeClass('hover');
    container.removeClass('closed');
    this.getMessage().hide();
    this.getResults().show();
    if(!this.isMultiple() && !this.getStage().hasResults()) {
      this.getStage().showPlaceholder();
    }
    else {
      this.getStage().hidePlaceholder();
    }
    this.repositionResults();
    this.scrollToHoverResult();
    this.getStage().removeActiveResult();
    this.afterShow();
    this.focus();
    MooSelect.hideAllOthers(this);
  },

  focus : function() {
    if(this.isVisible()) {
      this.stopHideDelay();
    }
    else if(this.isHovering()) {
      this.show();
    }
    else {
      this.hover();
    }
    this.getSearcher().getInput().focus();
  },

  isHovering : function() {
    return this.getContainer().hasClass('hover');
  },

  hover : function() {
    this.getContainer().addClass('hover');
  },

  blur : function() {
    this.hide();
  },

  hide : function() {
    var inner = this.getInner();
    var container = this.getContainer();
    container.removeClass('open');
    container.removeClass('hover');
    container.addClass('closed');
    this.hideInner();
    this.getResults().hide();
    this.stopHideDelay();
    this.clearSearch();
    this.getStage().removeActiveResult();

    if(!this.getStage().hasResults()) {
      this.getStage().showPlaceholder();
    }

    this.afterHide();
  },

  stopHideDelay : function() {
    if(this.hideTimer) {
      clearTimeout(this.hideTimer);
      delete this.hideTimer;
    }
  },

  delayHide : function() {
    this.stopHideDelay();
    this.hideTimer = this.hide.delay(100,this);
  },

  toggle : function() {
    if(!this.isVisible()) {
      this.show();
    }
    else {
      this.hide();
      this.hover();
    }
  },

  isHidden : function() {
    return this.getContainer().hasClass('closed');
  },

  isVisible : function() {
    return !this.isHidden();
  },

  isSearcherDisabled : function() {
    return this.getSearcher().isDisabled();
  },

  getInput : function() {
    return this.input;
  },

  setSelectedInputValue : function(value) {
    var index, option, input = this.getInput(), options = input.getElements('option');
    for(var i=1;i<options.length;i++) {
      options.selected = false;
      if(options[i].value == value) {
        index = i;
        option = options[i];
        break;
      }
    }
    if(index > 0) {
      if(index != input.selectedIndex) {
        input.selectedIndex = index;
        if(this.options.fireSelectEvents) {
          input.fireEvent('change');
        }
        this.fireEvent('change');
      }
    }
    else {
      input.selectedIndex = 0;
    }
  },

  clearSelectedInputValue : function() {
    this.setSelectedInputValue(null);
  },

  updateValues : function() {
    this.isMultiple() ? this.updateSelectedInputValues() : this.setSelectedInputValue();
  },

  updateSelectedInputValues : function() {
    var values = Array.clone(this.getStage().getResultValues());
    var input = this.getInput();
    input.getElements('option').each(function(option) {
      option.selected = false;
      var index = values.indexOf(option.value);
      if(index>=0) {
        option.selected = true;
        delete values[index];
      }
    });
    values = values.clean();
    if(values.length > 0) { //some left over
      this.registerNewInputOptions(values,true);
    }
    if(this.options.fireSelectEvents) {
      input.fireEvent('change');
    }
    this.fireEvent('change');
  },

  registerNewInputOptions : function(options,selected) {
    selected = selected || true;
    this.getInput().adopt(options.map(function(option) {
      return new Element('option',{
        'selected' : selected,
        'value' : option
      });
    }));
  },

  getContainer : function() {
    return this.container;
  },

  getStage : function() {
    return this.stage;
  },

  getInner : function() {
    return this.inner;
  },

  getResults : function() {
    return this.results;
  },

  getSearcher : function() {
    return this.searcher;
  },

  hideResults : function() {
    this.getResults().hide();
  },

  showResults : function() {
    this.getResults().show();
  },

  search : function(text) {
    this.getMessage().hide();
    this.getSearcher().search(text);
  },

  clearSearch : function() {
    this.getSearcher().clearValue();
  },

  filterResultsFromSearch : function(text) {
    this.getMessage().hide();
    this.getStage().removeActiveResult();
    var results = this.getResults();
    results.filter(text || '');
    results.show();
    var result = results.getFirstOrHoverResult();
    if(result) {
      results.scrollToHoverResult(result);
    }
  },

  clearResults : function() {
    this.getResults().clear();
  },

  selectAndClose : function() {
    var option = this.getResults().getFirstOrHoverResult();
    if(option) {
      this.select(option);
    }
    else if(this.options.allowOtherResult) {
      var value = this.getSearcher().getValue();
      if(value.length > 0) {
        this.onOtherResultSelection(value);
      }
    }
    this.hide();
    this.hover();
  },

  onOtherResultSelection : function(value) {
    this.registerNewInputOptions([value]);
    var prefix = this.options.otherResultPrefix || 'other-';
    var object = this.buildOption({
      'text' : value,
      'value' : value,
      'selected' : true
    });
    this.getResults().setResults([object]);
    this.fireEvent('otherResult',[value]);
  },

  select : function(option) {
    this.getResults().select(option);
  },

  selectByValue : function(value) {
    var result = this.getResults().getResultByValue(value);
    if(result) {
      this.select(result);
    }
  },

  moveUp : function() {
    this.getStage().removeActiveResult();
    this.getResults().hoverPrevious();
  },

  moveDown : function() {
    this.getStage().removeActiveResult();
    this.getResults().hoverNext();
  },

  scrollToSelected : function() {
    this.getResults().scrollToSelected();
  },

  scrollToHoverResult : function() {
    this.getResults().scrollToHoverResult();
  },

  onSelect : function(text,value) {
    var stage = this.getStage();
    var multi = this.isMultiple();

    if(!multi) {
      stage.clearResults();
    }

    stage.addResult(text,value,this.isMultiple());
    if(multi) {
      this.updateSelectedInputValues();
    }
    else {
      this.setSelectedInputValue(value);
    }
  },

  onEmpty : function() {
    var search = this.getSearcher().getValue();
    if(this.options.allowOtherResult) {
      var message = this.getMessage();
      message.setType('other-result');
      text = this.options.messages.otherResult;
      text = text.replace('%(VALUE)','<strong>'+search+'</strong>');
      message.setText(text);
      message.show();
    }
    else {
      var message = this.getMessage();
      var text = this.options.messages.noResults;
      text = text.replace('%(SEARCH)',search);
      message.setType('empty');
      message.setText(text);
      message.show();
      this.getResults().hide();
      this.fireEvent('noResults');
    }
  },

  onEmptyBackspace : function() {
    if(this.isMultiple()) {
      this.getStage().onBackspace();
    }
  },

  onBackspace : function() {
    this.getResults().show();
  },

  hasSelectedValue : function() {
    return this.getStage().getResultValues().length > 0;
  },

  destroy : function() {
    MooSelect.removeInstance(this);
    this.getInput().eliminate('MooSelect');
    this.getMessage().destroy();
    this.getResults().destroy();
    this.getSearcher().destroy();
    this.getStage().destroy();
    this.getInner().destroy();
    this.getContainer().destroy();
  },

  revert : function() {
    this.destroy();
    this.getInput().setStyles({
      'position':'static'
    });
  }

});

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

MooSelect.Results = new Class({

  Implements : [Options, Events],

  options : {
    height : 200,
    scrollerOptions : {
      link : 'cancel',
      offset : {
        y : -50
      }
    }
  },

  initialize : function(options) {
    this.setOptions(options);
    this.build();
    this.resize();
  },

  build : function() {
    var klass = this.options.classPrefix || '';
    klass += 'results';
    this.container = new Element('div').set('class',klass);
    if(options.globalClassName) {
      this.container.addClass(this.options.globalClassName);
    }
    if(options.globalClassPrefix) {
      this.container.addClass(this.options.globalClassPrefix + 'results');
    }
    this.buildScroller();
  },

  buildScroller : function() {
    this.scroller = new Fx.Scroll(this.getContainer(),this.options.scrollerOptions);
    this.scroller.scrollToElement = function(element) {
      var pos = element.getPosition().y;
      var base = this.toElement().getPosition().y;
      var y = Math.abs(base - pos) + this.scroller.options.offset.y;
      this.scroller.set.apply(this.scroller,[0,y]);
    }.bind(this);
  },

  resize : function() {
    this.getContainer().setStyles({
      'max-height' : this.options.height
    });
  },

  getContainer : function() {
    return this.container;
  },

  toElement : function() {
    return this.getContainer()
  },

  setResults : function(results,ajax) {
    results.each(function(result) {
      if(result.group) {
        this.addResultGroup(result.name,result.results);
      }
      else if(result.value.length > 0) {
        var object = this.buildResult(result);
        this.addResult(object,result.selected);
      }
    },this);
  },

  forceHideResult : function(result) {
    if(typeOf(result) == 'string') {
      result = this.getResultByValue(result);
    }
    if(result) {
      result.forceHide();
    }
  },

  forceShowResult : function(result) {
    result.forceShow();
  },

  isMultiple : function() {
    return this.options.multiple;
  },

  addResultGroup : function(name,options) {
    if(!this.groups) {
      this.groups = [];
    }

    var group = this.buildGroup(name).inject(this.toElement());
    this.groups.push(group);

    var results = [];
    options.each(function(res) {
      result = this.buildResult(res);
      results.push(result);
      this.addResult(result,res.selected,group);
    },this);

    group.store('results',results);
    group.getResults = function() {
      return $(this).retrieve('results');
    }.bind(group);
    group.show = function() {
      $(this).setStyle('display','block');
    }.bind(group)
    group.hide = function() {
      $(this).setStyle('display','none');
    }.bind(group)
  },

  buildGroup : function(name) {
    var klass = this.options.classPrefix + 'group';
    return new Element('div').set('class',klass).set('html',name);
  },

  getGroups : function() {
    return this.groups || [];
  },

  buildResult : function(result) {
    return new MooSelect.Result(result.text,result.value,{
      'globalClassName' : this.options.globalClassName,
      'globalClassPrefix' : this.options.globalClassPrefix,
      'rawData' : result,
      'customBuildResultHTML' : this.options.customBuildResultHTML ? this.options.customBuildResultHTML : null,
      'classPrefix' : this.options.classPrefix,
      'onHover' : this.onHover.bind(this),
      'onBlur' : this.onBlur.bind(this),
      'onSelect' : this.onSelect.bind(this),
      'onClick' : function() {
        this.fireEvent('click');
      }.bind(this),
      'onLinger' : function() {
        this.fireEvent('linger');
      }.bind(this)
    });
  },

  addResult : function(result,selected,group) {
    if(!this.results) {
      this.results = [];
    }
    if(!this.resultExists(result)) {
      if(group) {
        result.setGroup(group);
      }
      $(result).store('index',this.getTotalResults());
      this.getContainer().adopt($(result));
      this.results.push(result);
      if(selected) {
        result.select();
      }
    }
  },

  resultExists : function(result) {
    return this.getResults().some(function(res) {
      return res.equalTo(result);
    });
  },

  getResults : function() {
    return this.results || [];
  },

  getResult : function(index) {
    return this.getResults()[index];
  },

  getResultByValue : function(value) {
    var results = this.getResults();
    for(var i=0;i<results.length;i++) {
      var result = results[i];
      if(result.matches(value)) {
        return result;
      }
    }
  },

  getFirstResult : function() {
    var results = this.getResults() || [];
    for(var i=0;i<results.length;i++) {
      if(results[i].isVisible()) {
        return results[i];
      }
    }
  },

  getLastResult : function() {
    return (this.getResults().filter(function(result) {
      return result.isVisible();    
    }) || []).getLast();
  },

  hasResults : function() {
    return this.getTotalResults() > 0;
  },

  getTotalVisibleResults : function() {
    return this.getResults().filter(function(result) {
      return result.isVisible();
    }).length;
  },

  getTotalResults : function() {
    return this.getResults().length;
  },

  getElements : function() {
    return this.elements;
  },

  clear : function() {
    this.results = null;
    this.getElements().destroy();
  },

  hide : function() {
    this.getContainer().setStyle('display','none');
    this.matchSelectedAndHover();
  },

  show : function() {
    this.getContainer().setStyle('display','block');
  },

  filter : function(text) {
    if(text == '' || text == null) {
      this.filterBlank();
    }
    else {
      this.getResults().each(function(result) {
        result.contains(text) ? result.show() : result.hide();
      },this);
      this.filterGroups();
    }

    if(this.isEmpty()) {
      this.onEmpty();
    }
    else {
      var hover = this.getHoverResult();
      if(!hover || !hover.isVisible()) {
        this.hoverFirstResult();
      }
    }
  },

  filterBlank : function() {
    try {
      this.getGroups().invoke('show');
      this.getResults().invoke('show');
    }
    catch(e) {}
  },

  isEmpty : function() {
    return !this.getResults().some(function(result) {
      return result.isVisible();
    });
  },

  onEmpty : function() {
    this.fireEvent('empty');
  },

  filterGroups : function() {
    this.getGroups().each(function(group) {
      group.getResults().some(function(result) {
        return result.isVisible();
      }) ? group.show() : group.hide();
    }.bind(this));
  },

  getHoverIndex : function() {
    return this.hoverIndex == null ? -1 : this.hoverIndex;
  },

  hoverNext : function() {
    var results = this.getResults(), index = this.getHoverIndex(), result;
    var total = results.length;
    for(var i=index+1;i!=index;i++) {
      i %= total;
      var result=results[i];
      if(result.isVisible()) {
        result = result;
        break;
      }
    }
    if(result) {
      this.hover(result);
    }
  },

  hoverPrevious : function() {
    var results = this.getResults(), index = this.getHoverIndex(), result;
    var total = results.length;
    for(var i=index-1;i!=index;i--) {
      i = i < 0 ? total-1 : i;
      var result=results[i];
      if(result.isVisible()) {
        result = result;
        break;
      }
    }
    if(result) {
      this.hover(result);
    }
  },

  hover : function(result) {
    result.hover();
    this.hoverIndex = $(result).retrieve('index');
  },

  hoverFirstResult : function() {
    var result = this.getFirstResult();
    if(result) {
      this.hover(result);
    }
  },

  onBlur : function(result) {

  },

  onHover : function(result) {
    var index = $(result).retrieve('index');
    if(index != this.getHoverIndex()) {
      this.blurAll(result);
      this.scrollToHoverResult(result);
    }
  },

  deSelectAll : function(skip) {
    this.getResults().each(function(result) {
      if(result != skip) {
        this.deSelect(result);
      }
    },this);
  },

  blurAll : function(skip) {
    this.getResults().each(function(result) {
      if(result != skip) {
        result.blur();
      }
    },this);
  },

  deSelect : function(result) {
    result.deSelect();
  },

  matchSelectedAndHover : function() {
    var selected = this.getSelected();
    if(selected) {
      var index = $(selected).retrieve('index');
      selected.hover();
      this.hoverIndex = index;
    }
  },

  getScroller : function() {
    return this.scroller;
  },

  getSelected : function() {
    return (this.getResults().filter(function(result) {
      return result.isSelected();
    }) || [null])[0];
  },

  getHoverResult : function() {
    return this.getResult(this.hoverIndex);
  },

  getFirstOrHoverResult : function() {
    if(!this.isEmpty()) {
      return this.getHoverResult() || this.getResult(0);
    }
  },

  selectFirst : function() {
    var result = this.getResult(0)
    if(result) {
      result.select();
    }
  },

  scrollToSelected : function(result) {
    var selected = result || this.getSelected();
    if(selected) {
      this.getScroller().scrollToElement($(selected));
    }
  },

  scrollToHoverResult : function(result) {
    var hover = result || this.getHoverResult();
    if(hover) {
      this.getScroller().toElement($(hover));
    }
  },

  select : function(result) {
    result.select();
  },

  onSelect : function(result) {
    this.blurAll(result);
    this.deSelectAll(result);
    var text = result.getText();
    var value = result.getValue();
    var index = $(result).retrieve('index');
    result.hover();
    this.hoverIndex = index;
    this.fireEvent('select',[text,value]);
  },

  destroy : function() {
    this.getContainer().destroy();
  }

});

MooSelect.Remote = new Class({

  Extends : MooSelect,

  options : {
    filterResults : false,
    hideResultsWhenSearching : true,
    mergeResults : false,
    cache : true,
    minSearchLength : 3,

    messages : {
      loading : Locale.get('MooSelect.messages.loading'),
      minSearch : Locale.get('MooSelect.messages.minSearch')
    }
  },

  initialize : function(element,options) {
    options = options || {};
    options.disableSearcher = false;
    options.remoteOptions = options.remoteOptions || {};
    if(options.url) {
      options.remoteOptions.url = options.url;
      delete options.url;
    }

    Object.append(options.remoteOptions,{
      minSearchLength : this.options.minSearchLength,
      filterResults : this.options.filterResults,
      hideResultsWhenSearching : this.options.hideResultsWhenSearching,
      mergeResults : this.options.mergeResults,
      cache : this.options.cache
    });

    this.parent(element,options);
  },

  onResponse : function() {
    this.hideMessage();
  },

  hideMessage : function() {
    this.getMessage().hide();
  },

  onLoading : function() {
    var message = this.getMessage();
    message.setType('loading');
    message.setText(this.options.messages.loading);
    message.show();
  },

  onMinSearch : function() {
    if(this.options.messages.minSearch && !this.getResults().hasResults()) {
      var message = this.getMessage();
      var text = this.options.messages.minSearch;
      text = text.replace('%(MIN)',this.options.minSearchLength);
      message.setType('min');
      message.setText(text);
      message.show();
    }
  },

  show : function() {
    this.parent();
    this.onMinSearch();
  },

  buildResults : function() {
    this.parent();
    this.getResults().addEvents({
      'loading':this.onLoading.bind(this),
      'requestComplete':this.onResponse.bind(this),
      'results':this.hideMessage.bind(this),
      'minSearch':this.onMinSearch.bind(this)
    });
  },

  buildResultsObject : function(options) {
    options = options || {};
    Object.append(options,this.options.remoteOptions);
    options.classPrefix = this.options.classPrefix;
    options.globalClassName = this.options.globalClassName;
    options.globalClassPrefix = this.options.globalClassPrefix;
    var object = new MooSelect.Results.Remote(options);
    object.performFinalSearchResultsFilter = this.filterResultsWithStageResults.bind(this);
    return object;
  },

  filterResultsWithStageResults : function(values) {
    var stage = this.getStage();

    var results = [];
    values.each(function(value) {
      if(value.group) {
        var group = Object.clone(value);
        group.results = [];
        for(var i=0;i<value.results.length;i++) {
          var v = value.results[i];
          if(!stage.hasResult(v.value)) {
            group.results.push(v);
          }
        }
        if(group.results.length > 0) {
          results.push(group);
        }
      }
      else if(!stage.hasResult(value.value)) {
        results.push(value);
      }
    });

    return results;
  },

  setSelectedInputValue : function(value) {
    var options = this.getInput().getElements('option').map(function(option) {
      return option.value;
    });
    if(options.indexOf(value)==-1) {
      this.registerNewInputOptions([value]);
    }
    this.parent(value);
  }

});

MooSelect.Results.Remote = new Class({

  Extends : MooSelect.Results,

  options : {
    url : null,
    requestSearchParam : 'q',
    requestClass : Request.JSON,
    requestOptions : {
      method : 'GET'
    },
    requestResponseHandler : null,
    cache : true
  },

  initialize : function(options) {
    this.parent(options);
    this._filter = this.filter.bind(this);
    this.filter = this.$filter.bind(this);
    this.clearCache();
    if(this.options.preloadSearch != null) {
      this.filter(this.options.preloadSearch,true);
    }
  },

  $filter : function(search,skipLength) {
    if(!this._filter) {
     this._filter = this.parent.bind(this);
    }
    search = search || '';
    var length = skipLength ? 0 : this.options.minSearchLength;
    if(search.length >= length) {
      this.searchText = search;
      var cache = this.getCachedResponse(search);
      if(cache) {
        this.onRequestSuccess.apply(this,cache);
      }
      else {
        var request = this.getRequester();
        request.cancel();
        request.options.url = this.prepareSearchURL(search);
        request.options.data = this.prepareSearchData(search);
        request.send();
      }
    }
    else {
      this.fireEvent('minSearch');
    }
  },

  prepareSearchData : function(text) {
    var data;
    var fn = this.options.dataPrepareFn;
    if(fn && typeOf(fn) == 'function') {
      data = fn(text);
    }
    else {
      data = {};
      var key = this.options.requestSearchParam;
      data[key] = text;
    }
    return data;
  },

  prepareSearchURL : function(search) {
    var url = this.getURL();
    var fn = this.options.urlPrepareFn;
    if(fn) {
      url = fn(url,search);
    }
    return url;
  },

  getCachedResponse : function(search) {
    return this.cache[search];
  },

  cacheResponse : function(search,args) {
    this.cache[search]=args;
  },

  clearCache : function() {
    this.cache = {};
  },

  getURL : function() {
    return this.options.url || this.options.requestOptions.url;
  },

  getRequester : function() {
    if(!this.requester) {
      var fn = this.options.requestResponseHandler;
      if(fn) {
        this.handleResponse = fn.bind(this);
      }

      var C = this.options.requestClass;
      var options = this.options.requestOptions || {};
      options.url = this.getURL();
      this.requester = new C(options);
      this.requester.addEvents({
        'success' : this.onRequestSuccess.bind(this),
        'request' : this.onRequestLoading.bind(this),
        'failure' : this.onRequestFailure.bind(this),
        'complete' : this.onRequestComplete.bind(this),
        'cancel' : this.onRequestCancel.bind(this)
      });
    }
    return this.requester;
  },

  getSearchText : function() {
    return this.searchText;
  },

  handleResponse : function(json) {
    return json;
  },

  onRequestCancel : function() {
    this.fireEvent('requestCancel');
  },

  onRequestComplete : function() {
    this.fireEvent('requestComplete');
  },

  onRequestFailure : function() {
    this.onRequestEmpty();
    this.fireEvent('requestFailure');
  },

  onRequestEmpty : function() {
    this.setResults([]);
    this.fireEvent('empty');
    this.fireEvent('requestEmpty');
  },

  onRequestLoading : function() {
    if(this.options.hideResultsWhenSearching) {
      this.hide();
    }
    this.fireEvent('loading');
    this.fireEvent('requestLoading');
  },

  sanitizeResult : function(result) {
    if(result.group) {
      result.results = result.results.map(this.sanitizeResult,this);
    }
    else {
      delete result.selected;
      result.text = result.text.trim();
      result.value = result.value.toString();
    }
    return result;
  },

  performFinalSearchResultsFilter : function(results) { //this method is meant to be overridden
    return results;
  },

  onRequestSuccess : function() {
    this.cacheResponse(this.getSearchText(),arguments);

    var results = this.handleResponse.apply(this,arguments) || [];
    results = results.map(this.sanitizeResult,this);
    results = this.performFinalSearchResultsFilter(results);

    if(!this.options.mergeResults) {
      this.results = null;
      this.getContainer().empty();
    }
    this.setResults(results);
    if(results.length == 0) {
      this.onRequestEmpty();
    }
    else {
      if(this.options.hideResultsWhenSearching) {
        this.show();
      }
      if(this.options.filterResults) {
        this._filter(this.getSearchText());
      }
      if(this.getTotalResults() > 0) {
        this.fireEvent('results');
      }
      this.hoverFirstResult();
      this.fireEvent('requestSuccess',[results,arguments]);
    }
  }

});

if(Form && Form.Validator && Form.Validator.add) {

  Form.Validator.add('validate-mooselect',{
    errorMsg : Locale.get('FormValidator.required'),
    test : function(select) {
      return select.retrieve('MooSelect').hasSelectedValue();
    }
  });

  Class.refactor(Form.Validator,{

    initialize : function(form,options) {
      this.previous(form,options);
      this.setupMooSelectEvents();
    },

    setupMooSelectEvents : function() {
      this.addEvents({
        'elementFail':function(elm,array) {
          if(elm.hasClass('validate-mooselect')) {
            this.onInvalidMooSelect(elm);
          }
        }.bind(this),
        'elementPass':function(elm,array) {
          if(elm.hasClass('validate-mooselect')) {
            this.onValidMooSelect(elm);
          }
        }.bind(this)
      });
    },

    validateField : function(field,force) {
      var former = this.options.ignoreHidden;
      this.options.ignoreHidden = false;
      var result = this.previous(field,force);
      this.options.ignoreHidden = former;
      return result;
    },

    onValidMooSelect : function(element) {
      var moo = element.retrieve('MooSelect');
      var container = moo.getContainer();
      container.addClass('validation-passed');
      container.removeClass('validation-failed');
    },

    onInvalidMooSelect : function(element) {
      var moo = element.retrieve('MooSelect');
      var container = moo.getContainer();
      container.addClass('validation-failed');
      container.removeClass('validation-passed');
    }

  });

}

})(document.id,$$);
