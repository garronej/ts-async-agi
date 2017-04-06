"use strict";

var AGIReply = function(line) {
  this.rawReply = line.trim();
  this.attributes = {};

  this.code = parseInt(this.rawReply);

  var self = this;

  var items = this.rawReply.split(' ');

  items.forEach(function(item) {
    if (item.indexOf('=') > 0) {
      var subItems = item.split('=');

      self.attributes[subItems[0]] = subItems[1];
    }
  });

  var m = this.rawReply.match(/\((.*)\)/);

  if (m) {
    this.extra = m[1];
  }
};

module.exports= AGIReply;