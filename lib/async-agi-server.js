"use strict";

var events= require("events");
var util = require("util");
var AGIChannel = require("./agi-channel");

var AsyncAGIServer = function(script, amiConnection) {
  events.EventEmitter.call(this);

  this.amiConnection = amiConnection;
  this.script = script;
  this.channels = {};

  //For legacy
  amiConnection.on("asyncagi", this.handleEvent.bind(this));

  var self = this;

  amiConnection.on("asyncagistart", function(event){

    event.subevent= "Start";

    self.handleEvent(event);

  });

  amiConnection.on("asyncagiexec", function(event){

    event.subevent= "Exec";

    self.handleEvent(event);

  });

  amiConnection.on("asyncagiend", function(event){

    event.subevent= "End";

    self.handleEvent(event);

  });


};



util.inherits(AsyncAGIServer, events.EventEmitter);

AsyncAGIServer.prototype.handleEvent = function(event) {

  var channelName = event.channel;

  var self = this;

  if (event.subevent == "Start") {

    var request = AGIChannel.parseBuffer(unescape(event.env));

    var channel = new AGIChannel(request, self.script);
    this.channels[channelName] = channel;

    channel.on("request", function(req, cmdId) {

      self.amiConnection.action({
        "action": "agi",
        "commandid": cmdId,
        "command": req,
        "channel": channelName
      }, function(error){

        if( error ){

          console.log("Warning ts-async-agi", error.stack);          

        }

      });

    });

    channel.once("error", function (error) {
      console.log('Got error from script', error, error.stack);

      if (!channel.isHangup) {

        channel.hangup();

      }

    });

    channel.once("done", function () {

      if (channel.isHangup) return;

      self.amiConnection.action({
        "action": "agi",
        "command": "ASYNCAGI BREAK",
        "channel": channelName
      }, function(error){

        if( error ){

          console.log("Warning ts-async-agi", error.stack);          

        }

      });
    });

  } else if (event.subevent == 'Exec') {

    setTimeout(function (channel) {

      channel.handleReply(unescape(event.result));

    }, 50, this.channels[channelName]);

  } else if (event.subevent === "End") {

    console.log("End");

    //TODO: see what's going on
    try {

      this.channels[channelName].isHangup = true;

    } catch (error) {

      console.log("=====>", error);

    }

    delete this.channels[channelName];

  }
};

module.exports = AsyncAGIServer;