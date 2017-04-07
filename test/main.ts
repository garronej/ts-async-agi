import { AsyncAGIServer, AGIChannel, ChannelStatus, AGIReply } from "..";
import * as AstMan from "asterisk-manager";

//You have to provide your own port, host, user and secret
import { AmiCredential } from "chan-dongle-extended-client";
const { port, host, user, secret } = AmiCredential.retrieve();

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


}, new AstMan(port, host, user, secret));