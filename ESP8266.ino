/**
 *  Firmware sketch for ESP8266 in Midi foot controller.
 *
 *  Board:          Generic ESP8266
 *  Upload Speed:   115200
 *  Flash size:     4MB (2MB filesystem)
 *  Flash Mode:     QIO fast
 *  All others:     default
 *  
 */

// ignores most of the code
// cSpell:ignoreRegExp /(^(?!\s*(\/\/)|(\/\*)).*[;:)}=,{])/gm

// ignores any word in quotes
// cSpell:ignoreRegExp /\"\S*\"/g

//--- ignores HEX literals
// cSpell:ignoreRegExp /0x[A-Z]+/g

//--- ignores any preprocessor directive (i.e #define)
// cSpell:ignoreRegExp /(^#.*)/gm

/// words to ignore
// cSpell:ignore pico PSRAM btn btns spec'd dbgserPrintln dbgser Println Wifi SSID ssid's

/// spell check extension defaults to checking each part of camel case words as separate words.

/*
TODO:
1. webpage data should be stored in flash with a hash of the data. When booting, check the hash of the data in flash vs the hash of the data on the Teensy's SD card.
if there is a mismatch, stream the data from the teensy's sd to the files in flash.

2. Should check ecternal switch to see if module should boot into AP mode. In this mode, user can input SSID and password. That should be saved to filesystem and
used on normal boot up to connect to Wifi. 



Order of operation safter boot:
1. Startup filesystem
1a. Load md5 files and send them to the Teensy for comparison.
1b. Receive updates files as necessary. 
2. check boot mode button to see if we should boot into AP mode
2a. If AP mode is selected, set global variable to AP mode, setup AP mode.
    once the user sends ssid and password, save it to wifi.txt
2b. If normal mode, scan for available APs and create list of AP's.
    check list of APs vs ssid's in wifi.txt for saved info. connect if found. Set global variable to sta mode. 
    If available AP's has no match in wifi.txt, reset to AP mode and get info from user.
3. Once a connection to an AP is made, enable serving of config GUI files and receiving of config data.
4. When data is received from GUI, send it to Teensy.
4a. If data is received as chunks (i.e. live update) it will be through url encoding.
4b. If data is received all at once, it will arrived as a txt file. 


When in AP mode, GUI should be a page with either a header or footer that allows the user to input SSID and password,
but it should have the main control page embedded as an iframe so the user can control the device without connecting
to an existing wifi network.


*/

#define USE_LITTLEFS

#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <SPI.h>
#include <ErriezCRC32.h>
#include "midiFeetESP.h"

#include <LittleFS.h>
const char *fsName = "LittleFS";
FS *fileSystem = &LittleFS;
LittleFSConfig fileSystemConfig = LittleFSConfig();

#define DBG_OUTPUT_PORT Serial
#define DBG_OUT_EN false

#ifndef STASSID
#define STASSID "esp8266"
#define STAPSK "sx35esppbtwepak7"
//sx35esppbtwepak7
#endif

/// \brief A structured packet of data containing a 2 byte start sequence, a 2 byte command, 32 bytes of data, and a 32bit CRC.
/// \param : access any byte of the packet with ESP_SerPacket[].
SerialPacket ESP_SerPacket = SerialPacket();
/// \brief A structured packet of data containing a 1 byte command, 4 bytes of data, and a 8bit CRC.
SerialMessage ESP_ShortMessage = SerialMessage();


const char *ssid = STASSID;
const char *password = STAPSK;
const char *host = "midifeet";

ESP8266WebServer server(80);

static bool fsOK;
String unsupportedFiles = String();

File uploadFile;

static const char TEXT_PLAIN[] PROGMEM = "text/plain";
static const char FS_INIT_ERROR[] PROGMEM = "FS INIT ERROR";
static const char FILE_NOT_FOUND[] PROGMEM = "FileNotFound";

////////////////////////////////
// Utils to return HTTP codes, and determine content-type

void replyOK()
{
    server.send(200, FPSTR(TEXT_PLAIN), "");
}

void replyOKWithMsg(String msg)
{
    server.send(200, FPSTR(TEXT_PLAIN), msg);
}

void replyNotFound(String msg)
{
    server.send(404, FPSTR(TEXT_PLAIN), msg);
}

void replyBadRequest(String msg)
{
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println(msg);
    }
    server.send(400, FPSTR(TEXT_PLAIN), msg + "\r\n");
}

void replyServerError(String msg)
{
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println(msg);
    }
    server.send(500, FPSTR(TEXT_PLAIN), msg + "\r\n");
}

////////////////////////////////
// Request handlers

/*
   Return the FS type, status and size info
*/
void handleStatus()
{
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println("handleStatus");
    }
    FSInfo fs_info;
    String json;
    json.reserve(128);

    json = "{\"type\":\"";
    json += fsName;
    json += "\", \"isOk\":";
    if (fsOK)
    {
        fileSystem->info(fs_info);
        json += F("\"true\", \"totalBytes\":\"");
        json += fs_info.totalBytes;
        json += F("\", \"usedBytes\":\"");
        json += fs_info.usedBytes;
        json += "\"";
    }
    else
    {
        json += "\"false\"";
    }
    json += F(",\"unsupportedFiles\":\"");
    json += unsupportedFiles;
    json += "\"}";

    server.send(200, "application/json", json);
}

/*
   Return the list of files in the directory specified by the "dir" query string parameter.
   Also demonstrates the use of chunked responses.
*/
void handleFileList()
{
    if (!fsOK)
    {
        return replyServerError(FPSTR(FS_INIT_ERROR));
    }

    if (!server.hasArg("dir"))
    {
        return replyBadRequest(F("DIR ARG MISSING"));
    }

    String path = server.arg("dir");
    if (path != "/" && !fileSystem->exists(path))
    {
        return replyBadRequest("BAD PATH");
    }

    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println(String("handleFileList: ") + path);
    }
    Dir dir = fileSystem->openDir(path);
    path.clear();

    // use HTTP/1.1 Chunked response to avoid building a huge temporary string
    if (!server.chunkedResponseModeStart(200, "text/json"))
    {
        server.send(505, F("text/html"), F("HTTP1.1 required"));
        return;
    }

    // use the same string for every line
    String output;
    output.reserve(64);
    while (dir.next())
    {
        if (output.length())
        {
            // send string from previous iteration
            // as an HTTP chunk
            server.sendContent(output);
            output = ',';
        }
        else
        {
            output = '[';
        }

        output += "{\"type\":\"";
        if (dir.isDirectory())
        {
            output += "dir";
        }
        else
        {
            output += F("file\",\"size\":\"");
            output += dir.fileSize();
        }

        output += F("\",\"name\":\"");
        // Always return names without leading "/"
        if (dir.fileName()[0] == '/')
        {
            output += &(dir.fileName()[1]);
        }
        else
        {
            output += dir.fileName();
        }

        output += "\"}";
    }

    // send last string
    output += "]";
    server.sendContent(output);
    server.chunkedResponseFinalize();
}

/*
   Read the given file from the filesystem and stream it back to the client
*/
bool handleFileRead(String path)
{
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println(String("handleFileRead: ") + path);
    }
    if (!fsOK)
    {
        replyServerError(FPSTR(FS_INIT_ERROR));
        return true;
    }

    if (path.endsWith("/"))
    {
        path += "index.htm";
    }

    String contentType;
    if (server.hasArg("download"))
    {
        contentType = F("application/octet-stream");
    }
    else
    {
        contentType = mime::getContentType(path);
    }

    if (!fileSystem->exists(path))
    {
        // File not found, try gzip version
        path = path + ".gz";
    }
    if (fileSystem->exists(path))
    {
        File file = fileSystem->open(path, "r");
        if (server.streamFile(file, contentType) != file.size())
        {
            if (DBG_OUT_EN)
            {
                DBG_OUTPUT_PORT.println("Sent less data than expected!");
            }
        }
        file.close();
        return true;
    }

    return false;
}

/*
   As some FS (e.g. LittleFS) delete the parent folder when the last child has been removed,
   return the path of the closest parent still existing
*/
String lastExistingParent(String path)
{
    while (!path.isEmpty() && !fileSystem->exists(path))
    {
        if (path.lastIndexOf('/') > 0)
        {
            path = path.substring(0, path.lastIndexOf('/'));
        }
        else
        {
            path = String(); // No slash => the top folder does not exist
        }
    }
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println(String("Last existing parent: ") + path);
    }
    return path;
}

/*
   Handle the creation/rename of a new file
   Operation      | req.responseText
   ---------------+--------------------------------------------------------------
   Create file    | parent of created file
   Create folder  | parent of created folder
   Rename file    | parent of source file
   Move file      | parent of source file, or remaining ancestor
   Rename folder  | parent of source folder
   Move folder    | parent of source folder, or remaining ancestor
*/
void handleFileCreate()
{
    if (!fsOK)
    {
        return replyServerError(FPSTR(FS_INIT_ERROR));
    }

    String path = server.arg("path");
    if (path.isEmpty())
    {
        return replyBadRequest(F("PATH ARG MISSING"));
    }

    if (path == "/")
    {
        return replyBadRequest("BAD PATH");
    }
    if (fileSystem->exists(path))
    {
        return replyBadRequest(F("PATH FILE EXISTS"));
    }

    String src = server.arg("src");
    if (src.isEmpty())
    {
        // No source specified: creation
        if (DBG_OUT_EN)
        {
            DBG_OUTPUT_PORT.println(String("handleFileCreate: ") + path);
        }
        if (path.endsWith("/"))
        {
            // Create a folder
            path.remove(path.length() - 1);
            if (!fileSystem->mkdir(path))
            {
                return replyServerError(F("MKDIR FAILED"));
            }
        }
        else
        {
            // Create a file
            File file = fileSystem->open(path, "w");
            if (file)
            {
                file.write((const char *)0);
                file.close();
            }
            else
            {
                return replyServerError(F("CREATE FAILED"));
            }
        }
        if (path.lastIndexOf('/') > -1)
        {
            path = path.substring(0, path.lastIndexOf('/'));
        }
        replyOKWithMsg(path);
    }
    else
    {
        // Source specified: rename
        if (src == "/")
        {
            return replyBadRequest("BAD SRC");
        }
        if (!fileSystem->exists(src))
        {
            return replyBadRequest(F("SRC FILE NOT FOUND"));
        }

        if (DBG_OUT_EN)
        {
            DBG_OUTPUT_PORT.println(String("handleFileCreate: ") + path + " from " + src);
        }

        if (path.endsWith("/"))
        {
            path.remove(path.length() - 1);
        }
        if (src.endsWith("/"))
        {
            src.remove(src.length() - 1);
        }
        if (!fileSystem->rename(src, path))
        {
            return replyServerError(F("RENAME FAILED"));
        }
        replyOKWithMsg(lastExistingParent(src));
    }
}

/*
   Delete the file or folder designed by the given path.
   If it's a file, delete it.
   If it's a folder, delete all nested contents first then the folder itself

   IMPORTANT NOTE: using recursion is generally not recommended on embedded devices and can lead to crashes (stack overflow errors).
   This use is just for demonstration purpose, and FSBrowser might crash in case of deeply nested filesystems.
   Please don't do this on a production system.
*/
void deleteRecursive(String path)
{
    File file = fileSystem->open(path, "r");
    bool isDir = file.isDirectory();
    file.close();

    // If it's a plain file, delete it
    if (!isDir)
    {
        fileSystem->remove(path);
        return;
    }

    // Otherwise delete its contents first
    Dir dir = fileSystem->openDir(path);

    while (dir.next())
    {
        deleteRecursive(path + '/' + dir.fileName());
    }

    // Then delete the folder itself
    fileSystem->rmdir(path);
}

/*
   Handle a file deletion request
   Operation      | req.responseText
   ---------------+--------------------------------------------------------------
   Delete file    | parent of deleted file, or remaining ancestor
   Delete folder  | parent of deleted folder, or remaining ancestor
*/
void handleFileDelete()
{
    if (!fsOK)
    {
        return replyServerError(FPSTR(FS_INIT_ERROR));
    }

    String path = server.arg(0);
    if (path.isEmpty() || path == "/")
    {
        return replyBadRequest("BAD PATH");
    }

    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println(String("handleFileDelete: ") + path);
    }
    if (!fileSystem->exists(path))
    {
        return replyNotFound(FPSTR(FILE_NOT_FOUND));
    }
    deleteRecursive(path);

    replyOKWithMsg(lastExistingParent(path));
}

/*
   Handle a file upload request
*/
void handleFileUpload()
{
    if (!fsOK)
    {
        return replyServerError(FPSTR(FS_INIT_ERROR));
    }
    if (server.uri() != "/edit")
    {
        return;
    }
    HTTPUpload &upload = server.upload();
    if (upload.status == UPLOAD_FILE_START)
    {
        String filename = upload.filename;
        // Make sure paths always start with "/"
        if (!filename.startsWith("/"))
        {
            filename = "/" + filename;
        }
        if (DBG_OUT_EN)
        {
            DBG_OUTPUT_PORT.println(String("handleFileUpload Name: ") + filename);
        }
        uploadFile = fileSystem->open(filename, "w");
        if (!uploadFile)
        {
            return replyServerError(F("CREATE FAILED"));
        }
        if (DBG_OUT_EN)
        {
            DBG_OUTPUT_PORT.println(String("Upload: START, filename: ") + filename);
        }
    }
    else if (upload.status == UPLOAD_FILE_WRITE)
    {
        if (uploadFile)
        {
            size_t bytesWritten = uploadFile.write(upload.buf, upload.currentSize);
            if (bytesWritten != upload.currentSize)
            {
                return replyServerError(F("WRITE FAILED"));
            }
        }
        if (DBG_OUT_EN)
        {
            DBG_OUTPUT_PORT.println(String("Upload: WRITE, Bytes: ") + upload.currentSize);
        }
    }
    else if (upload.status == UPLOAD_FILE_END)
    {
        if (uploadFile)
        {
            uploadFile.close();
        }
        if (DBG_OUT_EN)
        {
            DBG_OUTPUT_PORT.println(String("Upload: END, Size: ") + upload.totalSize);
        }
    }
}

void handleSceneSave()
{
    server.setChunkedMode(false);
    int incomingSceneNum = 0;
    server.setContentLength(CONTENT_LENGTH_NOT_SET);
    // return replyServerError(F("no"));
    if (!fsOK)
    {
        // server.send(200,FPSTR(TEXT_PLAIN),"FS problem.\n");
        // server.setContentLength(CONTENT_LENGTH_NOT_SET);
        return replyServerError("FS INIT ERROR");
        // return replyServerError(FPSTR(FS_INIT_ERROR));
    }
    
    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    // This line causes handSceneSave() to be called for each chunk of data uploaded. 
    // Take care that everything in function can handle being called multiple times. 
    // i.e. don't call uploadFile.close() unless it's when the upload is complete.
    HTTPUpload& upload = server.upload();
    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX


    incomingSceneNum = upload.filename.toInt();
    // String filename = "/tmpScn.txt";
    // uploadFile = fileSystem->open(filename, "w+");
    if (upload.status == UPLOAD_FILE_START)
    {
        
        // Make sure paths always start with "/"
        // return replyServerError("no" + String(incomingSceneNum));
        // return replyServerError("SceneNum: " + String(incomingSceneNum) + " fileName: " + filename);
        // if (!filename.startsWith("/"))
        // {
        //     filename = "/" + filename;
        // }
        
        String filename = "/tmpScn.txt";
        uploadFile = fileSystem->open(filename, "w+");
        
        if (!uploadFile)
        {
            return replyServerError("CREATE FAILED");
        }else{
            // return replyServerError("File created / opened.");
        }

    }
    else if (upload.status == UPLOAD_FILE_WRITE)
    {
        if (uploadFile)
        {
            // return replyServerError("File Write");
            size_t bytesWritten = uploadFile.write(upload.buf, upload.currentSize);
            if (bytesWritten != upload.currentSize)
            {
                return replyServerError("WRITE FAILED");
            }
        }else{
            return replyServerError("FILE ERROR1");
        }
    }
    else if (upload.status == UPLOAD_FILE_END)
    {
        if (uploadFile)
        {
            uploadFile.close();
            int errorVal = sendTempScnToTeensy(incomingSceneNum);
            // int errorVal = 255;
            String response = "file closed. SceneNumber:" + String(incomingSceneNum) + "\nError (success if 0): " + String(errorVal);
            // server.setContentLength(CONTENT_LENGTH_NOT_SET);
            // server.setContentLength(response.length());
            // return replyOKWithMsg(response);
            server.send(200, "text/plain", response);
            // server.send(200,"text/html","");
            
        }else{
            return replyServerError("FILE ERROR2");
        }

    }else{
        return replyServerError("ERRROR!!!");
    }
}

int sendTempScnToTeensy(int sceneNum){
    uint8_t dataToSendArr[16];
    dataToSendArr[0]=sceneNum&0xff;
    dataToSendArr[1]=sceneNum>>8;
    dataToSendArr[2]=sceneNum>>16;
    dataToSendArr[3]=sceneNum>>24;
    uint8_t command = 0;
    int err = 0;
    uint32_t byteNumber = 0;
    sendDataToTeensy(ESP_SERIAL_COMMANDS_Message::RequestToSaveSceneFile|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket,dataToSendArr,4,false);
    uint8_t pSizeAndErr[] = {255,255};
    getTeensySerialData(pSizeAndErr);
    if(pSizeAndErr[0]==6){
        command = ESP_ShortMessage.StartSequence_8 & 0x0f;
        if((command!=ESP_SERIAL_COMMANDS_Message::OkToStartSendingData) || (pSizeAndErr[1]>0)){
            err+=8;
            return err;
        }
    }else if(pSizeAndErr[0]==24){
        command = ESP_SerPacket.startSequence_32 & 0xf0;
        err=ESP_SerPacket.startSequence_32 & 0xff;;
        return err;
    }else{
        err=128;
        return err;
    }
    
    File uploadingFile = fileSystem->open("/tmpScn.txt","r");

    if(!uploadingFile){
        err=99;
        return err;
    }

    while(uploadingFile.available()){
        uint8_t readByte;
        bool isLast = false;
        for(uint8_t i=0;i<16;i++){
            if(uploadingFile.available()){
                readByte=uploadingFile.read();
                dataToSendArr[i]=readByte;
                byteNumber++;
            }else{
                dataToSendArr[i]=0;
                isLast=true;
            }
        }
        if(!isLast){
            sendDataToTeensy((byteNumber==16?ESP_SERIAL_COMMANDS_Packet::StartSendData:ESP_SERIAL_COMMANDS_Packet::ContinueSendData)|ESP_SERIAL_COMMANDS_Packet::SaveSceneData,dataToSendArr,16,true);
            getTeensySerialData(pSizeAndErr);
            if(pSizeAndErr[1]>0){
                err+=16 + (pSizeAndErr[1] + 100);
                break;
            }
            if((ESP_ShortMessage.StartSequence_8&0x0f)!=ESP_SERIAL_COMMANDS_Message::OkToContinueSendingData){
                err+=8;
                break;
            }
        }else{
            sendDataToTeensy(ESP_SERIAL_COMMANDS_Packet::EndSendData|ESP_SERIAL_COMMANDS_Packet::SaveSceneData,dataToSendArr,16,true);
        }
    }
    uploadingFile.close();
    return err;
}

/*
   The "Not Found" handler catches all URI not explicitely declared in code
   First try to find and return the requested file from the filesystem,
   and if it fails, return a 404 page with debug information
*/
void handleNotFound()
{
    if (!fsOK)
    {
        return replyServerError(FPSTR(FS_INIT_ERROR));
    }

    String uri = ESP8266WebServer::urlDecode(server.uri()); // required to read paths with blanks

    if (handleFileRead(uri))
    {
        return;
    }

    // Dump debug data
    String message;
    message.reserve(100);
    message = F("Error: File not found\n\nURI: ");
    message += uri;
    message += F("\nMethod: ");
    message += (server.method() == HTTP_GET) ? "GET" : "POST";
    message += F("\nArguments: ");
    message += server.args();
    message += '\n';
    for (uint8_t i = 0; i < server.args(); i++)
    {
        message += F(" NAME:");
        message += server.argName(i);
        message += F("\n VALUE:");
        message += server.arg(i);
        message += '\n';
    }
    message += "path=";
    message += server.arg("path");
    message += '\n';
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.print(message);
    }

    return replyNotFound(message);
}

/*
   This specific handler returns the index.htm (or a g-zipped version) from the /edit folder.
   If the file is not present but the flag INCLUDE_FALLBACK_INDEX_HTM has been set, falls back to the version
   embedded in the program code.
   Otherwise, fails with a 404 page with debug information
*/
void handleGetEdit()
{
    if (handleFileRead(F("/edit/index.htm")))
    {
        return;
    }

    replyNotFound(FPSTR(FILE_NOT_FOUND));
}

bool handleSceneRequest()
{
    // int numberOfArgs = server.args();
    String argOne = server.arg(0);
    String argOneName = server.argName(0);
    streamSceneFromTeensyToServer(argOne.toInt());
    return false;
}

void streamSceneFromTeensyToServer(int num){ // Request a scene from the teensy and stream the data to the server.
    server.chunkedResponseModeStart(200,"text/html");
    unsigned long size = 0;
    uint8_t err=0;
    uint8_t msg[4];
    uint16_t sceneNumberReq = num;
    msg[0] = sceneNumberReq & 0xff;
    msg[1] = (sceneNumberReq>>8) & 0xff;
    msg[2] = 0x55;
    msg[3] = 0x55;
    uint8_t command = 0xa0|ESP_SERIAL_COMMANDS_Message::RequestForSceneFile;
    // server.sendContent("command: " + String(command,HEX) +"\n");
    // server.sendContent("msg: " + String(msg[0],HEX)+String(msg[1],HEX)+String(msg[2],HEX)+String(msg[3],HEX) +"\n");
    sendDataToTeensy(command,msg,4,false);
    size_t count = 0;
    // while((Serial.available()==0)&&(count<2500)){
    //     count++;
    //     delay(1);
    // }
    if(count!=0){
        err++;
        // server.sendContent("Timeout while waiting for data.\n");
        // server.sendContent("err: " + String(err,HEX) + "\n");
    }
    else{
        uint8_t pSizeAndErr[] = {255,255};
        getTeensySerialData(pSizeAndErr);
        command = ESP_ShortMessage.StartSequence_8 & 0x0f;
        if(command!=ESP_SERIAL_DataType::FileSize || pSizeAndErr[1]>0){
            err+=8;
            // server.sendContent("Error in getting data.\n");
            // server.sendContent("pSizeAndErr[1]: " + String(pSizeAndErr[1],HEX) + "\n");
            return;
        }
        size += ESP_ShortMessage.data[0] << 0;
        size += ESP_ShortMessage.data[1] << 8;
        size += ESP_ShortMessage.data[2] << 16;
        size += ESP_ShortMessage.data[3] << 24;
        command = ESP_SERIAL_COMMANDS_Message::OkToStartSendingData|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket;
        sendDataToTeensy(command,msg,4,false);
        count = 0;
        // while((Serial.available()==0)&&(count<2500)){
        //     count++;
        //     delay(1);
        // }
        if(count!=0){
            err++;
            // server.sendContent("Timeout2 while waiting for data.\n");
            // server.sendContent("err: " + String(err,HEX) + "\n");
        }
        else{
            getTeensySerialData(pSizeAndErr);
            // uint16_t newCommand = ESP_SerPacket.startSequence_32&0xffff;
            bool isFullPacket = pSizeAndErr[0]==24;
            bool noErrors = pSizeAndErr[1]==0;
            uint8_t startSend = (ESP_SERIAL_COMMANDS_Packet::StartSendData|ESP_SERIAL_COMMANDS_Packet::SaveSceneData);
            uint8_t continueSend = (ESP_SERIAL_COMMANDS_Packet::ContinueSendData|ESP_SERIAL_COMMANDS_Packet::SaveSceneData);
            bool maskedCommandIsContSend = true;
            if(ESP_SerPacket[2]==startSend){
                // server.sendContent("rec'd start send command.\n");
                char anArray[16];
                for(uint8_t i=0;i<16;i++){
                    anArray[i] = ESP_SerPacket.data[i];
                }
                server.sendContent(anArray,16);
                while(isFullPacket && noErrors && maskedCommandIsContSend){
                    // server.sendContent("while Loop1.\n");
                    sendDataToTeensy((ESP_SERIAL_COMMANDS_Message::OkToContinueSendingData|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket),msg,4,false);
                    count = 0;
                    // while((Serial.available()==0)&&(count<2500)){
                    //     count++;
                    //     delay(1);
                    // }
                    if(count!=0){
                        err++;
                        // server.sendContent("Timeout1 while waiting for data.\n");
                        // server.sendContent("err: " + String(err,HEX) + "\n");
                    }
                    getTeensySerialData(pSizeAndErr);
                    // newCommand = ESP_SerPacket.startSequence_32&0xffff;
                    isFullPacket = (pSizeAndErr[0]==24);
                    noErrors = (pSizeAndErr[1]==0);
                    maskedCommandIsContSend = (ESP_SerPacket[2] == continueSend);
                    if(maskedCommandIsContSend){
                        // anArray[16];
                        for(uint8_t i=0;i<16;i++){
                            anArray[i] = ESP_SerPacket.data[i];
                        }
                        server.sendContent(anArray,16);
                    }else if(ESP_SerPacket[2]==(ESP_SERIAL_COMMANDS_Packet::EndSendData|ESP_SERIAL_COMMANDS_Packet::SaveSceneData)){
                        // anArray[16];
                        if(ESP_SerPacket.data[0]!=0){ // only send if there is data to send.
                            size_t counter = 0;
                            while(ESP_SerPacket.data[counter]!=0){
                                anArray[counter]=ESP_SerPacket.data[counter];
                                counter++;
                            }
                            char smallArr[counter];
                            for(uint8_t i=0;i<counter;i++){
                                smallArr[i]=anArray[i];
                            }
                            server.sendContent(smallArr,counter);
                        }
                    }else err+=32;
                }
            }
        }
    }
    server.chunkedResponseFinalize();
    server.sendContent(String());
}

void getTeensySerialData(uint8_t retVal[]){
    // server.sendContent("getTeensySerialData()\n");
    uint8_t err = SERIAL_ERROR::NONE;
    uint8_t first6[6];
    uint8_t theRest[18];
    uint8_t packetSize = 0;
    // uint8_t inByte = ESP8266_Serial.read();
    Serial.setTimeout(2000);
    if (Serial.readBytes(first6, 6) == 0){
        err = SERIAL_ERROR::TIMEOUT;
        // server.sendContent("timeout on reading first 6 bytes.\n");
        retVal[1]=err;
        retVal[0]=0;
        return;
    }
    // break;
    if (((first6[0]&0xf0) == 0xa0) && (err == SERIAL_ERROR::NONE))
    {
        // short message
        packetSize = 6;

        // copy data into ESP_ShortMessage object
        // server.sendContent("received data from teensy (HEX): ");
        for (uint8_t i = 0; i < 5; i++){
            ESP_ShortMessage[i] = first6[i];
            // server.sendContent(String(first6[i],HEX) + (i==4?":":"\n"));
        }

        // save the crc that was sent
        uint8_t sentCRC = first6[5];
        uint8_t calcCRC = ESP_ShortMessage.CalculateCRC();

        // compare the crc that was sent with a calculated crc
        if (sentCRC != calcCRC){
            err = SERIAL_ERROR::CRC8_MISMATCH;
            // server.sendContent("crc mismatch\n");
        }
    }
    else if (err == SERIAL_ERROR::NONE)
    {
        // full packet
        packetSize = 24;

        // get the rest of the packet..
        if (Serial.readBytes(theRest, 18) == 0){
            err = SERIAL_ERROR::TIMEOUT;
            // server.sendContent("timeout on reading next 18 bytes.");
        }
        // break;
        // copy the packet into the ESP_SerPacket object
        // server.sendContent("received data from teensy (HEX): ");
        uint8_t i = 0;
        for (; i < 6; i++){
            ESP_SerPacket[i] = first6[i];
            // server.sendContent(String(first6[i],HEX) + ":");
        }
        for (; i < 24; i++){
            ESP_SerPacket[i] = theRest[i - 6];
            // server.sendContent(String(theRest[i-6],HEX) + ":");
        }

        // save the sent crc32
        uint32_t sentCRC = ESP_SerPacket.crc_32;

        // compare the sent CRC32 with a calculated CRC32
        if (sentCRC != ESP_SerPacket.CalculateCRC())
            err = SERIAL_ERROR::CRC32_MISMATCH;
    }
    retVal[0] = packetSize;
    retVal[1] = err;
    // server.sendContent("end of receive data from teensy. packetSize (DEC): " + String(packetSize) + " ; err (DEC): " +String(err) + "\n");
}

bool sendDataToTeensy(uint16_t command, uint8_t dataArr[], uint8_t len, bool isFullPacket)
{
    // server.sendContent("\nSEnding Data to teensy. command (HEX): " + String(command,HEX) + " ; len (DEC): " + String(len) + "\n");
    for(int i = 0; i < len; i ++){
        // server.sendContent("  dataArr[" + String(i) + "] (HEX): " + String(dataArr[i],HEX) + "\n");
    }
    if (len > (isFullPacket ? 16 : 4))
        return false;
    uint8_t fullSizeDataArray[16];
    int i = 0;
    for (; i < len; i++){
        fullSizeDataArray[i] = dataArr[i];
        // server.sendContent("  fullSizeDataArray[" + String(i) + "] (HEX): " + String(fullSizeDataArray[i],HEX) + "\n");
    }
    for (; i < 16; i++){
        fullSizeDataArray[i] = 0;
        // server.sendContent("  fullSizeDataArray[" + String(i) + "] (HEX): " + String(fullSizeDataArray[i],HEX) + "\n");
    }
    if (isFullPacket)
    {
        // if (Serial.availableForWrite() < 24)
        //     return false; // return false if hardware buffer cant hold the entire packet.
        ESP_SerPacket.startSequence_32 = 0xaa550000 | command;
        for (int i = 0; i < 16; i++)
            {ESP_SerPacket.data[i] = fullSizeDataArray[i];}
        ESP_SerPacket.CalculateCRC();
        for (int i = 0; i < 24; i++){
            Serial.write(ESP_SerPacket[i]);
            // server.sendContent("wrote data to Serial (HEX): " + String(ESP_SerPacket[i],HEX) + "\n");
        }
    }
    else
    {
        // if (Serial.availableForWrite() < 6)
        //     return false; // return false if hardware buffer cant hold the entire packet.
        ESP_ShortMessage.StartSequence_8 = uint8_t(command & 0x00ff);
        for (int i = 1; i < 5; i++){
            ESP_ShortMessage[i] = fullSizeDataArray[i-1];
            // server.sendContent("  ESP_ShortMessage[" + String(i) + "] (HEX): " + String(ESP_ShortMessage[i],HEX) + "\n");
        }
        ESP_ShortMessage.CalculateCRC();
        for (int i = 0; i < 6; i++){
            Serial.write(ESP_ShortMessage[i]);
            // server.sendContent("wrote data to Serial (HEX): " + String(ESP_ShortMessage[i],HEX) + "\n");
        }
        // Serial.write(ESP_ShortMessage,6);
    }
    // server.sendContent("\n\n");
    return true;
}

bool sendDataToTeensy(uint16_t command){
    uint8_t anArr[] = {0};
    return sendDataToTeensy(command,anArr,0,false);
}
void handleNumberOfScenesRequest(){
    sendDataToTeensy(ESP_SERIAL_COMMANDS_Message::RequestForTotalNumberOfScene|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket);
    uint8_t err=0;
    // uint16_t count = 0;
    uint32_t response = 0;
    uint8_t pSizeAndErr[] = {255,255};
    getTeensySerialData(pSizeAndErr);
    if((ESP_ShortMessage[0]!=(ESP_SERIAL_DataType::TotalNumOfScenes|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket)) || (pSizeAndErr[1]>0)){
        err=pSizeAndErr[1];
    }else{
        response += ESP_ShortMessage.data[0] << 0;
        response += ESP_ShortMessage.data[1] << 8;
        response += ESP_ShortMessage.data[2] << 16;
        response += ESP_ShortMessage.data[3] << 24;
    }
    server.chunkedResponseModeStart(200,"text/html");
    if(err==0){
        server.sendContent(String(response,DEC));
    }else{
        server.sendContent("error: " + String(err,DEC)+"\n");
        for(int i=0;i<6;i++){
            server.sendContent("ESP_ShortMessage [" + String(i) + "] (HEX): " + String(ESP_ShortMessage[i],HEX) + "\n");
        }
        server.sendContent(String(pSizeAndErr[0]) + " : " + String(pSizeAndErr[1]) + "\n");
    }
    server.chunkedResponseFinalize();
    // replyOK();
    replyOKWithMsg("Error:" + String(err));
}


void handlePrefsSave(){
    server.setChunkedMode(false);
    server.setContentLength(CONTENT_LENGTH_NOT_SET);
    if(!fsOK){
        return replyServerError("FS INIT ERROR");
    }

    HTTPUpload& upload = server.upload();

    if(upload.status == UPLOAD_FILE_START){
        String fileName = "/tmpPref.txt";
        uploadFile = fileSystem->open(fileName, "w+");
        if(!uploadFile){
            return replyServerError("Create temp prefs file failed");
        }else{

        }

    }else if(upload.status == UPLOAD_FILE_WRITE){
        if(uploadFile){
            size_t bytesWritten = uploadFile.write(upload.buf, upload.currentSize);
            if(bytesWritten != upload.currentSize){
                return replyServerError("Write Failed");
            }
        }else{
            return replyServerError("File error");
        }
    }else if(upload.status == UPLOAD_FILE_END){
        if(uploadFile){
            uploadFile.close();
            int erroVal = sendTempPrefsToTeensy();
            String response = "file uploaded, written, and closed. Sent to Teensy with " + String(erroVal) + " errors.";
            server.send(200, "text/html", response);
        }else{
            return replyServerError("File error");
        }
    }else{
        return replyServerError("Error!!");
    }
}

int sendTempPrefsToTeensy(){
    uint8_t dataToSendArr[16];
    dataToSendArr[0]=0;
    dataToSendArr[1]=0;
    dataToSendArr[2]=0;
    dataToSendArr[3]=0;
    uint8_t command = 0;
    int err = 0;
    uint32_t byteNumber = 0;
    sendDataToTeensy(ESP_SERIAL_COMMANDS_Message::RequestToSavePrefsFile|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket,dataToSendArr,4,false);
    uint8_t pSizeAndErr[] = {255,255};
    getTeensySerialData(pSizeAndErr);
    if(pSizeAndErr[0]==6){
        command = ESP_ShortMessage.StartSequence_8 & 0x0f;
        if((command!=ESP_SERIAL_COMMANDS_Message::OkToStartSendingData) || (pSizeAndErr[1]>0)){
            err+=8;
            return err;
        }
    }else if(pSizeAndErr[0]==24){
        command = ESP_SerPacket.startSequence_32 & 0xf0;
        err=ESP_SerPacket.startSequence_32 & 0xff;;
        return err;
    }else{
        err=128;
        return err;
    }
    
    File uploadingFile = fileSystem->open("/tmpPref.txt","r");

    if(!uploadingFile){
        err=99;
        return err;
    }

    while(uploadingFile.available()){
        uint8_t readByte;
        bool isLast = false;
        for(uint8_t i=0;i<16;i++){
            if(uploadingFile.available()){
                readByte=uploadingFile.read();
                dataToSendArr[i]=readByte;
                byteNumber++;
            }else{
                dataToSendArr[i]=0;
                isLast=true;
            }
        }
        if(!isLast){
            sendDataToTeensy((byteNumber==16?ESP_SERIAL_COMMANDS_Packet::StartSendData:ESP_SERIAL_COMMANDS_Packet::ContinueSendData)|ESP_SERIAL_COMMANDS_Packet::SavePreferences,dataToSendArr,16,true);
            getTeensySerialData(pSizeAndErr);
            if(pSizeAndErr[1]>0){
                err+=16 + (pSizeAndErr[1] + 100);
                break;
            }
            if((ESP_ShortMessage.StartSequence_8&0x0f)!=ESP_SERIAL_COMMANDS_Message::OkToContinueSendingData){
                err+=8;
                break;
            }
        }else{
            sendDataToTeensy(ESP_SERIAL_COMMANDS_Packet::EndSendData|ESP_SERIAL_COMMANDS_Packet::SavePreferences,dataToSendArr,16,true);
        }
    }
    uploadingFile.close();
    return err;
}

void handlePrefsRequest(){   
    // int numberOfArgs = server.args();
    // String argOne = server.arg(0);
    // String argOneName = server.argName(0);
    // streamSceneFromTeensyToServer(argOne.toInt());
    // return false;
    server.chunkedResponseModeStart(200,"text/html");
    unsigned long size = 0;
    uint8_t err=0;
    uint8_t msg[4];
    // uint16_t sceneNumberReq = num;
    // msg[0] = sceneNumberReq & 0xff;
    // msg[1] = (sceneNumberReq>>8) & 0xff;
    // msg[2] = 0x55;
    // msg[3] = 0x55;
    uint8_t command = 0x00;
    // server.sendContent("command: " + String(command,HEX) +"\n");
    // server.sendContent("msg: " + String(msg[0],HEX)+String(msg[1],HEX)+String(msg[2],HEX)+String(msg[3],HEX) +"\n");
    sendDataToTeensy(ESP_SERIAL_COMMANDS_Message::RequestForPreferences|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket);
    // server.sendContent("sent request to teensy\n");
    size_t count = 0;
    // while((Serial.available()==0)&&(count<2500)){
    //     count++;
    //     delay(1);
    // }
    if(count!=0){
        err++;
        // server.sendContent("Timeout while waiting for data.\n");
        // server.sendContent("err: " + String(err,HEX) + "\n");
    }
    else{
        uint8_t pSizeAndErr[] = {255,255};
        // server.sendContent("read from teensy (1)\n");
        getTeensySerialData(pSizeAndErr);
        // server.sendContent("read from teensy (1) complete\n");
        command = ESP_ShortMessage.StartSequence_8 & 0x0f;
        if(command!=ESP_SERIAL_DataType::FileSize || pSizeAndErr[1]>0){
            err+=8;
            // server.sendContent("Error in getting data.\n");
            // server.sendContent("pSizeAndErr[1]: " + String(pSizeAndErr[1],HEX) + "\n");
            return;
        }
        size += ESP_ShortMessage.data[0] << 0;
        size += ESP_ShortMessage.data[1] << 8;
        size += ESP_ShortMessage.data[2] << 16;
        size += ESP_ShortMessage.data[3] << 24;
        command = ESP_SERIAL_COMMANDS_Message::OkToStartSendingData|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket;
        sendDataToTeensy(command,msg,4,false);
        count = 0;
        // while((Serial.available()==0)&&(count<2500)){
        //     count++;
        //     delay(1);
        // }
        if(count!=0){
            err++;
            // server.sendContent("Timeout2 while waiting for data.\n");
            // server.sendContent("err: " + String(err,HEX) + "\n");
        }
        else{
            getTeensySerialData(pSizeAndErr);
            // uint16_t newCommand = ESP_SerPacket.startSequence_32&0xffff;
            bool isFullPacket = pSizeAndErr[0]==24;
            bool noErrors = pSizeAndErr[1]==0;
            uint8_t startSend = (ESP_SERIAL_COMMANDS_Packet::StartSendData|ESP_SERIAL_COMMANDS_Packet::SavePreferences);
            uint8_t continueSend = (ESP_SERIAL_COMMANDS_Packet::ContinueSendData|ESP_SERIAL_COMMANDS_Packet::SavePreferences);
            bool maskedCommandIsContSend = true;
            if(ESP_SerPacket[2]==startSend){
                // server.sendContent("rec'd start send command.\n");
                char anArray[16];
                for(uint8_t i=0;i<16;i++){
                    anArray[i] = ESP_SerPacket.data[i];
                }
                server.sendContent(anArray,16);
                while(isFullPacket && noErrors && maskedCommandIsContSend){
                    // server.sendContent("while Loop1.\n");
                    sendDataToTeensy((ESP_SERIAL_COMMANDS_Message::OkToContinueSendingData|ESP_SERIAL_COMMANDS_Message::isMessageNotPacket),msg,4,false);
                    count = 0;
                    // while((Serial.available()==0)&&(count<2500)){
                    //     count++;
                    //     delay(1);
                    // }
                    if(count!=0){
                        err++;
                        // server.sendContent("Timeout1 while waiting for data.\n");
                        // server.sendContent("err: " + String(err,HEX) + "\n");
                    }
                    getTeensySerialData(pSizeAndErr);
                    // newCommand = ESP_SerPacket.startSequence_32&0xffff;
                    isFullPacket = (pSizeAndErr[0]==24);
                    noErrors = (pSizeAndErr[1]==0);
                    maskedCommandIsContSend = (ESP_SerPacket[2] == continueSend);
                    if(maskedCommandIsContSend){
                        // anArray[16];
                        for(uint8_t i=0;i<16;i++){
                            anArray[i] = ESP_SerPacket.data[i];
                        }
                        server.sendContent(anArray,16);
                    }else if(ESP_SerPacket[2]==(ESP_SERIAL_COMMANDS_Packet::EndSendData|ESP_SERIAL_COMMANDS_Packet::SavePreferences)){
                        // anArray[16];
                        if(ESP_SerPacket.data[0]!=0){ // only send if there is data to send.
                            size_t counter = 0;
                            while(ESP_SerPacket.data[counter]!=0){
                                anArray[counter]=ESP_SerPacket.data[counter];
                                counter++;
                            }
                            char smallArr[counter];
                            for(uint8_t i=0;i<counter;i++){
                                smallArr[i]=anArray[i];
                            }
                            server.sendContent(smallArr,counter);
                        }
                    }else err+=32;
                }
            }
        }
    }
    server.chunkedResponseFinalize();
    server.sendContent(String());

}

bool connectedToTeensy = false;
bool hashFilesSent = false;
void setup(void)
{
    ////////////////////////////////
    // SERIAL INIT
    if (DBG_OUT_EN){
        DBG_OUTPUT_PORT.begin(115200);
        DBG_OUTPUT_PORT.setDebugOutput(true);
        DBG_OUTPUT_PORT.print('\n');
    }else{
        Serial.begin(1500000);
        Serial.setDebugOutput(false);
    }

    ////////////////////////////////
    // FILESYSTEM INIT
    fileSystemConfig.setAutoFormat(false);
    fileSystem->setConfig(fileSystemConfig);
    fsOK = fileSystem->begin();
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println(fsOK ? F("Filesystem initialized.") : F("Filesystem init failed!"));
    }

    

    ////////////////////////////////
    // WI-FI INIT
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.printf("Connecting to ");
        DBG_OUTPUT_PORT.printf(ssid);
    }

    // @TODO need to check button to see if user wants to boot into AP mode.
    // otherwise, read wifi AP name and password from file to connect to. If connection
    // fails, read the next AP name and password. If all get read, go to AP mode.

    // In AP mode, we'll present to user with a webpage that lists all availble AP's 
    // and let the user choose one. Then save that AP's info to the wifi.txt file.
    if (fsOK)
    {
        String path = "/wifi.txt";
        if (fileSystem->exists(path))
        {
            File passFile = fileSystem->open(path, "r");
            while (passFile.available())
            {
                passFile.read();
            }
        }
    }
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    // Wait for connection
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        if (DBG_OUT_EN)
        {
            DBG_OUTPUT_PORT.print(".");
        }
    }
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println("");
        DBG_OUTPUT_PORT.print(F("Connected! IP address: "));
        DBG_OUTPUT_PORT.println(WiFi.localIP());
    }

    ////////////////////////////////
    // MDNS INIT
    if (MDNS.begin(host))
    {
        MDNS.addService("http", "tcp", 80);
    }

    ////////////////////////////////
    // WEB SERVER INIT

    // Filesystem status
    server.on("/status", HTTP_GET, handleStatus);

    // List directory
    server.on("/list", HTTP_GET, handleFileList);

    // Load editor
    server.on("/edit", HTTP_GET, handleGetEdit);

    // Create file
    server.on("/edit", HTTP_PUT, handleFileCreate);

    // Delete file
    server.on("/edit", HTTP_DELETE, handleFileDelete);

    // Upload file
    // - first callback is called after the request has ended with all parsed arguments
    // - second callback handles file upload at that location
    server.on("/edit", HTTP_POST, replyOK, handleFileUpload);

    server.on("/saveScene/", HTTP_POST, replyOK, handleSceneSave);

    server.on("/loadScene", HTTP_GET, handleSceneRequest);

    server.on("/numScenes", HTTP_GET, handleNumberOfScenesRequest);

    server.on("/prefs", HTTP_GET, handlePrefsRequest);

    server.on("/savePrefs/", HTTP_POST, replyOK, handlePrefsSave);

    // Default handler for all URIs not defined above
    // Use it to read files from filesystem
    server.onNotFound(handleNotFound);

    // Start server
    server.begin();
    if (DBG_OUT_EN)
    {
        DBG_OUTPUT_PORT.println("HTTP server started");
    }
}

void loop(void)
{
    server.handleClient();
    MDNS.update();
}