## Getting Started

This fork of agi-node replace fiber by Promises to make the module consistent with the async/await design pattern.
Also defines typescript's types.


### 1. Usage

``` bash
npm install --save agi-node
```

``` javascript

var AGIServer = require('agi-node').AGIServer;
//var AsyncAGIServer = require('agi-node').AsyncAGIServer;
//var conn = new require('asterisk-manager')(5038, 'localhost', 'asterisk', 'astpass', true);



async function testScript(channel) {
  console.log('Script got call %s -> %s', channel.request.callerid, channel.request.extension);

  var answerReply = await channel.answer();
  console.log('ANSWER', answerReply);

  console.log('CHANNEL STATUS', await channel.channelStatus());
  console.log('GET UNIQUEID', await channel.getVariable('UNIQUEID'));
  console.log('GET JUNK', await channel.getVariable('JUNK'));

  console.log('beeping in 2 seconds');

  await new Promise(resolve=> setTimeout(resolve, 2000));

  await channel.streamFile("beep");


  console.log('PLAYBACK', await channel.streamFile('conf-adminmenu'));
  console.log('PLAYBACK', await channel.streamFile('conf-adminmenu'));
}

/* Async AGI Server */
// conn is an asterisk-manager connection
//var server = new AsyncAGIServer(script, conn);

/* AGI Server */
var server = new AGIServer(testScript, 4573);

```


* `AGIServer` constructor receives two parameters: a `mapper` and a `port`. If the mapper is a function it will execute that as an AGI script. If it is an object it maps script names from AGI URL to generator functions. Example: `{hello: helloScript}` will map `agi://agi_host/hello` to `helloScript`. The `port` is the AGI standard listening port (default `4573`)
* `AsyncAGIServer` receives two parameters: a `mapper` and an AMI connection (established through `asterisk-manager`)
* Mapper function must return a void promise, all the channel methods return promise that must complete before the Mapper promise resolve.

### 2. Channel API

#### 2.1 Channel.request

This property is an object that maps all the AGI initialization variable without the *agi_* prefix (e.g. `agi_calleridname` becomes `channel.request.calleridname`). Here's a list of all of these variables:


* `agi_request` - The filename of your script
* `agi_channel` - The originating channel (your phone)
* `agi_language` - The language code (e.g. "en")
* `agi_type` - The originating channel type (e.g. "SIP" or "ZAP")
* `agi_uniqueid` - A unique ID for the call
* `agi_version` - The version of Asterisk (since Asterisk 1.6)
* `agi_callerid` - The caller ID number (or "unknown")
* `agi_calleridname` - The caller ID name (or "unknown")
* `agi_callingpres` - The presentation for the callerid in a ZAP channel
* `agi_callingani2` - The number which is defined in ANI2 see Asterisk Detailed Variable List (only for PRI Channels)
* `agi_callington` - The type of number used in PRI Channels see Asterisk Detailed Variable List
* `agi_callingtns` - An optional 4 digit number (Transit Network Selector) used in PRI Channels see Asterisk Detailed Variable List
* `agi_dnid` - The dialed number id (or "unknown")
* `agi_rdnis` - The referring DNIS number (or "unknown")
* `agi_context` - Origin context in extensions.conf
* `agi_extension` - The called number
* `agi_priority` - The priority it was executed as in the dial plan
* `agi_enhanced` - The flag value is 1.0 if started as an EAGI script, 0.0 otherwise
* `agi_accountcode` - Account code of the origin channel
* `agi_threadid` - Thread ID of the AGI script (since Asterisk 1.6)

#### 2.2 Channel methods

All those methods returns promises.

* `answer()`

Answers the channel

* `channelStatus()`

Returns the current channel status (see http://www.voip-info.org/wiki/view/channel+status)

* `continueAt(context, extension, priority)`

Sets the point in the dialplan to continue the call after the AGI script is done. `extension` is optional and, if missing, is set the current channel extension. `priority` is optional and, if missing, is set to `1`.

* `exec(applicationName, applicationParameters)`

Executes the requested dialplan application with parameters

* `getData(file, timeout, maxDigits)`

Reads DTMF input from user. Plays the `file` prompt. Times out at `timeout` milliseconds and allows
up to `maxDigits` to be read. It can be ended with `#`.

* `getVariable(variableName)`

Reads the specified variable value on the current channel. Returns `null` if variable does not exist.

* `noop()`

Does nothing.

* `recordFile(file, format, escapeDigits, timeout, silenceSeconds, beep)`

Records the current channel in `file` using `format`. Recording can be stopped using one
of the `escapeDigits` or after `silenceSeconds`. If `beep` is true, a beep sound is played
before recording is started.

* `setContext(context)`

Sets the context to continue at after leaving the script.

* `setExtension(extension)`

Sets the extension to continue at after leaving the script.

* `setPriority(priority)`

Sets the priority to continue at after leaving the script.

* `setVariable(variable, value)`

Sets the specified `variable` to the desired `value`.

* `streamFile(file, escapeDigits)`

Plays the specified `file`. Playback can be stopped using one of the (optional) `escapeDigits`.

* `hangup()`

Hangs up the current channel.

````javascript

import { AsyncAGIServer, AGIChannel, ChannelStatus, AGIReply } from "..";
import * as AstMan from "asterisk-manager";
import { AmiCredential } from "chan-dongle-extended-client";
const { port, host, user, secret } = AmiCredential.retrieve();

console.log("AGI Server is running");

new AsyncAGIServer(async channel => {


        switch (channel.request.type) {
            case "Dongle":
                await fromDongle(channel);
                break;
            case "SIP":
                await fromSip(channel);
                break;
        }

        console.log("Script returned");


}, new AstMan(port, host, user, secret));

export enum DongleStatus {
    DISCONNECTED = 1,
    CONNECTED_AND_FREE = 2,
    CONNECTED_AND_BUSY = 3
}

async function fromDongle(channel: AGIChannel): Promise<void> {

    let _= channel.relax;

    console.log("FROM DONGLE");

    console.log("callerId:", channel.request.callerid);

    await _.answer();

    console.log("channelStatus:", ChannelStatus[await _.channelStatus()]);

    let activeDongle = {
        "id": await _.getVariable("DONGLENAME"),
        "provider": await _.getVariable("DONGLEPROVIDER"),
        "imei": await _.getVariable("DONGLEIMEI"),
        "imsi": await _.getVariable("DONGLEIMSI"),
        "number": await _.getVariable("DONGLENUMBER")
    };

    console.log("activeDongle: ", activeDongle);

    await _.exec("DongleStatus", [activeDongle.id!, "DONGLE_STATUS"]);

    let dongleStatus = parseInt((await _.getVariable("DONGLE_STATUS"))!) as DongleStatus;

    console.log("Dongle status: ", DongleStatus[dongleStatus]);

    let { timeout, digits } = await _.getData("booba", 3000, 3);

    console.log("timeout: ", timeout);

    console.log("digits: ", digits);

    console.log('beeping in 2 seconds');

    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    await _.streamFile("beep");

    let LE_HIP_HOP= "la_coupole";

    await _.setVariable("LE_HIP_HOP", LE_HIP_HOP);

    console.assert(await _.getVariable("LE_HIP_HOP") === LE_HIP_HOP);

    console.log("before record");

    let recordResult= await _.recordFile("test-record-1", "wav", ["#", "*"], 15000, true);
    
    console.log(`Record result: ${JSON.stringify(recordResult, null, 2)}`);

    console.log("Beep then expect 6 or 7 and timeout after 10s");

    let { digit }= await _.getOption("beep", ["6", "7", "#"], 10000);

    console.log("GetOption digit: ", digit);

    let { failure, relevantResult }= await channel.streamFile('conf-adminmenu', [ "1", "2", "*" ], 6000);

    if( failure && !channel.isHangup ){
        throw new Error("streamFile error");
    }

    console.log(`end position: ${relevantResult!.endPos/1000}s, digit Pressed: ${relevantResult!.digit}`);


    /*
    console.log("manually hangup");
    await _.hangup();
    */


}

async function fromSip(channel: AGIChannel): Promise<void> {

    console.log("FROM SIP");

    console.log('PLAYBACK', await channel.streamFile('conf-adminmenu'));

}

````


## LICENSE


Copyright (c) 2015 Alexandru Pirvulescu <alex@tcnbroadcasting.com>


Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
