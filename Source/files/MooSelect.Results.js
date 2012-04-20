(function($) {

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

})(document.id);
