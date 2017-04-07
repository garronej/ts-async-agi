/* eslint no-var: 0*/

/* eslint no-var: 0 */

var AGIChannel = require('./lib/agi-channel');
var AGIReply = require('./lib/agi-reply');
var AsyncAGIServer = require('./lib/async-agi-server');

var ChannelStatus;
(function (ChannelStatus) {
  ChannelStatus[ChannelStatus["DOWN_AVAILABLE"] = 0] = "DOWN_AVAILABLE";
  ChannelStatus[ChannelStatus["DOWN_RESERVED"] = 1] = "DOWN_RESERVED";
  ChannelStatus[ChannelStatus["OFF_HOOK"] = 2] = "OFF_HOOK";
  ChannelStatus[ChannelStatus["DIGITS_DIALED"] = 3] = "DIGITS_DIALED";
  ChannelStatus[ChannelStatus["LINE_RINGING"] = 4] = "LINE_RINGING";
  ChannelStatus[ChannelStatus["REMOTE_END_RINGING"] = 5] = "REMOTE_END_RINGING";
  ChannelStatus[ChannelStatus["LINE_UP"] = 6] = "LINE_UP";
  ChannelStatus[ChannelStatus["LINE_BUSY"] = 7] = "LINE_BUSY";
})(ChannelStatus || (ChannelStatus = {}));

module.exports = {
  "AsyncAGIServer": AsyncAGIServer,
  "AGIChannel": AGIChannel,
  "AGIReply": AGIReply,
  "ChannelStatus": ChannelStatus
};

