/*
 This work is licensed under Creative Commons GNU LGPL License.
 License: http://creativecommons.org/licenses/LGPL/2.1/
 Version: 0.9
 Author:  Stefan Goessner/2006
 Web:     http://goessner.net/
 */
function xml2json(xml, tab, attributes)
{
    attributes = typeof attributes === 'undefined' ?
        true :
        !!attributes;
    var space = !!tab.length;
    var X = {
        toObj: function(xml)
        {
            var o = {};
            if (xml.nodeType == 1)
            { // element node ..
                if (attributes && xml.attributes.length) // element with attributes  ..
                    for (var i = 0; i < xml.attributes.length; i++)
                    {
                        var nodeName = xml.attributes[i].nodeName;
                        nodeName = nodeName.replace(/:/g, "_");
                        nodeName = nodeName.replace(/-/g, "_");
                        o["_" + nodeName] = (xml.attributes[i].nodeValue || "").toString();
                    }
                if (xml.firstChild)
                { // element has child nodes ..
                    var textChild = 0,
                        cdataChild = 0,
                        hasElementChild = false;
                    for (var n = xml.firstChild; n; n = n.nextSibling)
                    {
                        if (n.nodeType == 1)
                            hasElementChild = true;
                        else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/))
                            textChild++; // non-whitespace text
                        else if (n.nodeType == 4)
                            cdataChild++; // cdata section node
                    }
                    if (hasElementChild)
                    {
                        X.removeWhite(xml);
                        var newArray = [];
                        for (var n = xml.firstChild; n; n = n.nextSibling)
                        {
                            if (n.nodeType == 3)
                            { // text node
                                var textNode = {};
                                textNode['element'] = 'text';
                                textNode['content'] = X.escape(n.nodeValue);
                                newArray.push(textNode);
                            }
                            else if (n.nodeType == 4) // cdata node
                            {
                                o["#cdata"] = X.escape(n.nodeValue);
                            }
                            else // first occurence of element..
                            {
                                var textNode = {};
                                textNode['element'] = n.nodeName;
                                for (var i = 0; i < n.attributes.length; i++)
                                {
                                    var nodeName = n.attributes[i].nodeName;
                                    nodeName = nodeName.replace(/:/g, "_");
                                    nodeName = nodeName.replace(/-/g, "_");
                                    textNode["_" + nodeName] = (n.attributes[i].nodeValue || "").toString();
                                }
                                for (var i = 0; i < n.attributes.length; i++)
                                {
                                    n.attributes.removeNamedItem(n.attributes[i].name);
                                }
                                var node = X.toObj(n);
                                if (node.content && node.element == "text" && n.children.length == 0)
                                {
                                    var textContentArray = [];
                                    textContentArray.push(node);
                                    textNode['content'] = textContentArray;
                                }
                                else if (node.content)
                                {
                                    textNode['content'] = node.content;
                                }
                                else
                                {
                                    //console.log(node);
                                    //textNode['content'] = node;
                                }
                                newArray.push(textNode);
                            }
                        }
                        o["content"] = newArray;
                    }
                    else if (textChild)
                    { // pure text
                        if (attributes && xml.attributes.length)
                        {
                            o = {};
                            o["element"] = "text";
                            o["content"] = X.escape(X.innerXml(xml));
                            // o["#text"] = X.escape(X.innerXml(xml));
                        }
                        else
                        {
                            o = {};
                            o["element"] = "text";
                            o["content"] = X.escape(X.innerXml(xml));
                            // o = X.escape(X.innerXml(xml));
                        }
                    }
                    else if (cdataChild)
                    { // cdata
                        if (cdataChild > 1)
                            o = X.escape(X.innerXml(xml));
                        else
                            for (var n = xml.firstChild; n; n = n.nextSibling)
                                o["#cdata"] = X.escape(n.nodeValue);
                    }
                }
                if (!xml.attributes.length && !xml.firstChild)
                    o = null;
            }
            else if (xml.nodeType == 9)
            { // document.node
                o = X.toObj(xml.documentElement);
            }
            else
                alert("unhandled node type: " + xml.nodeType);
            return o;
        },
        toJson: function(o, name, ind)
        {
            var json = name ?
                ("\"" + name + "\"") :
                "";
            if (o instanceof Array)
            {
                for (var i = 0, n = o.length; i < n; i++)
                    o[i] = X.toJson(o[i], "", ind + "\t");
                json += (name ?
                    (space ?
                        ": [" :
                        ":[") :
                    "[") + (o.length > 1 ?
                    ("\n" + ind + "\t" + o.join(",\n" + ind + "\t") + "\n" + ind) :
                    o.join("")) + "]";
            }
            else if (o == null)
                json += (name && ":") + "null";
            else if (typeof(o) == "object")
            {
                var arr = [];
                for (var m in o)
                    arr[arr.length] = X.toJson(o[m], m, ind + "\t");
                json += (name ?
                    (space ?
                        ": {" :
                        ":{") :
                    "{") + (arr.length >= 1 ?
                    ("\n" + ind + "\t" + arr.join(",\n" + ind + "\t") + "\n" + ind) :
                    arr.join("")) + "}";
            }
            else if (typeof(o) == "string")
                json += (name && (space ?
                    ": " :
                    ":")) + "\"" + o.toString() + "\"";
            else
                json += (name && (space ?
                    ": " :
                    ":")) + o.toString();
            return json;
        },
        innerXml: function(node)
        {
            var s = ""
            if ("innerHTML" in node)
                s = node.innerHTML;
            else
            {
                var asXml = function(n)
                {
                    var s = "";
                    if (n.nodeType == 1)
                    {
                        s += "<" + n.nodeName;
                        for (var i = 0; i < n.attributes.length; i++)
                            s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                        if (n.firstChild)
                        {
                            s += ">";
                            for (var c = n.firstChild; c; c = c.nextSibling)
                                s += asXml(c);
                            s += "</" + n.nodeName + ">";
                        }
                        else
                            s += "/>";
                    }
                    else if (n.nodeType == 3)
                        s += n.nodeValue;
                    else if (n.nodeType == 4)
                        s += "<![CDATA[" + n.nodeValue + "]]>";
                    return s;
                };
                for (var c = node.firstChild; c; c = c.nextSibling)
                    s += asXml(c);
            }
            return s;
        },
        escape: function(txt)
        {
            return txt.replace(/[\\]/g, "\\\\").replace(/[\"]/g, '\\"').replace(/[\n]/g, '\\n').replace(/[\r]/g, '\\r');
        },
        removeWhite: function(e)
        {
            e.normalize();
            for (var n = e.firstChild; n;)
            {
                if (n.nodeType == 3)
                { // text node
                    if (!n.nodeValue.match(/[^ \f\n\r\t\v]/))
                    { // pure whitespace text node
                        var nxt = n.nextSibling;
                        e.removeChild(n);
                        n = nxt;
                    }
                    else
                        n = n.nextSibling;
                }
                else if (n.nodeType == 1)
                { // element node
                    X.removeWhite(n);
                    n = n.nextSibling;
                }
                else // any other node
                    n = n.nextSibling;
            }
            return e;
        }
    };
    if (xml.nodeType == 9) // document node
        xml = xml.documentElement;
    var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
    return "{" + (space ?
        "\n" :
        "") + tab + (tab ?
        json.replace(/\t/g, tab) :
        json.replace(/\t|\n/g, "")) + (space ?
        "\n" :
        "") + "}";
}
