var MooSelect, $mooselect;

(function($) {

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
    var items = [], nodes  = input.childNodes;
    var ELEMENT_NODE = 1;
    for(var i=0;i<nodes.length;i++) {
      var node = nodes[i];
      if(node.nodeType == ELEMENT_NODE) {
        items.push(node);
      }
    };

    var groups = [], options = [];
    var selected = [];

    if(this.isMultiple()) {

    }
    else {
      selected.push(input.selectedIndex ? input.selectedIndex : input.options.selectedIndex);
    }

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

    this.getResults().setResults(results);

    //just in case it wasn't picked up
    if(selected >= 0 && !this.hasSelectedValue()) {
      this.selectOptions(selected);
    }

    if(!this.isMultiple() && this.options.selectFirstOnDefault && !this.hasSelectedValue()) {
      this.selectOptions(0);
    }

    this.fireEvent('populate',[items,results]);
  },

  selectOptions : function(indices) {
    indices = typeOf(indices) == 'array' ? indices : [indices];
    if(this.isMultiple()) {
      var index = indices[0];
      if(index) {
        this.getResults().getResult(index).select();
      }
    }
    else {
      var results = this.getResults().getResults();
      for(var i=0;i<indices.length;i++) {
        var result = results[i];
        if(result) {
          result.select();
        }
      }
    }
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

})(document.id);
