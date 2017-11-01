"use strict";

var events = require("events");
var util = require("util");
var AGIChannel = require("./agi-channel");

var AsyncAGIServer = function (script, amiConnection) {
  events.EventEmitter.call(this);

  this.amiConnection = amiConnection;
  this.script = script;
  this.channels = {};

  //For legacy
  amiConnection.on("asyncagi", this.handleEvent.bind(this));

  var self = this;

  amiConnection.on("asyncagistart", function (event) {

    event.subevent = "Start";

    self.handleEvent(event);

  });

  amiConnection.on("asyncagiexec", function (event) {

    event.subevent = "Exec";

    self.handleEvent(event);

  });

  amiConnection.on("asyncagiend", function (event) {

    event.subevent = "End";

    self.handleEvent(event);

  });

  amiConnection.on("hangup", function (event) {

    var channelName = event.channel;

    if (self.channels[channelName]) {

      self.channels[channelName].isHangup = true;

      delete self.channels[channelName];

    }

  });


};



util.inherits(AsyncAGIServer, events.EventEmitter);

AsyncAGIServer.prototype.handleEvent = function (event) {

  var channelName = event.channel;

  var self = this;

  if (event.subevent == "Start") {

    var request = AGIChannel.parseBuffer(unescape(event.env));

    var channel = new AGIChannel(request, self.script);
    this.channels[channelName] = channel;

    channel.on("request", function (req, cmdId) {

      self.amiConnection.action({
        "action": "agi",
        "commandid": cmdId,
        "command": req,
        "channel": channelName
      }, function (error) {

        if (error) {

          console.log("Warning ts-async-agi " + req + ", channel: " + channelName, error);

        }

      });

    });

    channel.once("error", function (error) {

      console.log("Agi script returned a promise that have been rejected", error);

      if (channel.isHangup) return;

      channel.hangup();

    });

    channel.once("done", function () {

      if (channel.isHangup) return;

      self.amiConnection.action({
        "action": "agi",
        "command": "ASYNCAGI BREAK",
        "channel": channelName
      }, function (error) {

        if (error) {

          console.log("Warning! ts-async-agi ASYNC-BREAK, channel: " + channelName, error);

        }

      });
    });

  } else if (event.subevent == 'Exec') {

    setTimeout(function (channel) {

      channel.handleReply(unescape(event.result));

    }, 50, this.channels[channelName]);

  } else if (event.subevent === "End") {

    if (this.channels[channelName]) {

      this.channels[channelName].isHangup = true;
      delete this.channels[channelName];

    }

  }
};

module.exports = AsyncAGIServer;
