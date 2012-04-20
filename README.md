# MooSelect

MooSelect is a full-fledged select, multiple select and autocomplete replacement for HTML forms. This plugin was inspired by jQuery ChosenJS plugin.

With MooSelect, all of your select, multiple select and autocomplete elements will have the same appearance and will function exactly the same.

## Requirements

- MooTools Core 1.4+ (1.3 works too, but there are issues with the setOpacity() visibility so its best to use 1.4)
- MooTools More (Fx.Scroll, Binds, Locale, Class.Refactor)
- MooTools-Formular (optional)
- MooTools-Scour (optional)

## Usage

Here is a quick and dirty example of how to use the plugin:

```javascript
var select = $('select-input');
new MooSelect(select,{

});
```

## More Info

More details and demos can be found here:
http://www.yearofmoo.com/mooselect

## Repository Demos

The repo demos rely on other javascript plugin(s) (which are hosted on github), but are not required for standard use of MooSelect. Therefore the plugins are assigned apart of the repository as git dependencies (which are specified in the .gitdepends file).

To install the demo files, do the following:

1. Clone MooSelect.git

2. Install Git-Concat (https://github.com/matsko/Git-Depend)

3. Run the depend downloader (./.git/bin/gitdepend)
