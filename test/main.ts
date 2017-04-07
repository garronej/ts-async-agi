/*
import * as agi from "..";

const { AsyncAGIServer, AGIChannel, ChannelStatus } = agi;
*/

import { AsyncAGIServer, AGIChannel, ChannelStatus, AGIReply } from "..";
import * as AstMan from "asterisk-manager";
import { AmiCredential } from "chan-dongle-extended-client";
const { port, host, user, secret } = AmiCredential.retrieve();

console.log("AGI Server is running!");

new AsyncAGIServer(async channel => {

        switch (channel.request.type) {
            case "Dongle":
                await fromDongle(channel);
                break;
            case "PJSIP":
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

    let { timeout, digits } = await _.getData("demo-instruct", 3000, 3);

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

    console.log("manually hangup");
    await _.hangup();


}

async function fromSip(channel: AGIChannel): Promise<void> {

    console.log("FROM SIP");

    let _= channel.relax;

    await _.answer();

    console.log(await _.streamFile("hello-world"));


}

/*

async function fromDongle(channel: AGIChannel): Promise<void> {

    let _= channel.relax;

    console.log("FROM DONGLE");

    console.log("callerId:", channel.request.callerid);


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

    console.log("call state: ", await _.getVariable("CHANNEL(callstate)"));

    //await _.answer();
    await _.exec("Dial", [ "SIP/alice&SIP/bob", "10" ]);

    await _.streamFile("beep");


}

async function fromSip(channel: AGIChannel): Promise<void> {

    console.log("FROM SIP");

    console.log('PLAYBACK', await channel.streamFile('conf-adminmenu'));

//exten = s,1,Dial(Dongle/${DONGLE}/${DEST_NUM})

}

*/