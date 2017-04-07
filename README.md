## Getting Started

An implementation of Asterisk Async AGI targeted for typescript.
This project is derived from agi-node.

Tested on Asterisk 11.6 & 14.4

This module leverage asterisk-manager

### 1. Installation

``` bash
npm install garronej/ts-async-agi
```

#### 2.Usage

* `AsyncAGIServer` receives two parameters: a `script` and an AMI connection (established through `asterisk-manager`)
* the `script` function must return a void promise, all the channel methods return promises that must complete before the main promise resolve.

Channel method return a Resp object as a promise: 

````javascript
export interface Resp<T> {
    failure: boolean;
    agiReply: AGIReply | null;
    relevantResult: T | null;
}
````
The type T of relevantResult vary for each method.
failure tell if the method failed agiReply represent the parsed result of the AGI command. 

If you don't want to bother dealing with exceptions caused by remote end hangup
use the "relax" methods that only return the relevant result. ( see example)

The API itself is described in `index.d.ts`
Refer to https://www.voip-info.org/wiki-Asterisk+AGI for specific details on method behavior.


#### 2.Example

````javascript
import { AsyncAGIServer, AGIChannel, ChannelStatus, AGIReply } from "ts-async-agi";
import * as AstMan from "asterisk-manager";

/* 
Dialplan example:

[from-sip]
exten = _[+0-9].,1,AGI(agi:async)
*/

console.log("AGI Server is running!");

new AsyncAGIServer(async channel => {

    console.log("callerId: ", channel.request.callerid);

    console.log("dialed number: ", channel.request.extension);

    /*
    The "relax" set of methods will only return relevant response,
    if a method fail due to remote hangup the script will just stop it's execution without throwing error,
    if a method fail but the remote hasn't hangup it will throw an error that can be caught.
    */

    let _= channel.relax;

    //Dialplan function: compute: MD5 of "foobar"
    console.assert(await _.getVariable("MD5(foobar)") === "3858f62230ac3c915f300c664312c63f");

    await _.answer();

    console.assert(await _.channelStatus() === ChannelStatus.LINE_UP);

    console.log([
        "Play /var/lib/asterisk/*/hello-world.*",
        "expect 3 digit to be pressed",
        "timeout after 3 second"
    ].join("\n"));

    let { timeout, digits } = await _.getData("hello-world", 3000, 3);

    console.log(`has timeout: ${timeout}, digits pressed: ${digits}`);

    console.log("Wait 2 second then play beep.");

    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    await _.streamFile("beep");


    await _.setVariable("FOO", "BAR");

    console.log(await _.getVariable("FOO") === "BAR");


    console.log([
        "Record /var/lib/asterisk/test-record-1.wav",
        "caller can stop recording by pressing # or *,",
        "Mar record duration is 15 second,",
        "play beep before"
    ].join("\n"));

    let recordResult = await _.recordFile("test-record-1", "wav", ["#", "*"], 15000, true);

    console.log(`Record result: ${JSON.stringify(recordResult, null, 2)}`);

    console.log("Play the recorded file");

    await _.streamFile("test-record-1");

    console.log("Beep then expect 6, 7 or # and timeout after 10 seconds");

    let { digit } = await _.getOption("beep", ["6", "7", "#"], 10000);

    console.log("GetOption digit: ", digit);

    /*
    To continue script execution after remote hangup and manually handle exceptions 
    use the core methods of the channel object
    */

    console.log("Playing conf-adminmenu from second 6, Press 1, 2 or * to skip");

    let { failure, relevantResult } = await channel.streamFile("conf-adminmenu", ["1", "2", "*"], 6000);

    //If streamFile failed for an other reason than the caller hanging up throw and exception.
    if (failure && !channel.isHangup)
        throw new Error("streamFile error");

    console.log([
        `end position: ${relevantResult!.endPos / 1000}s`,
        `digit Pressed: ${relevantResult!.digit}`,
        `remote is hangup: ${channel.isHangup}`
    ].join("\n"));

    console.log("Calling bob, waiting 10 second then continue");
    await _.exec("Dial", ["SIP/bob", "10"]);

    //Hangup, if not called the execution will continue in dialplan.
    console.log("Hangup");
    await _.hangup();


}, new AstMan(5038, "127.0.0.1", "admin", "password"));

````