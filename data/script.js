// cSpell:disable
var maxNumberOfScenes;
var midiManglerEnabled = false;
const actionNamesArr = [
    "Send Note On", 
    "Send Note Off", 
    "MIDI CC, absolute value", 
    "MIDI CC, Increment (127)", 
    "MIDI CC, Decrement (0)", 
    "MIDI CC, Increment (64)", 
    "MIDI CC, Decrement (63)", 
    "MIDI CC, Increment (97)", 
    "MIDI CC, Decrement (96)","Send Program Change", 
    "Next Scene", 
    "Previous Scene", 
    "Turn on output port", 
    "Turn off output port", 
    "Toggle output port", 
    "Pulse output port", 
    "Wait (delay)", 
    "Jump to scene", 
    "Set external expression pedal update interval",
    "Send a Play message",
    "Send a Stop message",
    "Send a Continue message",
    "Seek to beginning",
    "Send a custom MIDI message (advanced)",
    "MIDI Mangler - Start a function output",
    "MIDI Mangler - Stop a function output",
    "MIDI Mangler - Function one shot"
];
const actionToolTipsArrObj = {
    0: "Sends a note off event. Select Midi output port, channel, note number, and velocity value.",
    1: "Sends a note on event. Select Midi output port, channel, note number, and velocity value.",
    2: "Sends a specific value to a Midi Continuous Controller (Midi CC). Select the Midi output port, channel, controller (CC) number, and the value to send.",
    3: "Sends an \"Increment\" value of 127 to a Midi Continuous Controller (Midi CC). Select the Midi output port, channel, and controller (CC) number<br><br>Increment / Decrement values may differ between Midi gear. The ones listed here are the most common.",
    4: "Sends an \"Decrement\" value of 0 to a Midi Continuous Controller (Midi CC). Select the Midi output port, channel, and controller (CC) number<br><br>Increment / Decrement values may differ between Midi gear. The ones listed here are the most common.",
    5: "Sends an \"Increment\" value of 64 to a Midi Continuous Controller (Midi CC). Select the Midi output port, channel, and controller (CC) number<br><br>Increment / Decrement values may differ between Midi gear. The ones listed here are the most common.",
    6: "Sends an \"Decrement\" value of 63 to a Midi Continuous Controller (Midi CC). Select the Midi output port, channel, and controller (CC) number<br><br>Increment / Decrement values may differ between Midi gear. The ones listed here are the most common.",
    7: "Sends an \"Increment\" value of 97 to a Midi Continuous Controller (Midi CC). Select the Midi output port, channel, and controller (CC) number<br><br>Increment / Decrement values may differ between Midi gear. The ones listed here are the most common.",
    8: "Sends an \"Decrement\" value of 96 to a Midi Continuous Controller (Midi CC). Select the Midi output port, channel, and controller (CC) number<br><br>Increment / Decrement values may differ between Midi gear. The ones listed here are the most common.",
    9: "Send a \"Program Change\" message on the selected port.",
    10: "Loads the next scene. Actions listed after this will still execute.",
    11: "Loads the previous scene. Actions listed after this will still execute.",
    12: "Turns on (closes) the selected control output. <br><br>Each control port is capable of connecting gear that accepts TS or TRS cables. (i.e. single footswitch or dual footswitch ports.) Each port can also be connected to two (2) TS / single footswitch ports using a TRS to dual TS cable. But be careful of ground loops!",
    13: "Turns off (opens) the selected control output. <br><br>Each control port is capable of connecting gear that accepts TS or TRS cables. (i.e. single footswitch or dual footswitch ports.) Each port can also be connected to two (2) TS / single footswitch ports using a TRS to dual TS cable. But be careful of ground loops!",
    14: "Toggles the selected control output. <br><br>Each control port is capable of connecting gear that accepts TS or TRS cables. (i.e. single footswitch or dual footswitch ports.) Each port can also be connected to two (2) TS / single footswitch ports using a TRS to dual TS cable. But be careful of ground loops!",
    15: "Pulses the selected control output. If the output was on (closed), it will turn off (opens) for the selected pulse time. If it was off (open), it turn on (closes) for the pulse time. <br><br>CAUTION! The next action listed will not wait for the pulse to complete. Once the pulse has begun, the next action will start. Use a \"wait\" action with a similar time to delay moving on to the next action.<br><br>Each control port is capable of connecting gear that accepts TS or TRS cables. (i.e. single footswitch or dual footswitch ports.) Each port can also be connected to two (2) TS / single footswitch ports using a TRS to dual TS cable. But be careful of ground loops!",
    16: "Wait for a period time before executing next action. A \"wait\" actions will start its timer once it is called. The next action will be called even if the scene gets changed prior to the expiry of the \"wait\" timer.",
    17: "Jumps to the selected scene. Actions listed after this will still execute.",
    18: "Sets the update interval for monitoring external expression pedals and foot pedals.<br><br>If this value is set too low, (i.e. updating too fast) there is the potential that latency will be added to forwarding of Midi messages for any port with Midi thru enabled. <br>If this occurs, try increasing this number. If that results in too much latency while operating external pedals, perhaps you are over-taxing the hardware.",
    19: "Send a Play message over the selected MIDI out port. This is a channel agnostic message and will be received by any device connected to the out port.",
    20: "Send a Stop message over the selected MIDI out port. This is a channel agnostic message and will be received by any device connected to the out port.",
    21: "Send a Continue message over the selected MIDI out port. This is a channel agnostic message and will be received by any device connected to the out port.",
    22: "Seek to beginning of song. This is a channel agnostic message and will be received by any device connected to the out port.",
    23: "Send a custom MIDI message. This is advanced functionality that allows you to send any bytes you want over the MIDI port.",
    // Midi Mangler has not been implemented
    24: "MIDI Mangler - start function output",
    25: "MIDI Mangler - Stop function output",
    26: "MIDI Mangler - function one shot",
    27: "",
    38: "",
    255: "Action terminator. This indicates that the action chain is complete."
};
const configToolTipsArrObj = {
    "outputPortConfig": "Configure the output ports. Each port has global settings that apply regardless of the selected scene.",
    "inputPortConfig": "Configure the input ports. Each port has global settings that apply regardless of the selected scene.",
    0: "Output port mode:<br><br>Each output port can set to one of two modes (or disabled).<br><br>Single Mode: use a TS cable to connect to devices that receive single footswitch input.<br><br>Dual Mode: use a TRS cable to connect to devices that receive dual footswtich input.",
    1: "Input port mode:<br><br>Each input port can set to one of four modes (or disabled).<br><br>Single Switch Mode: use a TS cable to connect to single footswitch.<br><br>Dual Switch Mode: use a TRS cable to connect to a dual footswtich.<br><br>Expression Pedal Min/Max: Connect an expression pedal with a TRS cable. Actions will only execute when the pedal is placed in its minumum or maximum positions.<br><br>Expression Pedal Continuous: Connect an expression pedal with a TRS cable. Action will execute any time the pedal position changes and some associated actions can send the pedal position as data.",
    2: "Port polarity:<br><br>If the connected device does not behave as expected, try enabling polarity inversion."
};
const originLocation = location.href;
const sceneNumberInput = document.getElementById("sceneNumberInputField");
const mainBtnNumSelect = document.getElementById("btnNum");
const extPedalPortSelect = document.getElementById("extPedalPortNum");
var currentScene = sceneNumberInput.value - 1;

function ActionsObject() {
    this.action = 255;
    this.actionData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.resetValues = () => {
        this.action = 255;
        this.actionData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
}

function MainButtonObject() {
    this.Actions = new Array();
    for (let i = 0; i < 32; i++) {
        this.Actions.push(new ActionsObject());
    }
    this.topRowText = new Array();
    for (let i = 0; i < 50; i++) {
        this.topRowText.push(0);
    }
    this.resetValues = () => {
        for (let i = 0; i < 50; i++) {
            this.topRowText[i] = 0;
        }
        for (let i = 0; i < 32; i++) {
            this.Actions[i].resetValues();
        }
    }
}

function ExternalButtonsObject() {
    this.Actions = new Array();
    for (let i = 0; i < 32; i++) {
        this.Actions.push(new ActionsObject());
    }
    this.Btn_Mode = 0xff;
    this.resetValues = () => {
        this.Btn_Mode = 0xff;
        for (let i = 0; i < 32; i++) {
            this.Actions[i].resetValues();
        }
    }
}

function OutPortsObject() {
    this.out_mode = 0;
    this.state = 0;
    this.resetValues = () => {
        this.out_mode = 0;
        this.state = 0;
    }
}

let prefsObj = {};
prefsObj.usbToMidi = [true,true,true,true];
prefsObj.midiToUsb = [true,true,true,true];
prefsObj.midiToMidi = [0,0,0,0];
prefsObj.midiChannel = [1,1,1,1];
prefsObj.LCDbrightness = 255;
prefsObj.arrowPositionsText = {0:"Top Right, Bottom Right", 1:"Top Left, Bottom Right", 2:"Top Right, Bottom Left", 3:"Top Left, Bottom Left"};
prefsObj.arrowPositions = 0;
prefsObj.totalNumberOfScenes = 250;
prefsObj.LCDupdateInterval = 350; // time in ms
prefsObj.expressionPedalUpdateInterval = 10;
prefsObj.outPorts = {};
prefsObj.outPorts.modesText = {0:"Single Switch (TS)", 1:"Dual Switch (TRS)", 2:"Disabled", 255:"Disabled"};
prefsObj.outPorts.mode = [0,0,0,0];
prefsObj.outPorts.polarityInv = [false,false,false,false];
prefsObj.inPorts = {};
prefsObj.inPorts.modesText = {0:"Single Switch (TS)", 1:"Dual Switch (TRS)", 2:"Expression Pedal - Min / Max", 3:"Expression Pedal - Continuous", 255:"Disabled"};
prefsObj.inPorts.mode = [0,0,0,0];
prefsObj.inPorts.polarityInv = [false,false,false,false];

console.log(prefsObj);

let currentSceneData = {};
currentSceneData.mainButtons = new Array();
for (let i = 0; i < 10; i++) currentSceneData.mainButtons.push(new MainButtonObject());
currentSceneData.extButtons = new Array();
for (let i = 0; i < 8; i++) currentSceneData.extButtons.push(new ExternalButtonsObject());
currentSceneData.output_ports = new Array();
for (let i = 0; i < 4; i++) currentSceneData.output_ports.push(new OutPortsObject());
currentSceneData.resetValues = () => {
    for (let i = 0; i < 10; i++) currentSceneData.mainButtons[i].resetValues();
    for (let i = 0; i < 8; i++) currentSceneData.extButtons[i].resetValues();
    for (let i = 0; i < 4; i++) currentSceneData.output_ports[i].resetValues();
}
console.log(currentSceneData);

mainBtnNumSelect.addEventListener('change', () => {
    // rewrite displayed actions
    updateMainButtonActions(mainBtnNumSelect.value - 1);
});

extPedalPortSelect.addEventListener('change', () => {
    updateExtPedalPortActions(extPedalPortSelect.value - 1);
})

sceneNumberInput.addEventListener('change', () => {
    currentSceneData.resetValues();
    currentScene = sceneNumberInput.value - 1;
    if (document.getElementById("resetBtnNumberSelectionsOnSceneChangeBOOL").checked){
        mainBtnNumSelect.value = 1;
        extPedalPortSelect.value = 1;
    }
    loadSceneData(currentScene, {
        mainBtn: updateMainButtonActions,
        extPort: updateExtPedalPortActions
    }, {
        mainBtn: mainBtnNumSelect.value - 1,
        extPort: 0
    });
    // loadSceneData(currentScene - 1, {mainBtn:updateMainButtonActions}, mainBtnNumSelect.value - 1);
});


function updateMaxNumberOfScenes() {
    if (originLocation.substring(0, 7) == "file://") {
        maxNumberOfScenes = 100;
        sceneNumberInput.max = maxNumberOfScenes;
    } else {
        httpGet(originLocation + "numScenes", (res) => {
            let value = parseInt(res);
            maxNumberOfScenes = value;
            sceneNumberInput.max = maxNumberOfScenes;
        });
    }
}
// loads scene data from controller, sceneNumber is 0 indexed
function loadSceneData(sceneNumber, cb, ...cbParams) {
    httpGet(originLocation + "loadScene?num=" + sceneNumber, (res) => {
        loadResponseIntoSceneData(res);
        // console.log(cb);
        cb.mainBtn(cbParams[0].mainBtn);
        cb.extPort(cbParams[0].extPort);
    })
}

(function loadPrefs(){
    httpGet(originLocation + "prefs", (res) =>{
        let iterator = 0;
        let line = 0;
        while (res[iterator] != undefined) {
            let readChar = res[iterator++];
            if (readChar == '\r') {
                // do nothing, skip carriage return
            } else if (readChar == '\n' || readChar == '/') { // new line or reached comment
                line++;
            } else {
                switch (line) {
                case 0: { // MIDI to USB passthrough setting
                    for (let i = 0; i < 4; i++) {
                        while (readChar != ',' && readChar != '/') {
                            if (readChar == 't') {
                                prefsObj.midiToUsb[i] = true;
                            } else if (readChar == 'f') {
                                prefsObj.midiToUsb[i] = false;
                            } else {
                                // sdCardFile.close();
                                return false;
                            }
                            readChar = res[iterator++];
                        }
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 1: { // USB to MIDI passthrough setting
                    for (let i = 0; i < 4; i++) {
                        while (readChar != ',' && readChar != '/') {
                            if (readChar == 't') {
                                prefsObj.usbToMidi[i] = true;
                            } else if (readChar == 'f') {
                                prefsObj.usbToMidi[i] = false;
                            } else {
                                // sdCardFile.close();
                                return false;
                            }
                            readChar = res[iterator++];
                        }
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 2: { // MIDI to MIDI passthrough setting
                    for (let i = 0; i < 4; i++) {
                        while (readChar != ',' && readChar != '/') {
                            prefsObj.midiToMidi[i] = parseInt(readChar);
                            readChar = res[iterator++];
                        }
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 3: { // LCD backlight brightness
                    let intBuf = "";
                    while (readChar != '/' && readChar != '\n') {
                        intBuf += readChar;
                        readChar = res[iterator++];
                    }
                    prefsObj.LCDbrightness = parseInt(intBuf);
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 4: { // Hardware midi port channel setting
                    // Used for thru filtering when thru settings is midi::Thru::SameChannel or midi::Thru::DifferentChannel
                    // Sets channel for selected port. 
                    for (let i = 0; i < 4; i++) {
                        let temp = "";
                        while (readChar != ',' && readChar != '/') {
                            temp += readChar;
                            readChar = res[iterator++];
                        }
                        prefsObj.midiChannel[i] = parseInt(temp);
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 5: { // arrow positions
                    let intBuf = "";
                    while (readChar != '/' && readChar != '\n') {
                        intBuf += readChar;
                        readChar = res[iterator++];
                    }
                    prefsObj.arrowPositions = parseInt(intBuf);
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 6: { // Number of scenes 
                    let intBuf = "";
                    while (readChar != '/' && readChar != '\n') {
                        intBuf += readChar;
                        readChar = res[iterator++];
                    }
                    let num = parseInt(intBuf);
                    prefsObj.totalNumberOfScenes = num <= 1500 ? num : 1500;
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 7: { // LCD update time
                    let intBuf = "";
                    while (readChar != '/' && readChar != '\n') {
                        intBuf += readChar;
                        readChar = res[iterator++];
                    }
                    prefsObj.LCDupdateInterval = parseInt(intBuf);
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 8: { // Output port modes
                    for (let i = 0; i < 4; i++) {
                        let temp = "";
                        while (readChar != ',' && readChar != '/') {
                            temp += readChar;
                            readChar = res[iterator++];
                        }
                        prefsObj.outPorts.mode[i] = parseInt(temp);
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 9: { // Output port polarity inversoin
                    for (let i = 0; i < 4; i++) {
                        while (readChar != ',' && readChar != '/') {
                            if (readChar == 't') {
                                prefsObj.outPorts.polarityInv[i] = true;
                            } else if (readChar == 'f') {
                                prefsObj.outPorts.polarityInv[i] = false;
                            } else {
                                // sdCardFile.close();
                                return false;
                            }
                            readChar = res[iterator++];
                        }
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 10: { // Input port modes
                    for (let i = 0; i < 4; i++) {
                        let temp = "";
                        while (readChar != ',' && readChar != '/') {
                            temp += readChar;
                            readChar = res[iterator++];
                        }
                        prefsObj.inPorts.mode[i] = parseInt(temp);
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 11: { // Input port polarity inverison
                    for (let i = 0; i < 4; i++) {
                        while (readChar != ',' && readChar != '/') {
                            if (readChar == 't') {
                                prefsObj.inPorts.polarityInv[i] = true;
                            } else if (readChar == 'f') {
                                prefsObj.inPorts.polarityInv[i] = false;
                            } else {
                                // sdCardFile.close();
                                return false;
                            }
                            readChar = res[iterator++];
                        }
                        readChar = res[iterator++];
                    }
                    while (readChar != '\n' && res[iterator] != undefined)
                        readChar = res[iterator++]; // read through comment if present
                    break;
                }
                case 12: { // unused
                    
                    break;
                }
                }
                line++;
            }
        }
        console.log(prefsObj);
        setConfigElementsByPrefs();
    })
})()

function setConfigElementsByPrefs(){
    for(let i = 1; i <= 4; i++){
        // console.log("ports #" + i); //////////////////////////////////////////////////
        let el = document.getElementById("outputPort" + i + "Mode");
        let optSel = parseInt(prefsObj.outPorts.mode[i-1]);
        if(optSel>2){
            optSel = 2;
        }
        // console.log(optSel); //////////////////////////////////////////////////
        el.options[optSel].selected = true;
        el.addEventListener('change',updatePrefsObjFromEls);
        el = document.getElementById("outputPort" + i + "Pol");
        optSel = prefsObj.outPorts.polarityInv[i-1];
        // console.log(optSel); //////////////////////////////////////////////////
        if(optSel == true || optSel == "true"){
            optSel = 1;
        }else{
            optSel = 0;
        }
        // console.log(optSel); //////////////////////////////////////////////////
        el.options[optSel].selected = true;
        el.addEventListener('change',updatePrefsObjFromEls);
        el = document.getElementById("inputPort" + i + "Mode");
        optSel = parseInt(prefsObj.outPorts.mode[i-1]);
        // console.log(optSel); //////////////////////////////////////////////////
        if(optSel>2){
            optSel = 2;
        }
        // console.log(optSel); //////////////////////////////////////////////////
        el.options[optSel].selected = true;
        el.addEventListener('change',updatePrefsObjFromEls);
        el = document.getElementById("inputPort" + i + "Pol");
        optSel = prefsObj.inPorts.polarityInv[i-1];
        // console.log(optSel); //////////////////////////////////////////////////
        if(optSel == true || optSel == "true"){
            optSel = 1;
        }else{
            optSel = 0;
        }
        // console.log(optSel); //////////////////////////////////////////////////
        el.options[optSel].selected = true;
        el.addEventListener('change',updatePrefsObjFromEls);
    }
    for(let i = 25; i > 0; i--){
        let newOpt = document.createElement("option");
        newOpt.innerHTML = i==25?"25 (MAX)":i;
        // console.log(prefsObj.LCDbrightness);
        if(prefsObj.LCDbrightness == (i * 10)) newOpt.selected = true;
        document.getElementById("config_LCD_Backlight").appendChild(newOpt);
        document.getElementById("config_LCD_Backlight").addEventListener('change',updatePrefsObjFromEls);
    }

    let chanLists = document.getElementsByClassName("MIDI_ChanList");
    let iterator = 0;
    for(sel of chanLists){
        for(let i = 0; i < 17; i++){
            let newOpt = document.createElement("option");
            newOpt.innerHTML = i==0?"Omni":i;
            if(prefsObj.midiChannel[iterator] == i)newOpt.selected = true;
            sel.appendChild(newOpt);
            sel.addEventListener('change',updatePrefsObjFromEls);
        }
        iterator++;
    }

    let saveConfigButtons = document.getElementsByClassName("configSaveButton");
    for(el of saveConfigButtons){
        el.addEventListener('click',savePrefs);
    }
}

function updatePrefsObjFromEls(event){
    let el = event.path[0];
    let value = event.target.value;
    switch(el.id){
        case "outputPort1Mode":
        {
            prefsObj.outPorts.mode[0] = parseInt(value);
            break;
        }
        case "outputPort2Mode":
        {
            prefsObj.outPorts.mode[1] = parseInt(value);
            break;
        }
        case "outputPort3Mode":
        {
            prefsObj.outPorts.mode[2] = parseInt(value);
            break;
        }
        case "outputPort4Mode":
        {
            prefsObj.outPorts.mode[3] = parseInt(value);
            break;
        }
        case "outputPort1Pol":
        {
            if(value == true || value == "true")
                prefsObj.outPorts.polarityInv[0] = true;
            else prefsObj.outPorts.polarityInv[0] = false;
            break;
        }
        case "outputPort2Pol":
        {
            if(value == true || value == "true")
                prefsObj.outPorts.polarityInv[1] = true;
            else prefsObj.outPorts.polarityInv[1] = false;
            break;
        }
        case "outputPort3Pol":
        {
            if(value == true || value == "true")
                prefsObj.outPorts.polarityInv[2] = true;
            else prefsObj.outPorts.polarityInv[2] = false;
            break;
        }
        case "outputPort4Pol":
        {
            if(value == true || value == "true")
                prefsObj.outPorts.polarityInv[3] = true;
            else prefsObj.outPorts.polarityInv[3] = false;
            break;
        }
        case "inputPort1Mode":
        {
            prefsObj.inPorts.mode[0] = parseInt(value);
            break;
        }
        case "inputPort2Mode":
        {
            prefsObj.inPorts.mode[1] = parseInt(value);
            break;
        }
        case "inputPort3Mode":
        {
            prefsObj.inPorts.mode[2] = parseInt(value);
            break;
        }
        case "inputPort4Mode":
        {
            prefsObj.inPorts.mode[3] = parseInt(value);
            break;
        }
        case "inputPort1Pol":
        {
            if(value == true || value == "true")
                prefsObj.inPorts.polarityInv[0] = true;
            else prefsObj.inPorts.polarityInv[0] = false;
            break;
        }
        case "inputPort2Pol":
        {
            if(value == true || value == "true")
                prefsObj.inPorts.polarityInv[1] = true;
            else prefsObj.inPorts.polarityInv[1] = false;
            break;
        }
        case "inputPort3Pol":
        {
            if(value == true || value == "true")
                prefsObj.inPorts.polarityInv[2] = true;
            else prefsObj.inPorts.polarityInv[2] = false;
            break;
        }
        case "inputPort4Pol":
        {
            if(value == true || value == "true")
                prefsObj.inPorts.polarityInv[3] = true;
            else prefsObj.inPorts.polarityInv[3] = false;
            break;
        }
        default:
            break;
    }
    console.log(prefsObj);
}

function savePrefs(){
    // console.log("clicked");
    // Serialize prefs data
    let outData = "";
    for(let i = 0; i < 4; i++){
        if(prefsObj.midiToUsb[i]) outData += "t";
        else outData += "f";
        outData += i!=3?",":"/";
    }
    outData += "\tMIDItoUSB\n";
    for(let i = 0; i < 4; i++){
        if(prefsObj.usbToMidi[i]) outData += "t";
        else outData += "f";
        outData += i!=3?",":"/";
    }
    outData += "\tUSBtoMIDI\n";
    for(let i = 0; i < 4; i++){
        outData += parseInt(prefsObj.midiToMidi[i]);
        outData += i!=3?",":"/";
    }
    outData += "\tMIDItoMIDI with filer channel\n";
    outData += parseInt(prefsObj.LCDbrightness) + "/\t\tbacklight brightness\n";
    for(let i = 0; i < 4; i++){
        outData += parseInt(prefsObj.midiChannel[i]);
        outData += i!=3?",":"/";
    }
    outData += "\tMIDI channel\n";
    outData += parseInt(prefsObj.arrowPositions) + "/\t\t\tArrow positions\n";
    outData += parseInt(prefsObj.totalNumberOfScenes) + "/\t\tNumber of scenes\n";
    outData += parseInt(prefsObj.LCDupdateInterval) + "/\t\tLCD scroll text update timne in milliseconds\n";
    for(let i = 0; i < 4; i++){
        outData += parseInt(prefsObj.outPorts.mode[i]);
        outData += i!=3?",":"/";
    }
    outData += "\tOutput Port Modes\n";
    for(let i = 0; i < 4; i++){
        if(prefsObj.outPorts.polarityInv[i]) outData += "t";
        else outData += "f";
        outData += i!=3?",":"/";
    }
    outData += "\tOutput port polarity inversion\n";
    for(let i = 0; i < 4; i++){
        outData += parseInt(prefsObj.inPorts.mode[i]);
        outData += i!=3?",":"/";
    }
    outData += "\tInput Port Modes\n";
    for(let i = 0; i < 4; i++){
        if(prefsObj.inPorts.polarityInv[i]) outData += "t";
        else outData += "f";
        outData += i!=3?",":"/";
    }
    outData += "\tInput port polarity inversion\n";
    outData += '\n';
    console.log(outData);
    //@todo save prefs to teensy SD
}

actionCount = 0;
class InsertActionDropDown {
    constructor(actionObj, classAndIdPrefix) {
        this.action = actionObj;

        this.form = '<form id="' + classAndIdPrefix + actionCount + 'form" class="' + classAndIdPrefix + 'FormClass"><label>Action: </label><select class="' + classAndIdPrefix + '_actionDropDown actionDropDown" id="' + classAndIdPrefix + actionCount + '">';
        for (let i = 0; i < 27; i++) {
            this.form += '<option value="' + i + '"';
            this.form += this.action.action == i ? 'selected="selected"' : ' ';
            this.form += '>' + actionNamesArr[i] + '</option>';
        }

        this.form += '<option value="255"';
        this.form += this.action.action == 255 ? 'selected="selected"' : ' ';
        this.form += '>Terminator.</option>';
        this.form += '</select>';

        // this array indicates whether an option dropdown should be displayed for each type of action.
        // Actions can have up to 6 options in this configuration, but current the most and action has is 4.
        let optionsEnabled = [
            ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26"],
            ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "12", "13", "14", "15", "16", "23", "x24", "x25", "x26"],
            ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "15", "16", "23", "x24", "x25", "x26"],
            ["0", "1", "2","23", "x24", "x25", "x26"],
            ["x24", "x25", "x26"],
            ["x24", "x25", "x26"]
        ];
        for (let i = 0; i < 6; i++)
            if (optionsEnabled[i].includes(this.action.action))
                this.form += '<label class="actionOptionLabel" id="' + classAndIdPrefix + actionCount + 'option' + i + 'label" ></label><select class="actionOptionSelect" id="' + classAndIdPrefix + actionCount + 'option' + i + 'select" ></select>';
            else if (optionsEnabled[i].includes("x"+this.action.action) && midiManglerEnabled)
                this.form += '<label class="actionOptionLabel" id="' + classAndIdPrefix + actionCount + 'option' + i + 'label" ></label><select class="actionOptionSelect" id="' + classAndIdPrefix + actionCount + 'option' + i + 'select" ></select>';
        this.form += '</form>';
        actionCount++;
    }
};

function updateExtPedalPortActions(portNumber) {
    // need to be able to set port mode: TS, TRS, Expression, or Disabled
    let extPedalActionsElement = document.getElementById("extPedalsActions");
    let extPedalPortMode = currentSceneData.extButtons[portNumber].Btn_Mode;
    let actionsElementHTML = "Port Mode: <select id=\"extPedalPortModeSelect\"><option value=\"0\">Single Button</option><option value=\"1\">Dual Button</option><option value=\"2\">Expression Pedal - Min / Max</option><option value=\"3\">Expression Pedal - Continuous</option><option value=\"255\">Disabled</option></select></br>";
    console.log(extPedalPortMode);
    let secondaryOptionId = "";
    switch (extPedalPortMode) {
        case "0": { // Single Button mode
            actionCount = 0;
            for (let i = 0; i < 32; i++) {
                let action = new InsertActionDropDown(currentSceneData.extButtons[portNumber].Actions[i], "extPedlAction");
                actionsElementHTML += action.form;
                if (currentSceneData.extButtons[portNumber].Actions[i].action == 255) i = 32;
            }
            secondaryOptionId = null;
            break;
        }
        case "1": { // Dual button mode
            actionsElementHTML += "<form>Ring Actions: </form>";
            actionCount = 0;
            for (let i = 0; i < 32; i++) {
                let action = new InsertActionDropDown(currentSceneData.extButtons[portNumber].Actions[i], "extPedlAction");
                actionsElementHTML += action.form;
                if (currentSceneData.extButtons[portNumber].Actions[i].action == 255) i = 32;
            }

            actionsElementHTML += "<hr>";
            actionsElementHTML += "<form>Tip Actions: </form>";

            actionCount = 50;
            for (let i = 0; i < 32; i++) {
                let action = new InsertActionDropDown(currentSceneData.extButtons[portNumber + 4].Actions[i], "extPedlAction");
                actionsElementHTML += action.form;
                if (currentSceneData.extButtons[portNumber + 4].Actions[i].action == 255) i = 32;
            }

            secondaryOptionId = "extPedalPortTipRingSelect";
            break;

        }
        case "3":
        case "2": { // Expression pedal mode
            actionCount = 0;
            for (let i = 0; i < 32; i++) {
                let action = new InsertActionDropDown(currentSceneData.extButtons[portNumber].Actions[i], "extPedlAction");
                actionsElementHTML += action.form;
                if (currentSceneData.extButtons[portNumber].Actions[i].action == 255) i = 32;
            }

            secondaryOptionId = "extPedalPortExpPedalModeSelect";
            break;
        }
        case "255": { // port disabled

            secondaryOptionId = null;
            break;
        }
    }

    extPedalActionsElement.innerHTML = actionsElementHTML;
    let extPedalPortModeSelectElement = document.getElementById("extPedalPortModeSelect");
    extPedalPortModeSelectElement.value = currentSceneData.extButtons[portNumber].Btn_Mode;
    extPedalPortModeSelectElement.addEventListener('change', () => {
        currentSceneData.extButtons[portNumber].Btn_Mode = extPedalPortModeSelectElement.value;
        if (extPedalPortModeSelectElement.value == 1) currentSceneData.extButtons[portNumber + 4].Btn_Mode = extPedalPortModeSelectElement.value;
        else currentSceneData.extButtons[portNumber + 4].Btn_Mode = 255;
        updateExtPedalPortActions(portNumber);
    })


    let actionDropDownMenu = document.getElementsByClassName("extPedlAction_actionDropDown");
    Array.from(actionDropDownMenu).forEach((element, ind) => {
        let actionNumber = parseInt(element.id.substring(13)); // get the actionNumber from the id
        element.addEventListener('change', (el) => {
            // let actionNumber = parseInt(el.target.id.substring(13)); // get the actionNumber from the id
            currentSceneData.extButtons[actionNumber < 50 ? portNumber : portNumber + 4].Actions[actionNumber < 50 ? actionNumber : actionNumber - 50].action = el.target.value;
            // once the currentSceneData object has been updated, redo the layout...
            updateExtPedalPortActions(portNumber);
            console.log(currentSceneData);
        });
        setupActionOptions(element, actionNumber, actionNumber < 50 ? portNumber : portNumber + 4, "extPedlAction", currentSceneData.extButtons);
    })

    if (extPedalPortMode == "2" || extPedalPortMode == "3") {
        let actionFormElements = document.getElementsByClassName("extPedlActionFormClass");
        // console.log(actionFormElements);
        Array.from(actionFormElements).forEach((actionFormEl, ind1) => {
            let actionFormDropDownElements = actionFormEl.getElementsByClassName("actionOptionSelect");
            // console.log(actionFormDropDownElements);
            Array.from(actionFormDropDownElements).forEach((dropDownEl, ind2) => {
                // console.log(dropDownEl);
                if (ind2 != 0) {
                    let newOption = document.createElement('option');
                    newOption.value = "var";
                    newOption.innerHTML = "Vary";
                    dropDownEl.appendChild(newOption)
                }
            })
        })
    }

}

// update the html with actions. 'buttonNumber' is 0 indexed.
function updateMainButtonActions(buttonNumber) {
    // console.log({buttonNumber});
    let mainBtnActions = document.getElementById("mainBtnsActions");
    let topRowText = String.fromCharCode(...currentSceneData.mainButtons[buttonNumber].topRowText);
    topRowText = topRowText.substring(0, topRowText.indexOf('\0')); // trim off null chars
    let actionsHTML = 'Display: <input type="text" placeholder="Text to display on the LCD." name="topRowTextInput" size="100" required id="topRowTextInput" maxlength="50"></br>';
    actionCount = 0;
    for (let i = 0; i < 32; i++) {
        let action = new InsertActionDropDown(currentSceneData.mainButtons[buttonNumber].Actions[i], "mainBtnAction");
        actionsHTML += action.form;
        if (currentSceneData.mainButtons[buttonNumber].Actions[i].action == 255) i = 32;
    }
    mainBtnActions.innerHTML = actionsHTML;
    let inputEl = mainBtnActions.getElementsByTagName("input");
    inputEl[0].value = topRowText;

    // add listener for changes in the text box, save the change to the currentSceneData object.
    document.getElementById("topRowTextInput").addEventListener('input', (el) => {
        // iterate through all the data in the text box, converting characters to ascii code ints
        for (let i = 0; i < el.target.value.length; i++)
            currentSceneData.mainButtons[buttonNumber].topRowText[i] = el.target.value.charCodeAt(i);
        // pad out the array with 0's
        for (let i = el.target.value.length; i < 50; i++)
            currentSceneData.mainButtons[buttonNumber].topRowText[i] = 0;
    })

    // add event listeners for each of the option drop downs
    let actionDropDownMenu = document.getElementsByClassName("mainBtnAction_actionDropDown");
    Array.from(actionDropDownMenu).forEach((element, ind) => {
        element.addEventListener('change', (el) => {
            // get the actionNumber from the id
            currentSceneData.mainButtons[buttonNumber].Actions[parseInt(el.target.id.substring(13))].action = el.target.value;
            // once the currentSceneData object has been updated, redo the layout...
            updateMainButtonActions(buttonNumber);
        });
        setupActionOptions(element, ind, buttonNumber, "mainBtnAction", currentSceneData.mainButtons);
    })

    // add event listener for tooltip on the "action" form. Will display useful info when mousing over.
    Array.from(document.getElementsByClassName("mainBtnActionFormClass")).forEach((el, ind) => {
        el.addEventListener('mouseover', (elmnt) => {
            // get the tool tip text form the array using the action type as index. Action number
            // comes from parsing the id of hovered element for the integer at position 13.
            let toolTipText = actionToolTipsArrObj[currentSceneData.mainButtons[buttonNumber].Actions[parseInt(el.id.substring(13))].action];
            let toolTipTextBox = document.getElementById("toolTipArea");
            if (toolTipText != undefined) toolTipTextBox.innerHTML = toolTipText;
            else toolTipTextBox.innerHTML = ' ';
        })
        el.addEventListener('mouseout', () => {
            document.getElementById("toolTipArea").innerHTML = ' ';
        })
    })
}

// adds event listener to option drop down.
function addInputListener(el, arrInd, btnNum, actionNumber, objectToChange, log = false) {
    el.addEventListener('input', () => {
        if (el.value != -1) objectToChange[btnNum].Actions[actionNumber].actionData[arrInd] = parseInt(el.value);
        if (log) console.log(objectToChange[btnNum].Actions[actionNumber]);
    })
}

function setupActionOptions(el, actionNumber, btnNum, idPrefix, objectToMod) {
    let optionIdString1 = idPrefix + actionNumber + "option";
    if (actionNumber >= 50) actionNumber -= 50;
    let labelElements = new Array();
    for (let i = 0; i < 5; i++) {
        labelElements.push(document.getElementById(optionIdString1 + i + "label"));
    }

    let selectElements = new Array();
    for (let i = 0; i < 5; i++) {
        selectElements.push(document.getElementById(optionIdString1 + i + "select"));
    }

    // console.log(currentSceneData.mainButtons[btnNum].Actions[actionNumber]);

    switch (el.value) {
        case "0": // Send Note On
        case "1": { // Send Note Off
            labelElements[0].innerHTML = "Midi out port: ";
            labelElements[1].innerHTML = "Midi Channel: ";
            labelElements[2].innerHTML = "Midi note value: ";
            labelElements[3].innerHTML = "Note velocity: ";

            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[0]) newOption.selected = "selected";
                selectElements[0].appendChild(newOption);
                addInputListener(selectElements[0], 0, btnNum, actionNumber, objectToMod);
            }

            for (let i = 1; i < 17; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[1]) newOption.selected = "selected";
                selectElements[1].appendChild(newOption);
                addInputListener(selectElements[1], 1, btnNum, actionNumber, objectToMod);
            }

            for (let i = 127; i >= 0; i--) {
                let sharp = String.fromCharCode(9839);
                let flat = String.fromCharCode(9837);
                let notes = ["A", "A" + sharp + "/B" + flat, "B", "C", "C" + sharp + "/D" + flat, "D", "D" + sharp + "/E" + flat, "E", "F", "F" + sharp + "/G" + flat, "G", "G" + sharp + "/A" + flat];
                let newOption = document.createElement('option');
                newOption.value = i;
                let noteIndex = i % 12 > 8 ? (i % 12) - 9 : (i % 12) + 3;
                newOption.innerHTML = notes[noteIndex] + '&nbsp;' + Math.floor((i / 12) - 1) + '&nbsp;' + "(" + i + ")";
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[2]) newOption.selected = "selected";
                selectElements[2].appendChild(newOption);
                addInputListener(selectElements[2], 2, btnNum, actionNumber, objectToMod);
            }

            for (let i = 127; i > -1; i--) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[3]) newOption.selected = "selected";
                selectElements[3].appendChild(newOption);
                addInputListener(selectElements[3], 3, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "2": { // Send specific midi CC
            labelElements[0].innerHTML = "Midi out port: ";
            labelElements[1].innerHTML = "Midi Channel: ";
            labelElements[2].innerHTML = "Midi CC#: ";
            labelElements[3].innerHTML = "Midi CC value: ";
            let optionNumber = 0;
            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 16; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 128; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 128; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "3": // Send increment / decrement
        case "4": // Send increment / decrement
        case "5": // Send increment / decrement
        case "6": // Send increment / decrement
        case "7": // Send increment / decrement
        case "8": { // Send increment / decrement
            labelElements[0].innerHTML = "Midi out port: ";
            labelElements[1].innerHTML = "Midi Channel: ";
            labelElements[2].innerHTML = "Midi CC#: ";

            let optionNumber = 0;
            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 16; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 128; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "9": // Send program change
        {
            labelElements[0].innerHTML = "Midi out port: ";
            labelElements[1].innerHTML = "Midi Channel: ";
            labelElements[2].innerHTML = "Program Number: ";

            let optionNumber = 0;
            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 16; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 128; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "14": // toggle output 
        case "12": // turn output on 
        case "13": { // turn output off
            labelElements[0].innerHTML = "Control port #: ";
            labelElements[1].innerHTML = "Tip or Ring: ";

            let optionNumber = 0;
            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Control Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 2; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i == 1 ? 'Tip' : 'Ring';
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "15": { // pulse output
            labelElements[0].innerHTML = "Control port #: ";
            labelElements[1].innerHTML = "Tip or Ring: ";
            labelElements[2].innerHTML = "Pulse time (ms): ";

            let optionNumber = 0;
            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Control Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 2; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i == 1 ? 'Tip' : 'Ring';
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 10; i < 101; i+=10) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i * 10;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "16": { // wait for a time
            labelElements[0].innerHTML = "Minutes: ";
            labelElements[1].innerHTML = "Seconds: ";
            labelElements[2].innerHTML = "Milliseconds: ";

            let optionNumber = 0;
            for (let i = 0; i < 3; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 60; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 100; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i * 10;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }

            break;
        }
        case "17": { // jump to scene
            labelElements[0].innerHTML = "Scene Number: ";

            let optionNumber = 0;
            for (let i = 0; i < maxNumberOfScenes; i++) {
                if (i != currentScene) {
                    let newOption = document.createElement('option');
                    newOption.value = i;
                    newOption.innerHTML = i + 1;
                    if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                    selectElements[optionNumber].appendChild(newOption);
                    addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
                }
            }
            break;
        }
        case "18": { // external input update interval
            labelElements[0].innerHTML = "Milliseconds: ";

            let optionNumber = 0;
            for (let i = 1; i <= 50; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i*10;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "19": // send play message
        case "20": // Send stop message
        case "21": // send continue message
        case "22": {// seek to beginning
            labelElements[0].innerHTML = "Midi out port: ";

            let optionNumber = 0;
            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "23": { // custom midi message
            labelElements[0].innerHTML = "MIDI out port: ";
            labelElements[1].innerHTML = "Byte 1: ";
            labelElements[2].innerHTML = "Byte 2: ";
            labelElements[3].innerHTML = "Byte 3: ";

            let optionNumber = 0;
            for (let i = 0; i < 4; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = "Port " + (i + 1);
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;
            for (let i = 0; i < 256; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 256; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            optionNumber++;

            for (let i = 0; i < 256; i++) {
                let newOption = document.createElement('option');
                newOption.value = i;
                newOption.innerHTML = i;
                if (i == objectToMod[btnNum].Actions[actionNumber].actionData[optionNumber]) newOption.selected = "selected";
                selectElements[optionNumber].appendChild(newOption);
                addInputListener(selectElements[optionNumber], optionNumber, btnNum, actionNumber, objectToMod);
            }
            break;
        }
        case "24": // Midi mangler - start function output
        case "25": // midi mangler - Stop function output
        case "26": { // Midi mangler - function one shot
            if(midiManglerEnabled){
                // do midi mangler stuff
                labelElements[0].innerHTML = "MIDI Mangler functionality not implemented.";
            }else{
                labelElements[0].innerHTML = "MIDI Mangler not enabled.";
            }
            break;
        }

    }
}


function loadResponseIntoSceneData(data) {
    let iterator = 0;
    currentSceneData.resetValues();
    while (data[iterator] != undefined) {
        let readChar = data[iterator];
        iterator++;
        while ((data[iterator] != undefined) && ((readChar == '\n') || (readChar == ' ') || (readChar == '\t') || (readChar == '\r'))) {
            readChar = data[iterator++]; // read through white space if present
        }
        if (data[iterator] == undefined) break;
        let asciiCodedHex = new Array(4); // null terminated char array of 4 spaces
        let ind = 0; // index to keep track of how much useful data is in the array
        let readInt = 0; // integer version of the asciiCodedHex
        let dataArray = new Array(256); // an array to accumulate data.
        for (let i = 0; i < 256; i++)
            dataArray[i] = 0; // init the array to zeroes
        while (readChar != ':' && data[iterator] != undefined) { // loop through until we reach a colon. this indicates the end of "readInt"
            asciiCodedHex[ind++] = readChar;
            if (data[iterator] != undefined) {
                readChar = data[iterator++];
            }
        }
        readInt = parseInt(asciiCodedHex.join(''), 16); // convert the ascii coded hex into an int
        ind = 0; // reset the index
        readChar = data[iterator++];
        // loop though until we get to a comment, a newline, or a semicolon. Any of these indicate the end of the data array
        while ((readChar != '/') && (readChar != '\n') && (readChar != ';') && (readChar != '\r') && (data[iterator] != undefined)) {
            asciiCodedHex[0] = readChar;
            if (data[iterator] != undefined) {
                asciiCodedHex[1] = data[iterator++];
            }
            asciiCodedHex[2] = ' '; // have to set byte #3 as ascii NULL because we are only using 2 ascii characters at a time here
            dataArray[ind++] = parseInt(asciiCodedHex.join(''), 16);
            if (data[iterator] != undefined) {
                readChar = data[iterator++];
            }
        }
        // send the data to the scenesArr obj in PSRAM
        // loadSceneDataIntoRAM(sceneNumber, readInt, dataArray, ind);
        switch (true) {
            // case 0x0000 ... 0x000f: // main buttons top row text
            case (readInt >= 0x0000) && (readInt <= 0x000f): {
                let buttonNumber = readInt & 0x000f;
                for (let i = 0; i < ind; i++) {
                    currentSceneData.mainButtons[buttonNumber].topRowText[i] = dataArray[i];
                }

                // ensure that the final character in the char array is null.
                if (currentSceneData.mainButtons[buttonNumber].topRowText[ind - 1] != '\0' && ind < 50) {
                    currentSceneData.mainButtons[buttonNumber].topRowText[ind] = '\0';
                }
                break;
            }
            // case 0x0010 ... 0x001f: // main buttons actions->action
            case readInt >= 0x0010 && readInt <= 0x001f: {
                let buttonNumber = readInt & 0x000f;
                for (let i = 0; i < ind; i++) {
                    currentSceneData.mainButtons[buttonNumber].Actions[i].action = dataArray[i].toString();
                }
                break;
            }
            // case 0x0200 ... 0x02ff: // main buttons actions->actiondata[16]
            case readInt >= 0x2000 && readInt <= 0x2fff: {
                let buttonNum = readInt & 0x000f;
                let actionNumber = (readInt & 0x0ff0) >> 4;
                for (let i = 0; i < ind; i++) {
                    currentSceneData.mainButtons[buttonNum].Actions[actionNumber].actionData[i] = dataArray[i];
                }
                break;
            }
            // case 0x0030 ... 0x003f: // output ports output mode
            case readInt >= 0x0030 && readInt <= 0x003f: {
                let portNumber = readInt & 0x000f;
                currentSceneData.output_ports[portNumber].out_mode = dataArray[0];
                break;
            }
            // case 0x0040 ... 0x004f: // output ports state
            case readInt >= 0x0040 && readInt <= 0x004f: {
                let portNumber = readInt & 0x000f;
                currentSceneData.output_ports[portNumber].state = dataArray[0];
                break;
            }
            // case 0x0050 ... 0x005f: // external button / expression pedal input port mode
            case readInt >= 0x0050 && readInt <= 0x005f: {
                let externalButtonNum = readInt & 0x000f;
                currentSceneData.extButtons[externalButtonNum].Btn_Mode = dataArray[0];
                break;
            }
            // case 0x0060 ... 0x006f: // ext button / exp pedal actions->action
            case readInt >= 0x0060 && readInt <= 0x006f: {
                let externalButtonNum = readInt & 0x000f;
                for (let i = 0; i < ind; i++) {
                    currentSceneData.extButtons[externalButtonNum].Actions[i].action = dataArray[i].toString();
                }
                break;
            }
            // case 0x4000 ... 0x40ff: // ext buttons / exp pedal actions->actiondata[16]
            case readInt >= 0x4000 && readInt <= 0x4fff: {
                let externalButtonNum = readInt & 0x000f;
                let actionNumber = (readInt & 0x0ff0) >> 4;
                for (let i = 0; i < ind; i++) {
                    currentSceneData.extButtons[externalButtonNum].Actions[actionNumber].actionData[i] = dataArray[i];
                }
                break;
            }
        }
        if (readChar == '/') {
            while (data[iterator] != undefined && readChar != '\n')
                readChar = data[iterator++]; // read through comment if present
        }
    }
    console.log(currentSceneData);
    return data;
}

function printfJS(formatString,val){
    let padding = formatString.charAt(1);
    let length = parseInt(formatString.charAt(2));
    let radix = (formatString.charAt(3)=="X")||(formatString.charAt(3)=="x")?16:10;
    let valInt = parseInt(val);
    let valString = valInt.toString(radix);
    let lenDiff = length - valString.length;
    let paddingString = "";
    // Math.abs()
    for(let i =0;i<Math.abs(lenDiff);i++){
        paddingString+=padding;
    }
    return paddingString+valString;
}

function serializeSceneData(cb,save_outputPort_state = false)
{
    for (let i = 0; i < 10; i++)
    { // main buttons
        // Button's top row text
        cb(printfJS("%04X",i));
        cb(":");
        for (let c = 0; c < 50; c++)
        {
            cb(printfJS("%02X", currentSceneData.mainButtons[i].topRowText[c]));
        }
        // sdCardFile.print('\0');
        cb(';');

        // Button's Array of actions
        cb(printfJS("%04X", 0x0010 | i));
        cb(':');
        for (let u = 0; u < 32; u++)
        {
            // cb(byte(currentSceneData.mainButtons[i].Actions[u].action), HEX); // use either this line or the next. not both.
            cb(printfJS("%02X", currentSceneData.mainButtons[i].Actions[u].action));
            if (parseInt(currentSceneData.mainButtons[i].Actions[u].action) == 255)
                break;
        }
        cb(';');

        // Button Action's array of data
        for (let u = 0; u < 32; u++)
        {
            cb(printfJS("%04X", (i | (u << 4)) | 0x2000));
            cb(":");
            for (let j = 0; j < 16; j++)
            {
                // cb(currentSceneData.mainButtons[i].Actions[u].actionData[j], HEX); // use either this line or the next. not both.
                cb(printfJS("%02X", currentSceneData.mainButtons[i].Actions[u].actionData[j]));
            }
            cb(";");
            if (u < 31)
            {
                if (parseInt(currentSceneData.mainButtons[i].Actions[u + 1].action) == 255)
                    break;
            }
        }
        // Newline
        cb("\n");
    }

    for (let i = 0; i < 4; i++)
    { // output ports
        cb(printfJS("%04X", (i | 0x0030)));
        cb(":");
        cb(printfJS("%02X", currentSceneData.output_ports[i].out_mode));
        cb(";");
        if (save_outputPort_state)
        {
            cb(printfJS("%04X", (i | 0x0040)));
            cb(":");
            cb(printfJS("%02X", currentSceneData.output_ports[i].state));
            cb(";");
        }
        cb("\n");
    }

    for (let i = 0; i < 8; i++)
    { // external buttons
        cb(printfJS("%04X", (i | 0x0050)));
        cb(":");
        cb(printfJS("%02X", currentSceneData.extButtons[i].Btn_Mode));
        cb(";");

        // Ext Button's Array of actions
        cb(printfJS("%04X", (0x0060 | i)));
        cb(':');
        for (let u = 0; u < 32; u++)
        {
            // cb(byte(currentSceneData.extButtons[i].Actions[u].action), HEX); // use either this line or the next. not both.
            cb(printfJS("%02X", currentSceneData.extButtons[i].Actions[u].action));
            if (parseInt(currentSceneData.extButtons[i].Actions[u].action) == 0xff)
                break;
        }
        cb(';');

        // Ext Button Action's array of data
        for (let u = 0; u < 32; u++)
        {
            cb(printfJS("%04X", ((i) | (u << 4)) | 0x4000));
            cb(":");
            for (let j = 0; j < 16; j++)
            {
                cb(printfJS("%02X", currentSceneData.extButtons[i].Actions[u].actionData[j]));
            }
            cb(";");
            if (u < 31)
            {
                if (parseInt(currentSceneData.extButtons[i].Actions[u + 1].action) == 0xff)
                    break;
            }
        }
        cb("\n");
    }
}

function buildStringOfSceneData(){
    let outString = "";
    serializeSceneData((moreString)=>{
        outString+=moreString;
    })
    return outString;
}

function saveDataToController(){
    // turn off some event listeners
    let loadButtonEl = document.getElementById("loadDataFromControllerButton");
    loadButtonEl._onClickHolder = loadButtonEl.onclick;
    loadButtonEl.onclick = null;
    let resetButtonEl = document.getElementById("resetCurrentSceneToDefaults");
    resetButtonEl._onClickHolder = resetButtonEl.onclick;
    resetButtonEl.onclick = null;
    let sceneNumSelEl = document.getElementById("sceneNumberInputField");
    sceneNumSelEl._onChangeHolder = sceneNumSelEl.onchange;
    sceneNumSelEl.onchange = null;


    console.log("lets save some data");
    let sceneSaveUrl = originLocation + "saveScene/";
    let formData = new FormData();
    console.log({currentScene});
    formData.append("data", new Blob([buildStringOfSceneData()], { type: "text/plain" }), currentScene.toString());
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
            console.log(this.readyState);
            console.log(this.status);

            // turn event listeners back on
            loadButtonEl.onclick = loadButtonEl._onClickHolder;
            loadButtonEl._onClickHolder = null;
            
            resetButtonEl.onclick = resetButtonEl._onClickHolder;
            resetButtonEl._onClickHolder = null;
            
            sceneNumSelEl.onchange = sceneNumSelEl._onChangeHolder;
            sceneNumSelEl._onChangeHolder = null;;

        }else{
            console.log(this.responseText);
        }
    };
    xhttp.open("POST", sceneSaveUrl, true);
    xhttp.send(formData);
}

function httpGet(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200)
            callback(this.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function httpPost(theUrl,callback,data){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            callback(this.responseText);
        }
    };
    xhttp.open("POST", theUrl, true);
    xhttp.setRequestHeader("Content-type", "text/plain");
    xhttp.send(data);
}

updateMaxNumberOfScenes();
loadSceneData(0, {
    mainBtn: updateMainButtonActions,
    extPort: updateExtPedalPortActions
}, {
    mainBtn: 0,
    extPort: 0
});


// var scrollPos = window.scrollY || window.scrollTop || document.getElementsByTagName("html")[0].scrollTop;

let lastKnownScrollPosition = 0;
let ticking = false;
document.addEventListener('scroll', function (e) {
    lastKnownScrollPosition = window.scrollY;
    if (!ticking) {
        window.requestAnimationFrame(function () {
            if (lastKnownScrollPosition > 45) {
                document.getElementById("toolTipArea").style.padding = (lastKnownScrollPosition - 45) + "px 5px 5px 5px";
            }
            ticking = false;
        });
        ticking = true;
    }
});

document.getElementById("loadDataFromControllerButton").addEventListener('click', () => {
    updateMaxNumberOfScenes();
    loadSceneData(0, {
        mainBtn: updateMainButtonActions,
        extPort: updateExtPedalPortActions
    }, {
        mainBtn: 0,
        extPort: 0
    });
})

document.getElementById("saveDataToControllerButton").addEventListener('click',()=>{
    saveDataToController();
})

// updateMainButtonActions(0);

// setInterval(() => {
//     console.log({
//         currentScene
//     });
// }, 1000);

// let thingy = (document.getElementById("outputPort1Pol").value == "true");
// console.log("value: " + document.getElementById("outputPort1Mode").value + " type: " + typeof(document.getElementById("outputPort1Mode").value));
// console.log("value: " + thingy + " type: " + typeof(thingy));
