
export interface AGIRequest {
    request: string;
    channel: string;
    language: string;
    type: "SIP" | "Dongle" | string;
    uniqueid: string;
    version: string;
    callerid: string | "unknown";
    calleridname: string | "unknown";
    callingpres: string;
    callingani2: string;
    callington: string;
    callingtns: string;
    dnid: string;
    rdnis: string | "unknown";
    context: string;
    extension: string;
    priority: string;
    enhanced: string;
    accountcode: string;
    threadid: string;
}


export class AGIReply {
    private constructor(rawReplyLine: string);
    rawReply: string;
    code: number;
    attributes: {
        result: string;
        [key: string]: string;
    };
    extra?: string;
}

export interface Resp<T> {
    failure: boolean;
    agiReply: AGIReply | null;
    relevantResult: T | null;
}

export class AGIChannel {
    private constructor(...args: any[]);
    isHangup: boolean;
    request: AGIRequest;
    cmdId: number;
    answer(): Promise<Resp<void>>;
    channelStatus(): Promise<Resp<ChannelStatus>>;
    exec(applicationName: string, applicationParameters?: string[]): Promise<Resp<string>>;
    getData(file: string, timeout: number, maxDigits: number): Promise<Resp<{
        digits: string[];
        timeout: boolean;
    }>>;
    getVariable(variableName: string): Promise<Resp<string | null>>;
    getFullVariable(variableName: string, channelId?: string): Promise<Resp<string | null>>;
    streamFile(file: string, escapeDigits?: string[], offset?: number): Promise<Resp<{ endPos: number; digit?: string }>>;
    hangup(): Promise<Resp<void>>;
    setVariable(variable: string, value: string): Promise<Resp<void>>;
    setContext(context: string): Promise<Resp<void>>;
    setExtension(extension): Promise<Resp<void>>;
    setPriority(priority: number): Promise<Resp<void>>;
    getOption(file: string, escapeDigits?: string[], timeout?: number): Promise<Resp<{ endPos: number; digit?: string }>>;

    recordFile(
        file: string,
        format: string | undefined,
        escapeDigits?: string[] | undefined,
        timeout?: number | undefined,
        beep?: boolean
    ): Promise<Resp<{
        recordDuration: number;
        maxLengthReached: boolean;
        escapeDigitPressed: string | null;
        hangup: boolean;
    }>>;

    relax: {
        answer(): Promise<void>;
        channelStatus(): Promise<ChannelStatus>;
        exec(applicationName: string, applicationParameters?: string[]): Promise<string>;
        getData(file: string, timeout: number, maxDigits: number): Promise<{
            digits: string[];
            timeout: boolean;
        }>;
        getVariable(variableName: string): Promise<string | null>;
        getFullVariable(variableName: string, channelId?: string): Promise<string | null>;
        streamFile(file: string, escapeDigits?: string[], offset?: number): Promise<{ endPos: number; digit?: string }>;
        hangup(): Promise<void>;
        setVariable(variable: string, value: string): Promise<void>;
        setContext(context: string): Promise<void>;
        setExtension(extension): Promise<void>;
        setPriority(priority: number): Promise<void>;
        getOption(file: string, escapeDigits?: string[], timeout?: number): Promise<{ endPos: number; digit?: string }>;

        recordFile(
            file: string,
            format: string | undefined,
            escapeDigits?: string[] | undefined,
            timeout?: number | undefined,
            beep?: boolean
        ): Promise<{
            recordDuration: number;
            maxLengthReached: boolean;
            escapeDigitPressed: string | null;
            hangup: boolean;
        }>;
    }
}


export interface Script {
    (channel: AGIChannel): Promise<void>;
}


export class AsyncAGIServer {
    constructor(
        mapper: Script | Record<string, Script>,
        amiConnection: any
    );
}

export class AGIServer {
    constructor(
        mapper: Script | Record<string, Script>,
        port: number
    );
}

export enum ChannelStatus {
    DOWN_AVAILABLE = 0,
    DOWN_RESERVED = 1,
    OFF_HOOK = 2,
    DIGITS_DIALED = 3,
    LINE_RINGING = 4,
    REMOTE_END_RINGING = 5,
    LINE_UP = 6,
    LINE_BUSY = 7
}
