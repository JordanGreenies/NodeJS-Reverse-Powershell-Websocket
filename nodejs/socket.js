var ws = new WebSocket("ws://"+window.location.hostname+":3394");

var connectedUsers = {};
var connectedTarget = '';

function updateTabs() {
    (function($) {
        var tabs = $("#roomspanel li");
        tabs.click(function() {
            tabs.removeClass("active");
            $(this).addClass("active");
            var tab_id = "#" + $(this)[0].outerText + "_tab";
            $("#messages").find('.tab').hide();
            $("#messages").find('.tab').removeClass("active_tab");
            $(tab_id).fadeIn(200);
            $(tab_id).addClass("active_tab");
        });
    })(jQuery);
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
getUniqueID = function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};


function chatLogLine(msg,isImage,isDownloadable) {
    if (msg == "") msg = "{empty response}";
    var today = new Date();
	var currentHours = ("0" + today.getHours()).slice(-2);
	var currentMinutes = ("0" + today.getMinutes()).slice(-2);
    var time = currentHours + ":" + currentMinutes;
    var dId = getUniqueID();
    var newDiv = '<div id="' + dId + '" class="line system"><span class="timestamp">' + time + '</span><span class="message">';
	if(isImage) newDiv = newDiv +'<pre><img width="100px" src="data:image/jpeg;charset=utf-8;base64, ' + btoa(msg) + '" alt="" /></pre>';
	else newDiv = newDiv + '<pre>' + htmlEntities(msg) + '</pre>';
	if(isDownloadable)newDiv = newDiv + '<a href="data:text/plain;base64,'+btoa(unescape(encodeURIComponent(msg)))+'" download="data">Download data (' + msg.length + ' bytes)</a>';
	newDiv = newDiv + "</span></div>";
	$(".active_tab").append(newDiv);
    document.getElementById(dId).scrollIntoView();
}

function SortResponse(resp)
{
	if(resp[resp.length-1] == "\n" && resp[resp.length-2] == "\r") resp = resp.substring(0,resp.length-2); //Powershell returns with an extra line
	
	var bIsImage = false;
	const byte_check = resp.split("\r\n");
	if(byte_check.length > 2 && !byte_check.some(isNaN)) //this is [probably] a byte response, lets decode it
	{
		var file = byte_check.map(c => String.fromCharCode(c)).join('');
		resp = file;

		var header = "";
		for (var i = 0; i < 4; i++) {
			header += file.charCodeAt(i).toString(16);
		}
		
		var mime = mimeType(header); //check for known mimes
		if (mime == 'jpg') {
			bIsImage = true;
		} 
	}
		
	chatLogLine(resp,bIsImage,true);
}



function selectTarget(t) {
    connectedTarget = t;
    if (!$('.' + connectedTarget).length) {
        $("#rooms").append('<li id="system" class="roomtab ' + connectedTarget + '">' + connectedTarget + '</li>');
        $("#messages").append('<div class="tab" id="' + connectedTarget + '_tab"></div>');
        updateTabs();
        $('.' + connectedTarget).click();
    }
    chatLogLine("Selected target " + connectedTarget);
}

function updateConnected() {
    var new_html = "<ul>";
    Object.entries(connectedUsers).forEach((entry) => {
        const [key, value] = entry;
        new_html += "<li onclick=\"selectTarget('" + key + "');\">" + key + "</li>";
    });
    new_html += "</ul>";
    document.getElementById('userlist').innerHTML = new_html;
}
var command_history = {
    keyCount: 0,
    commandCount: 0,
    prevCommand: [],
    savedInitial: "",
    put: function(val) {
        this.commandCount++;
        this.keyCount = this.commandCount;
        this.prevCommand.push(val);
    },
    getback: function(initial) {
        if (this.keyCount == this.commandCount) this.savedInitial = initial;
        if (this.keyCount > 0) this.keyCount--;
        return this.prevCommand[this.keyCount];
    },
    getforward: function() {
        if (this.keyCount < this.commandCount - 1) this.keyCount++;
        else {
            this.keyCount = this.commandCount;
            return this.savedInitial;
        }
        return this.prevCommand[this.keyCount];
    }
}

function sendCmdToTarget(message) {
    if (message.length == 0) {
        chatLogLine("Invalid message");
        return;
    }
    command_history.put(message)
    if (connectedTarget == '') {
        chatLogLine("Invalid target >> " + message);
        return;
    }
    var cmd = {};
    cmd['cmd'] = 'execute';
    cmd['cmd2'] = message;
    cmd['target'] = connectedTarget;
    var json_cmd = JSON.stringify(cmd);
    ws.send(json_cmd);
    chatLogLine(connectedTarget + " >> " + json_cmd);
}

function mimeType(headerString) {
    switch (headerString.toLowerCase()) {
        case "89504e47":
            type = "image/png";
            break;
        case "47494638":
            type = "image/gif";
            break;
        case "ffd8ffe0":
            type = "jpg"
            break;
        case "ffd8ffe1":
            type = "jpg"
            break;
        case "ffd8ffdb":
            type = "jpg"
            break;
        case "ffd8ffe2":
            type = "image/jpeg";
            break;
        case "25504446":
            type = "pdf";
            break;
        case "7b5c7274": //6631
            type = "rtf";
            break;
        case "504b0304":
            type = "zip archive (Office)";
            break;
        case "504b0506":
            type = "zip archive empty";
            break;
        case "504b0708":
            type = "zip archive spanned";
            break;
        case "49492a00":
            type = "TIF (little endian format)";
            break;
        case "4d4d002a":
            type = "TIF (big endian format)";
            break;
        case "d0cf11e0": //a1b11ae1
            type = "Old Office Format";
            break;
        default:
            type = "Unsupported";
            break;
    }
    return type;
}

function pad(num, size) {
    var s = "0000" + num;
    return s.substr(s.length - size);
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function tryPassword() {
    var cmd = {};
    let password = prompt("Please enter your password", "");
    cmd['cmd'] = 'connect_admin';
    cmd['password'] = password;
    var json_cmd = JSON.stringify(cmd);
    ws.send(json_cmd);
}
ws.onopen = function() {
    tryPassword();
};
ws.onmessage = function(evt) {
    //console.log(evt.data);
    try {
        const obj = JSON.parse(evt.data);
        if (obj.cmd == "connected_users") {
            connectedUsers = obj['connected'];
            updateConnected();
        } else if (obj.cmd == "cmd_response") {
			SortResponse(obj.data);
        } else if (obj.cmd == "password_invalid") {
            chatLogLine(evt.data,false);
        }
    } catch (e) {
		console.log(e);
        chatLogLine(evt.data,false);
    }
};
ws.onclose = function() {
    // websocket is closed.
    alert("Connection is closed...");
};
document.addEventListener("DOMContentLoaded", () => {
    inputline.addEventListener("keydown", e => {
        switch (e.keyCode) {
            case 38:
                if (command_history.commandCount) {
                    e.preventDefault()
                    var val = command_history.getback(inputline.value);
                    inputline.value = val;
                }
                break;
            case 40:
                if (command_history.commandCount) {
                    e.preventDefault()
                    var val = command_history.getforward();
                    inputline.value = val;
                }
                break;
        }
    });
    updateTabs();
});