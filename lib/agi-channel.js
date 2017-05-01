'use strict';

/* eslint no-var: 0 */
var util = require("util");
var events = require("events");
var sprintf = require("sprintf-js").sprintf;
var AGIReply= require("./agi-reply");


var AGIChannel = function(request, script) {
  events.EventEmitter.call(this);
  var self = this;

  self.isHangup= false;
  self.request = request;
  self.cmdId = 0;

  process.nextTick(function () {

    script(self)
      .then(function () {
        self.emit("done");
      }).catch(function (error) {
        self.emit("error", error);
      });

  });

  this.relax= getRelax(this);


};

util.inherits(AGIChannel, events.EventEmitter);


AGIChannel.prototype.handleReply = function (rawReplyLine) {

  if( !this.callback ) return;

  this.callback(new AGIReply(rawReplyLine));

  delete this.callback;

};



//NEED timeout?
AGIChannel.prototype.sendRequest = function (request) {

  var self = this;

  return new Promise(function (resolve) {

    if( self.isHangup ){
      resolve(null);
      return;
    }

    self.callback = resolve;

    self.emit('request', request, ++self.cmdId);

  });

};


// external API
AGIChannel.prototype.answer = function () {

  var self = this;

  return new Promise(function (resolve) {

    self.sendRequest("ANSWER")
      .then(function (reply) {

        var failure= (
            !reply ||
            reply.code !== 200 ||
            reply.attributes.result != 0
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": failure?null:undefined
        });

      });

  });

};

AGIChannel.prototype.channelStatus = function (channelName) {

  var self = this;

  return new Promise(function (resolve) {

    channelName = channelName || '';

    self.sendRequest(sprintf('CHANNEL STATUS %s', channelName))
      .then(function (reply) {

        var failure= (
            !reply ||
            reply.code !== 200 ||
            reply.attributes.result == -1
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": failure?null:parseInt(reply.attributes.result)
        });

      });

  });


};

AGIChannel.prototype.exec = function (app, params) {

  var self = this;

  return new Promise(function (resolve) {

    if (params == undefined) {
      params = [];
    }

    var paramsQuery;

    if (params.length === 0) {

      paramsQuery = "";

    } else if (params.length === 1) {

      paramsQuery = params[0];

    } else {

      paramsQuery = `"${params.join(",")}"`;

    }

    var query = sprintf('EXEC %s %s', app, paramsQuery);

    self.sendRequest(query)
      .then(function (reply) {

        var failure= (
            !reply ||
            reply.code !== 200 ||
            reply.attributes.result == -2
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": failure?null:reply.attributes.result
        });

      });

  });

};

AGIChannel.prototype.getData = function (file, timeout, maxDigits) {


  var self = this;

  return new Promise(function (resolve) {
    /*
failure: 200 result=-1
timeout with pressed digits: 200 result=<digits> (timeout)
timeout without pressed digits: 200 result= (timeout)
success: 200 result=<digits>
*/

    timeout = (timeout == undefined) ? '' : timeout;
    maxDigits = (maxDigits == undefined) ? '' : maxDigits;

    self.sendRequest(sprintf('GET DATA "%s" %s %s', file, timeout, maxDigits))
      .then(function (reply) {

        var failure = (
          !reply ||
          reply.code !== 200 ||
          reply.attributes.result == -1
        );

        let relevantResult = null;

        if (!failure) {

          var digits = reply.attributes.result;

          var arrDigit = [];

          for (var i = 0; i < digits.length; i++) {
            arrDigit.push(digits[i]);
          }

          relevantResult = {
            "digits": arrDigit,
            "timeout": reply.extra === "timeout"
          };


        }

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": relevantResult
        });

      });


  });


};

AGIChannel.prototype.getFullVariable = function (variable, channel) {

  var self = this;

  return new Promise(function (resolve) {

    channel = (channel === undefined) ? '' : channel;

    self.sendRequest(sprintf('GET FULL VARIABLE %s %s', variable, channel))
      .then(function (reply) {

        var failure = (
          !reply ||
          reply.code !== 200
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": reply.extra ? reply.extra : null
        });

      });

  });

};


AGIChannel.prototype.getVariable = function (variable) {

  var self = this;

  return new Promise(function (resolve) {

    self.sendRequest(sprintf('GET VARIABLE "%s"', variable))
      .then(function (reply) {

        var failure = (
          !reply ||
          reply.code !== 200
        );
      
        //TODO: When hangup sometime relevant result fail: reply is null

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": reply.extra ? reply.extra : null
        });


      });


  });



};



AGIChannel.prototype.streamFile = function (file, escapeDigits, sampleOffset) {

  var self = this;

  return new Promise(function (resolve) {

    escapeDigits = escapeDigits || [];

    //STREAM FILE FILENAME ESCAPE_DIGITS SAMPLE_OFFSET

    var query = `STREAM FILE "${file}" "${escapeDigits.join("")}"`;

    if (sampleOffset) {
      query += ` "${sampleOffset * 10}"`;
    }

    self.sendRequest(query)
      .then(function (reply) {

        /*
        failure: 200 result=-1 endpos=<sample offset>
        failure on open: 200 result=0 endpos=0
        success: 200 result=0 endpos=<offset>
        */

        let failure = (
          !reply ||
          reply.code !== 200 ||
          (
            reply.attributes.result == -1 ||
            (
              reply.attributes.result == 0 &&
              reply.attributes.endpos == 0
            )
          )
        );

        var relevantResult = {
          "endPos": parseInt(reply.attributes.endpos) / 10
        };

        var digitCode = parseInt(reply.attributes.result);

        if (digitCode > 0) {
          relevantResult.digit = String.fromCharCode(digitCode);
        }

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": relevantResult
        });

      });

  });

};


AGIChannel.prototype.hangup = function () {

  var self = this;

  return new Promise(function (resolve, reject) {

    self.sendRequest("HANGUP")
      .then(function (reply) {

        /*
        failure: 200 result=-1
        success: 200 result=1
        */

        var failure = (
          !reply ||
          reply.code !== 200 ||
          reply.attributes.result != 1
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": null
        });

      });

  });
};


AGIChannel.prototype.setVariable = function (variable, value) {

  var self = this;

  return new Promise(function (resolve, reject) {

    self.sendRequest(sprintf('SET VARIABLE %s %s', variable, value))
      .then(function (reply) {

        var failure = (
          !reply ||
          reply.code !== 200
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": null
        });

      });


  });

};



AGIChannel.prototype.setContext = function (context) {

  var self = this;

  return new Promise(function (resolve, reject) {

    self.sendRequest(sprintf('SET CONTEXT %s', context))
      .then(function (reply) {

        var failure = (
          !reply ||
          reply.code !== 200 ||
          reply.attributes.result != 0
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": null
        });

      });

  });
};

AGIChannel.prototype.setExtension = function (extension) {

  var self = this;

  return new Promise(function (resolve, reject) {

    self.sendRequest(sprintf('SET EXTENSION %s', extension))
      .then(function (reply) {

        var failure = (
          !reply ||
          reply.code !== 200 ||
          reply.attributes.result != 0
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": null
        });

      });


  });


};

AGIChannel.prototype.setPriority = function (priority) {

  var self = this;

  return new Promise(function (resolve, reject) {

    self.sendRequest(sprintf('SET PRIORITY %s', priority))
      .then(function (reply) {

        var failure = (
          !reply ||
          reply.code !== 200 ||
          reply.attributes.result != 0
        );

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": null
        });

      });


  });

};


AGIChannel.prototype.getOption = function (file, escapeDigits, timeout) {

  var self = this;

  return new Promise(function (resolve) {

    escapeDigits = escapeDigits || [];

    //STREAM FILE FILENAME ESCAPE_DIGITS SAMPLE_OFFSET

    var query = `GET OPTION "${file}" "${escapeDigits.join("")}" "${timeout || "0"}"`;

    self.sendRequest(query)
      .then(function (reply) {

        /*
        failure: 200 result=-1 endpos=<sample offset>
        failure on open: 200 result=0 endpos=0
        success: 200 result=0 endpos=<offset>
        */

        let failure = (
          !reply ||
          reply.code !== 200 ||
          (
            reply.attributes.result == -1 ||
            (
              reply.attributes.result == 0 &&
              reply.attributes.endpos == 0
            )
          )
        );

        var relevantResult = {
          "endPos": parseInt(reply.attributes.endpos) / 10
        };

        var digitCode = parseInt(reply.attributes.result);

        if (digitCode > 0) {
          relevantResult.digit = String.fromCharCode(digitCode);
        }

        resolve({
          "failure": failure,
          "agiReply": reply,
          "relevantResult": relevantResult
        });

      });

  });

};



AGIChannel.prototype.recordFile = function (
  file,
  format,
  escapeDigits,
  timeout,
  beep
) {

  var self = this;

  return new Promise(function (resolve) {

    //RECORD FILE <filename> <format> <escape digits> <timeout> [s=<silence>]

    /*
    failure to write: 200 result=-1 (writefile)
    failure on waitfor: 200 result=-1 (waitfor) endpos=<offset>
    hangup: 200 result=0 (hangup) endpos=<offset>
    interrupted: 200 result=<digit> (dtmf) endpos=<offset>
    timeout: 200 result=0 (timeout) endpos=<offset>
    random error: 200 result=<error> (randomerror) endpos=<offset>
    */

    format = format || 'wav';

    escapeDigits = escapeDigits || [];

    var query = `RECORD FILE "${file}" "${format}" "${escapeDigits.join("")}" ${timeout || -1}`;

    if (beep) {
      query += ` BEEP`;
    }


    self.sendRequest(query)
      .then(function (reply) {


        var failure = (
          !reply ||
          reply.code !== 200 ||
          (
            (
              reply.attributes.result == -1 && reply.extra === "writefile"
            ) ||
            reply.extra === "randomerror"
          )
        );

        var relevantResult = {
          "recordDuration": (reply.extra === "writefile") ? 0 : parseInt(reply.attributes.endpos) / 10,
          "maxLengthReached": reply.extra === "timeout",
          "escapeDigitPressed": (reply.extra === "dtmf") ? String.fromCharCode(parseInt(reply.attributes.result)) : null,
          "hangup": reply.extra === "hangup"
        };

        resolve({
          "failure": false,
          "agiReply": reply,
          "relevantResult": relevantResult
        });

        //resolve(result);

      });
  });


};





AGIChannel.parseBuffer = function (buffer) {
  var request = {};

  buffer.split('\n').forEach(function (line) {
    var items = line.split(/:\s?/);

    if (items.length == 2) {
      var name = items[0].trim();

      if (name.indexOf('agi_') == 0) {
        name = name.substring(4);
      }
      var value = items[1].trim();

      request[name] = value;
    }
  });

  return request;
};


function getRelax(channel) {

  var methodNames = [
    "answer",
    "channelStatus",
    "exec",
    "getData",
    "getVariable",
    "recordFile",
    "setContext",
    "setExtension",
    "setPriority",
    "setVariable",
    "streamFile",
    "hangup",
    "getFullVariable",
    "getOption"
  ];

  let relax = {}

  methodNames.forEach(function (methodName) {

    relax[methodName] = function () {

      var argv = arguments;

      return new Promise(function (resolve, reject) {

        channel[methodName].apply(channel, argv).then(function (resp) {

          if (resp.failure) {

            if (!channel.isHangup) {

              let error = new Error("AGI action error but no hangup");

              error.resp = resp;

              reject(error);

            }

            return;

          }

          resolve(resp.relevantResult);

        });

      });


    };
  });

  return relax;

}




module.exports = AGIChannel;
