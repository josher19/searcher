/* Get all links in the document */
var slink = jQuery.map(document.links, function(link, n) {
    return {
        'txt': jQuery.trim(link.textContent.toLowerCase()),
        'link': link,
        'position': n,
        toString: function() {
            return "[" + this.txt + "](" + this.link + ")"
        }
    }
});

/** html5 shim */
if (!Array.prototype.filter) {
    Array.prototype.filter = function(fn) {
        for (var i = 0, res = [], len = this.length; i < len; i += 1) {
            if (fn(this[i], i, this)) {
                res.push(this[i]);
            }
        }
        return res;
    };
}


/** exact title search */
function xmatch(keyword) {
    return slink.filter(function(it, n) {
        return it.txt.indexOf(keyword) > -1
    })
}

/** exact title with weights */
function xmatchwt(keyword) {
    return slink.filter(function(it, n) {
        it.wt = it.txt.indexOf(keyword);
        it.wt2 = (1 + it.txt.length);
        return it.wt > -1
    }).sort(function(a, b) {
        return a.wt - b.wt || a.wt2 - b.wt2
    })
}

/** inexact title search - find up to 12 matches */
function quicksearch(keyword) {
    return slink.sort(function(a, b) {
        return jaroWinklerDistance(keyword, b.txt) - jaroWinklerDistance(keyword, a.txt);
    }).slice(0, 12).filter(uniq);
}

/** Find exact match or close matches */
function searchKeyword(keyword) {
    keyword = keyword.toLowerCase();
    var results = xmatch(keyword);
    if (!results || !results.length) results = quicksearch(keyword);
    return results;
}

// Example usage: var ss = searchKeyword("mba"); linkEqual(ss[0], ss[1]); 
function linkEqual(a, b) {
    return a.txt === b.txt && a.link.href === b.link.href;
}

/** Find unique elements on a sorted list */
function uniq(it, n, list) {
    return !n || !linkEqual(it, list[n - 1])
}
slink = slink.sort().filter(uniq);

// Convert Array to datalist with options. Returned as jQuery object.
// Example usage: toDatalist(slink).html()
function toDatalist(slink) {
    var list = jQuery('<datalist>');
    jQuery.map(jQuery.map(slink, function(it) {
        return jQuery.trim(it.link.textContent)
    }).filter(function(it) {
        return it
    }), function(it) {
        var op = jQuery('<option/>');
        op.attr('value', it);
        /* could also append it as text */
        return list.append(op);
    });
    return list;
}

// TODO
// 1) Tranform images to ALT tags
// 2) Could also match url with item.link.href 
// and combine them using Fuzzy Logic: VERY(exact title) + SOMEWHAT(url) + SOMEWHAT(inexact title)
// and then cache the results for 1 day or until next URL is added to the list.

/*
FROM: https://github.com/NaturalNode/natural/blob/master/lib/natural/distance/jaro-winkler_distance.js
DATE: Jan 2013

Copyright (c) 2012, Adam Phillabaum, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

Unless otherwise stated by a specific section of code

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// Computes the Jaro distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
function jwdistance(s1, s2) {
    if (typeof(s1) != "string" || typeof(s2) != "string") return 0;
    if (s1.length == 0 || s2.length == 0) return 0;
    s1 = s1.toLowerCase(), s2 = s2.toLowerCase();
    var matchWindow = (Math.floor(Math.max(s1.length, s2.length) / 2.0)) - 1;
    var matches1 = new Array(s1.length);
    var matches2 = new Array(s2.length);
    var m = 0; // number of matches
    var t = 0; // number of transpositions
    //debug helpers
    //console.log("s1: " + s1 + "; s2: " + s2);
    //console.log(" - matchWindow: " + matchWindow);
    // find matches
    for (var i = 0; i < s1.length; i++) {
        var matched = false;
        // check for an exact match
        if (s1[i] == s2[i]) {
            matches1[i] = matches2[i] = matched = true;
            m++
        }
        // check the "match window"
        else {
            // this for loop is a little brutal
            for (k = (i <= matchWindow) ? 0 : i - matchWindow;
            (k <= i + matchWindow) && k < s2.length && !matched;
            k++) {
                if (s1[i] == s2[k]) {
                    if (!matches1[i] && !matches2[k]) {
                        m++;
                    }
                    matches1[i] = matches2[k] = matched = true;
                }
            }
        }
    }
    if (m == 0) return 0.0;
    // count transpositions
    var k = 0;
    for (var i = 0; i < s1.length; i++) {
        if (matches1[k]) {
            while (!matches2[k] && k < matches2.length)
            k++;
            if (s1[i] != s2[k] && k < matches2.length) {
                t++;
            }
            k++;
        }
    }
    //debug helpers:
    //console.log(" - matches: " + m);
    //console.log(" - transpositions: " + t);
    t = t / 2.0;
    return (m / s1.length + m / s2.length + (m - t) / m) / 3;
}

// Computes the Winkler distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
// dj is the Jaro Distance (if you've already computed it), leave blank and the method handles it
function jaroWinklerDistance(s1, s2, dj) {
    var jaro;
    (typeof(dj) == 'undefined') ? jaro = jwdistance(s1, s2) : jaro = dj;
    var p = 0.1; //
    var l = 0 // length of the matching prefix
    while (s1[l] == s2[l] && l < 4)
    l++;
    return jaro + l * p * (1 - jaro);
}
