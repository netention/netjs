$.timeago.settings.allowFuture = true;
$.timeago.settings.strings = {
    prefixAgo: null,
    prefixFromNow: null,
    suffixAgo: "ago",
    suffixFromNow: "from now",
    inPast: 'any moment now',
    seconds: "<1 minute",
    minute: "~1 minute",
    minutes: "%d minutes",
    hour: "~1 hour",
    hours: "~%d hours",
    day: "1 day",
    days: "%d days",
    month: "~1 month",
    months: "%d months",
    year: "~1 year",
    years: "%d years",
    wordSeparator: " ",
    numbers: []
};
$.ajaxSetup({
  cache: true
});

var stack_bottomleft = {"dir1": "right", "dir2": "up", "push": "top"};
var stack_bottomright = {"dir1": "left", "dir2": "up", "push": "top"};

var updateView;

var lastView = null;
var currentView = null;

var Actions = [];
var ActionMenu = {};


function loadCSS(url, med) {
    $(document.head).append(
            $("<link/>")
            .attr({
                rel: "stylesheet",
                type: "text/css",
                href: url,
                media: (med !== undefined) ? med : ""
            })
    );
}

function loadJS(url) {
    $(document.head).append(
            $("<script/>")
            .attr({
                type: "text/javascript",
                src: url
            })
    );
}

function later(f) {
    //setTimeout(f, 0);
    setImmediate(f);
}

function _notifyRemoval() { $(this).remove(); }

function notify(param) {
    PNotify.desktop.permission();
    
    if (typeof param === "string")
        param = { text: param };
    if (!param.text)
        param.text = '';
    if (!param.type)
        param.type = 'info';
    param.animation = 'none';
    param.desktop = {desktop: 'true'};
    param.styling = 'jqueryui';
    //param.desktop = true;
    new PNotify(param).container.click(_notifyRemoval);                                                
}



function addAction(a) {
    if (!a.menu) 	//{ 		console.error('addAction missing menu: ' + a); 	return; 	}
        a.menu = 'Other';
    if (!a.name) {
        console.error('addAction missing name: ' + a);
        return;
    }
    if (!a.accepts) //{ 		console.error('addAction missing accepts: ' + a); 	return; 	}
        a.accepts = function() {
            return false;
        }

    Actions.push(a);
    if (!ActionMenu[a.menu])
        ActionMenu[a.menu] = [];
    ActionMenu[a.menu].push(a);
}

function newContextMenu(s, excludeEmptyMenus, clickCallback) {
    //s = list of objects

    var u = newEle('ul').addClass('ActionMenu');

    _.each(ActionMenu, function(v, k) {
        var menu = k;
        var submenu = newEle('li').append(newEle('a').html(menu));
        var subcontents = newEle('ul').addClass('ActonMenuSubContents');
        submenu.append(subcontents);

        var added = 0;

        _.each(v, function(vv) {
            var a = newEle('a').html(vv.name);

            if (vv.description)
                a.attr('title', vv.description);

            var accepts = vv.accepts(s);

            if (accepts) {
                var clickFunction = function() {
                    if (vv.run) {
                        later(function() {
                            var result = vv.run(s);
                            if (result)
                                notify(result);
                        });
                    }
                    else {
                        notify('"' + vv.name + '" not ready yet.');
                    }

                    if (clickCallback)
                        clickCallback(vv.name);
                }
                a.click(clickFunction);
                added++;
            }
            else {
                if (excludeEmptyMenus)
                    return;

                a.attr({
                    style: 'opacity: 0.4',
                    disabled: 'true'
                });
            }

            newEle('li').append(a).appendTo(subcontents);
        });

        if ((added == 0) && (excludeEmptyMenus))
            return;

        u.append(submenu);

    });

    u.menu();

    return u;
}

var refreshActionContext = _.throttle(function() {
    later(function() {
        var s = [];

        //get selected items from .ObjectSelection
        $('input.ObjectSelection:checked').each(function(index) {
            var aoid = $(this).parent().parent().attr('xid');
            if (aoid) {
                var o = $N.getObject(aoid);
                if (o)
                    s.push(o);
            }
        });

        //jquery menu - http://jqueryui.com/menu/#default

        /*if ($('.ActionMenu').destroy)
         $('.ActionMenu').destroy();*/

        //dont render the menu if the wrapper isnt visible:
        if (!$('#ActionMenuWrapper').is(':visible')) {
            return;
        }

        $('#ActionMenuWrapper').empty();

        if (s.length === 0)
            return;

        var u = newContextMenu(s).addClass('ActionMenuGlobal');

        var selectedLabel = $('<div style="float:right"><i>' + s.length + ' selected. </i></div>');

        var clearButton = $('<button>Clear</button>');
        clearButton.click(function() {
            later(function() {
                $('input.ObjectSelection:checked').each(function(index) {
                    $(this).prop('checked', false);
                });
                refreshActionContext();
            });
        });
        selectedLabel.append(clearButton);

        u.append(selectedLabel);


        $('#ActionMenuWrapper').append(u);
    });
}, configuration.viewUpdateTime[configuration.device || 1][0]);


function updateBrand() {
    if (!$N.myself())
        return;

    $('.brand').attr('alt',$N.myself().name);

    var avatarURL = getAvatarURL($N.myself());
    $('#avatar-img').attr('src', avatarURL);
    $('#toggle-img').attr('src', avatarURL);
}

function updateViewControls() {
    //select the current view in the ViewControls

    //TODO uncheck all that are checked


}

var viewlock = false;
var viewUpdatesBuffered = 0;
function setViewLock(b) {
    if (b) {
        $('#viewpause').hide();
        $('#viewplay').show();
        
        $('#ViewUpdates').show();
        $('#ViewUpdates').html('');
        $('#ViewUpdates').append(newEle('button').html('Update').click(function() {
            later(function() {
                _updateView(true);            
                updateViewLock(0);                
            });
        }).hide());        
    }
    else {
        $('#viewpause').show();
        $('#viewplay').hide();

        $('#ViewUpdates').hide();
    }
    viewlock = b;
}

function updateViewLock(n) {
    if (n!==undefined)
        viewUpdatesBuffered = n;
    
    if (viewUpdatesBuffered > 0) {
        $('#ViewUpdates button').html(viewUpdatesBuffered + ' updates').show();
    }
    else {
        $('#ViewUpdates button').hide();
    }
}

var _firstView = true;
var _forceNextView = false;

function _updateView(force) {
    if (_forceNextView) {
        force = true;
        _forceNextView = false;
    }
    
    updateBrand();
    renderFocus(true);

    //s.saveLocal();

    var view = $N.get('currentView');
    if (!view) {
        if (configuration.initialView) {
            view = configuration.initialView;
        }
        else {
            return;
        }
    }

    var param = null;

    if (view.view) {
        param = _.clone(view);
        view = view.view;
        delete param.view;
    }

    var vw = $('#View');


    if (vw.is(':visible')) {
    }
    else
        return;

    if (viewlock && !force && !_firstView && viewUpdatesBuffered > 0) {
        return;
    }
    if (viewlock) {
        updateViewLock(0);
    }


    if (!force) {
        if ((currentView) && (view === lastView)) {
            if (currentView.onChange) {
                later(currentView.onChange);
                return;
            }
        }
    }
    if (currentView)
        if (currentView.destroy)
            currentView.destroy();
        
    vw.detach();
    later(function() {
        vw.remove();
    });

    lastView = view;    
    
    $('#ViewOptions').empty();
    $('#ViewMenu').empty();


    $('#MainMenu a').removeClass('ViewActive');
    $('#' + view).addClass('ViewActive');

    var v = newDiv('View').appendTo($('body'));


    function indent() {
        v.addClass('overthrow view-indented');
        updateIndent($('#MainMenu').is(":visible"));
    }

    if (view === 'browse') {
        indent();
        currentView = newListView(v);
    }
    else if (view === 'us') {
        indent();
        currentView = newUsView(v);
    }
    else if (view === 'map') {
        v.addClass('overflow-hidden');
        v.addClass('nobg');
        currentView = newMapView(v);
    }
    else if (view === 'trends') {
        indent();
        currentView = newTrendsView(v);
    }
    else if (view === 'graph') {
        v.addClass('overflow-hidden');
        indent(); //should improve rendering performance, to avoid compositing the menu when it redraws        
        currentView = newGraphView(v);
    }
    else if (view === 'wiki') {
        indent();
        currentView = newWikiView(v);
    }
    else if (view === 'options') {
        indent();
        currentView = renderOptions(s, o, v);
    }
    else if (view === 'forum') {
        indent();
        currentView = newForumView(v);
    }
    else if (view === 'share') {
        indent();
        currentView = newShareView(v);
    }
    else if (view === 'templates') {
        indent();
        currentView = newTemplatesView(v);
    }
    else if (view === 'user') {
        indent();
        currentView = newUserView(v, param ? param.userid : null);
    }
    else if (view === 'main') {
        indent();
        currentView = newMainView(v);
    }
    else if (view === 'time') {
        indent();
        currentView = newTimeView(v);
    }
    else if (view === 'notebook') {
        indent();
        currentView = newNotebookView(v);
    }
    else {
        v.html('Unknown view: ' + view);
        currentView = null;
    }

    if (configuration.device == configuration.MOBILE) {
        //auto-hide the menu
        if (!_firstView)
            showAvatarMenu(false);
        else
            _firstView = false;
    }
    _firstView = false;
    
    delete v;

}


function initKeyboard() {
    var views = [];
    $('.ViewSelect').each(function(x) {
        views.push($(this).attr('id'));
    });

    for (var i = 0; i < views.length; i++) {
        var f = function(I) {
            jwerty.key('ctrl+' + (1 + I), function() {
                later(function() {
                    $N.set('currentView', views[I]);
                    updateViewControls();
                });
                return false;
            })
        };
        f(i);
    }

    var viewDelta = function(delta) {
        var currentIndex = _.indexOf(views, $N.get('currentView'));
        var nextIndex = currentIndex + delta;

        if (nextIndex < 0)
            nextIndex = views.length - 1;
        if (nextIndex >= views.length)
            nextIndex = 0;

        later(function() {
            $N.set('currentView', views[nextIndex]);
            updateViewControls();
        });
    };


    jwerty.key('esc', function() {
        toggleAvatarMenu();
        return false;
    });
    jwerty.key('ctrl+[', function() {
        viewDelta(-1);
        return false;
    });
    jwerty.key('ctrl+]', function() {
        viewDelta(+1);
        return false;
    });
}

function viewRead(urlstring) {
    var urls = urlstring.split('+');

    var f = objNew();

    _.each(urls, function(u) {
        var x = objNew();
        x.id = 'read:' + u;
        x.name = u;
        x.addTag(x.id);
        f.addTag(x.id);

        $.get(u, function(h) {
            var ext = u.split('.');
            var type = 'html';
            if (ext.length > 1) {
                ext = ext[ext.length - 1];
                if (ext === 'md')
                    type = 'markdown';
                else if (ext === 'html')
                    type = 'html';
            }

            x.add(type, h);
            $N.notice(x);
        }).error(function(e) {
            x.addDescription('Error Loading', JSON.stringify(e));
            $N.notice(x);
        });
    });


    f.author = $N.id();
    f.focus = 'change';

    $N.set('currentView', 'browse');

    $N.setFocus(f);
    renderFocus(false);

}


function setTheme(t) {
    if (!t)
        t = configuration.defaultTheme;
    if (!_.contains(_.keys(themes), t))
        t = configuration.defaultTheme;

    var oldTheme = $N.get('theme');
    if (oldTheme !== t) {
        $N.save('theme', t);
    }

    $('.themecss').remove();

    var themeURL;
    var inverse = false;
    if (t[0] == '_') {
        t = t.substring(1);
        themeURL = 'theme/' + t + '.css';
        if (t === 'Dark')
            inverse = true;
    }
    else {
        themeURL = 'lib/jquery-ui/1.10.4/themes/' + t + '/jquery-ui.min.css';
        if (t === 'ui-darkness')
            inverse = true;
    }

    $('head').append('<link class="themecss" href="' + themeURL + '" type="text/css" rel="stylesheet"/>');
    if (inverse) {
        $('head').append('<link class="themecss" href="/theme/black-background.css" type="text/css" rel="stylesheet"/>');
    }

}



function popupAboutDialog() {
    $.get('/about.html', function(d) {
        var p = newPopup('About');
        p.html(d);
    });
}




var _reflowView;
function reflowView() {
	var viewWidth;
	if (!$('#FocusEditWrap').is(':visible')) {
		viewWidth = '100%';
	}
	else {		
		var vw = $(window).width() - $('#FocusEditWrap').width() - 12;
		viewWidth = vw + 'px';
	}
	
	$('#View').css('width', viewWidth);
	
    if (!_reflowView) {
        _reflowView = _.debounce(function() {
            later(function() {			
                $('#View').freetile({
                    callback: function() {
                        $('#View').css('height', '100%');
                    }
                });                
            });    
        }, configuration ? configuration.viewUpdateTime[configuration.device][1] : 200);
    }
    
    if ($('#View .tiled').length > 0) {
        _reflowView();
    }
}

function whenResized() {
    var isMobile = window.matchMedia("only screen and (max-width: 700px)");

    configuration.MOBILE = 0;
    configuration.DESKTOP = 1;

    if (isMobile.matches) {
        configuration.device = configuration.MOBILE;
    }
    else {
        configuration.device = configuration.DESKTOP;
    }

    reflowView();
    return true;
}

$('#NotificationArea').html('Loading...');

$(document).ready(function() {

    if (identity()===0) {
        //$('#login').show();
        window.location = '/login';
    }

    if (!configuration.enableAnonymous)
        $('#AnonymousLoginButton').hide();
    
    var themeSelect = $('<select/>');
    for (var k in themes) {
        themeSelect.append($('<option id="' + k + '">' + themes[k] + '</option>'));
    }
    themeSelect.change(function(e) {
        var t = $(this).children(":selected").attr("id");
        setTheme(t);
        return false;
    });

    var langSelect = ('<select id="uilanguage"><option>English</option><option>Español</option> <option>Français</option><option>Русский</option><option>עברית</option><option>العربية</option><option>हिन्दी; हिंदी</option><option>中文(简体)</option><option>日本語</option></select>');
    $('#IdentityPopout').append('<br/>',newDiv().append(themeSelect), newDiv().append(langSelect));

    $(window).resize(whenResized);
    whenResized();



    $('title').html(configuration.siteName);
    $('#loginLogo').attr('src', configuration.loginLogo);
    if (configuration.favicon)
        $('#favicon').attr('href', configuration.favicon);

    var conviews = configuration.views;
    for (var i = 0; i < conviews.length; i++) {
        var c = conviews[i];
        $('#' + c).show();
    }

    $('#openid-open').click(function() {
        $('#password-login').hide();
        $('#openid-login').fadeIn();
    });
    $('#password-open').click(function() {
        $('#openid-login').hide();
        $('#password-login').fadeIn();
    });
    
    
    $('#password-login-login').click(function() {
        var u = $('#login_email').val();
        var ph = hashpassword($('#login_password').val());
        
        $('#password-login-status').html('Authorizing...');
        
        $.post('/login', { username: u, password: ph }, function(r) {
            if (!r) {
                window.location.reload();
            }
            else {
                $('#password-login-status').html(r);
            }
        });
        //window.location.href = '/login?username=' + encodeURIComponent(u) + '&password=' + ph;
    });

    $('.logout').show();

    function newLoginButton() {
        var lb = $('<button>Login</button>');
        lb.click(function() {
            $('#LoadingSplash').show();
        });
        return lb;
    }

    var ii = identity();
    if (ii == ID_UNKNOWN) {
        if (configuration.requireIdentity) {
            $('#LoadingSplash').show();
            return;
        }
        else {
            $('#welcome').html(newLoginButton());
            $('#LoadingSplash').hide();
        }
    }
    else {
        $('#LoadingSplash').hide();
    }

    //add tooltips
    $('.ViewControl').each(function(x) {
        var ti = $(this).attr('title');
        if (ti && ti.length > 0) {
            $(this).prepend(newEle('span').html(ti));
            $(this).attr('title','');
        }
    });

    $('#viewplay').mousedown(function() {
        notify({title: 'Live', text: 'Updates will appear automatically', delay: 1000});
        setViewLock(false);    
    });
    $('#viewpause').mousedown(function() {        
        notify({title: 'Paused', text: 'Updates will be queued', delay: 1000});
        setViewLock(true);    
    });

    $('#close-menu').button();
    $("#ViewSelect .ViewSelect").mousedown(function() {
        var v = $(this);
        var vi = v.attr('id');
        $N.router.navigate(vi, {trigger: false});
        _forceNextView = true;
        $N.set('currentView', vi);
    });

    $('#about-toggle').click(function() {
        $('#about-netention').fadeIn();
    });


    netention(function(schemaURL, $N) {
        $('#NotificationArea').html('System loaded.');

        $N.loadOntology(schemaURL, function() {
            $('#NotificationArea').html('Ontology ready. Loading objects...');

            $N.getUserObjects(function() {
                
                //SETUP ROUTER
                var Workspace = Backbone.Router.extend({
                    routes: {
                        "new": "new",
                        "me": "me", // #help
                        "help": "help", // #help
                        "query/:query": "query", // #search/kiwis
                        "object/:id": "object",
                        "object/:id/focus": "focus",
                        "tag/:tag": "tag",
                        //"new/with/tags/:t":     "newWithTags",
                        "example": "completeExample",
                        "user/:userid": "user",
                        ":view": "view",
                        "read/*url": "read"
                                //"search/:query/:page":  "query"   // #search/kiwis/p7
                    },
                    me: function() {
                        commitFocus($N.myself());
                    },
                    completeExample: function() {
                        commitFocus(exampleObject);
                    },
                    showObject: function(id) {
                        var x = $N.getObject(id);
                        if (x) {
                            newPopupObjectView(x);
                        }
                        else {
                            /*notify({
                             title: 'Unknown object',
                             text: id.substring(0, 4) + '...'
                             });*/
                        }
                    },
                    view: function(view) {
                        $N.set('currentView', view);
                    },
                    user: function(userid) {
                        $N.set('currentView', {view: 'user', userid: userid});
                    },
                    read: function(url) {
                        later(function() {
                            viewRead(url);
                        });
                    }

                });


                updateViewControls();

                $('body.timeago').timeago();

                var viewUpdateMS = configuration.viewUpdateTime[configuration.device][0];
                var viewDebounceMS = configuration.viewUpdateTime[configuration.device][1];
                var firstViewDebounceMS = configuration.viewUpdateTime[configuration.device][2];
                var firstView = true;

                var throttledUpdateView = _.throttle(function() {
                    $('#AvatarButton').addClass('ViewBusy');
                    //later(function() {
                        _updateView();
                        if (firstView) {
                            updateView = _.debounce(throttledUpdateView, viewDebounceMS);
                            firstView = false;
                        }
                        $('#AvatarButton').removeClass('ViewBusy');
                    //});
                }, viewUpdateMS);

                updateView = _.debounce(throttledUpdateView, firstViewDebounceMS);


                /*var msgs = ['I think', 'I feel', 'I wonder', 'I know', 'I want'];
                //var msgs = ['Revolutionary', 'Extraordinary', 'Bodacious', 'Scrumptious', 'Delicious'];
                function updatePrompt() {
                    var l = msgs[parseInt(Math.random() * msgs.length)];
                    $('.nameInput').attr('placeholder', l + '...');
                }
                setInterval(updatePrompt, 7000);
                updatePrompt();
                */
                
                $.getScript(configuration.ui, function(data) {

                    var ii = identity();

                    if (ii === ID_AUTHENTICATED) {
                        $('#NotificationArea').html('Authorized.');
                    }
                    else if (ii === ID_ANONYMOUS) {
                        $('#NotificationArea').html('Anonymous.');
                    }
                    else {
                        $('#NotificationArea').html('Read-only public access.');
                        /*$('.loginlink').click(function() {
                         $('#LoadingSplash').show();
                         nn.hide();
                         });*/
                    }

                    $('#View').show();
                    $('#LoadingSplash2').hide();


                    var alreadyLoggedIn = false;
                    if ((configuration.autoLoginDefaultProfile) || (configuration.connection == 'local')) {
                        var otherSelves = _.filter($N.get("otherSelves"), function(f) {
                            return $N.getObject(f) != null;
                        });
                        if (otherSelves.length >= 1) {
                            $N.become(otherSelves[0]);
                            alreadyLoggedIn = true;
                        }
                    }


                    if (!alreadyLoggedIn) {
                        if (isAnonymous()) {
                            //show profile chooser
                            openSelectProfileModal("Anonymous Profiles");
                        }
                        else if ($N.myself() === undefined) {
                            if (configuration.requireIdentity)
                                openSelectProfileModal("Start a New Profile");
                            else {
                                //$N.trigger('change:attention');
                                updateView();
                            }
                        }
                    }

                    $('#NotificationArea').html('Connecting...');


                    //initKeyboard();

                    var w = new Workspace();
                    $N.router = w;


                    //USEFUL FOR DEBUGGING EVENTS:
                    /*
                     $N.on('change:attention', function() { console.log('change:attention'); });
                     $N.on('change:currentView', function() { console.log('change:currentView'); });
                     $N.on('change:tags', function() { console.log('change:tags'); });
                     $N.on('change:focus', function() { console.log('change:focus', $N.focus() ); });
                     */

                });

            });
        });


    });


});


//http://stackoverflow.com/questions/918792/use-jquery-to-change-an-html-tag
$.extend({
    replaceTag: function(currentElem, newTagObj, keepProps) {
        var $currentElem = $(currentElem);
        var i, $newTag = $(newTagObj).clone();
        if (keepProps) {//{{{
            var newTag = $newTag[0];
            newTag.className = currentElem.className;
            $.extend(newTag.classList, currentElem.classList);
            $.extend(newTag.attributes, currentElem.attributes);
        }//}}}
        $currentElem.wrapAll($newTag);
        $currentElem.contents().unwrap();
        //return node;
    }
});




//Global Prototype Modifications

$.fn.extend({
    replaceTag: function(newTagObj, keepProps) {
        this.each(function() {
            jQuery.replaceTag(this, newTagObj, keepProps);
        });
    }
});


String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var _duid = 0;
/** document unique ID */
function duid() {
    return '_' + (_duid++);
}
function _rgba(r, g, b, a) {
    return 'rgba(' + parseInt(256.0 * r) + ',' + parseInt(256.0 * g) + ',' + parseInt(256.0 * b) + ',' + a + ')';
}


/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r * 255, g * 255, b * 255];
}




function testGC(f) {
    if (f) {
        return;
    }
    
    if ($N.get('currentView') == 'forum') {
        $N.set('currentView', 'browse');
    }
    else {
        $N.set('currentView', 'forum');        
    }
         
    setTimeout(testGC, 1000);
}
function getMemory() {
    var p = window.performance.memory;
    return {
        heapLimit: p.jsHeapSizeLimit/(1024*1024),
        usedHeap: p.usedJSHeapSize/(1024*1024),
        totalHeap: p.totalJSHeapSize/(1024*1024)
    };
}
