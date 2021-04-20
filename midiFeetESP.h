#ifndef MAX_NUMBER_OF_SCENES
#define MAX_NUMBER_OF_SCENES 1500
#endif
#include <ErriezCRC32.h>

enum SERIAL_ERROR : uint8_t
{
    NONE = 0,
    CRC8_MISMATCH = 0x01,
    TIMEOUT = 0x02,
    NO_BYTES_READ = 0x04,
    CRC32_MISMATCH = 0x08,
    SD_FILE_ERROR = 0x03,
};

enum ESP_SERIAL_COMMANDS_Message
{
    RequestForHashCompare = 0x01,
    RequestForPreferences = 0x02,
    RequestForSceneFile = 0x03,
    RequestForOtherFile = 0x04,
    OkToStartSendingData = 0x05,
    OkToContinueSendingData = 0x06,
    RequestForTotalNumberOfScene = 0x07,
    RequestToSaveSceneFile = 0x08,
    isMessageNotPacket = 0xa0,
};

enum ESP_SERIAL_COMMANDS_Packet
{
    StartSendData = 0x10,
    ContinueSendData = 0x20,
    EndSendData = 0x30,
    FileTransfer = 0x01,
    SaveSceneData = 0x02,
    SavePreferences = 0x03,
};

enum ESP_SERIAL_DataType
{
    FileInfo = 0x01, // filename hash, file size,...
    FileNameHash = 0x02,
    FileSize = 0x03,
    FullFileName = 0x04,
    TotalNumOfScenes = 0x05,
};

template <size_t Index, class T>
struct NamedArrayElement
{
    char trash;

    operator T &() // allows: double d = object.Member;
    {
        return ((T *)(this))[Index/sizeof(T)];
    }

    T &operator=(T const &rhs) // allows: object.member = 1.0;
    {
        T &me = ((T *)(this))[Index/sizeof(T)];

        me = rhs;

        return me;
    }

    T *operator&() // allows: double *p = &object.Member;
    {
        return &((T *)(this))[Index/sizeof(T)];
    }

    bool operator<(T const &rhs) // allows: if(object.Member < 1.0)
    {
        return ((T *)(this))[Index/sizeof(T)] < rhs;
    }

    bool operator>(T const &rhs) // allows: if(object.Member > 1.0)
    {
        return ((T *)(this))[Index/sizeof(T)] > rhs;
    }

    bool operator==(T const &rhs) // allows: if(object.Member == 1.0)
    {
        return ((T *)(this))[Index/sizeof(T)] == rhs;
    }
};

/// \brief fix me
/// \tparam fix me
/// \param data fix me
/// \param size fix me
template <size_t startIndex, class start_T, int arrSize, class arrSize_T>
struct SpecialNamedElement
{
    char trash;

    arrSize_T &operator=(arrSize_T const &rhs) // allows: object.member = 1.0;
    {
        arrSize_T &me = ((start_T *)(this))[startIndex];

        me = rhs;

        return me;
    }

    arrSize_T &operator[](int const ind)
    {
        return ((arrSize_T *)(&((start_T *)(this))[startIndex]))[ind];
    }
};

/// \brief Serial packet object containing 32bit start sequence (startSequence_32), 32bit crc (crc_32), and 16 bytes of data
struct SerialPacket
{
    union
    {
        // byte array of packet.
        // 4 bytes of start sequence (2 bytes) + command (2 bytes), 16 bytes of data, and 4 bytes for crc.
        // DO NOT ACCESS DIRECTLY! Use object[] interface.
        uint8_t full_array[4 + 16 + 4];

        // uint32_t start sequence and command
        // first 2 bytes are start sequence (0x55, 0xaa)
        // last 2 bytes are command
        NamedArrayElement<0, uint32_t> startSequence_32;

        // uint32_t crc32 of start sequence + command + data
        NamedArrayElement<4 + 16, uint32_t> crc_32;

        // 32bit data array. 4 X uint32_t = 16 bytes.
        SpecialNamedElement<4, uint8_t, 4, uint32_t> data_32;

        // 8bit data array. 16 X uint8_t = 16 bytes.
        SpecialNamedElement<4, uint8_t, 16, uint8_t> data;
    };
    uint8_t &operator[](unsigned int i) {
        if(i>sizeof(this->full_array)){return this->full_array[0];}
        return this->full_array[i]; 
    }
    
    /// \brief Serial packet object containing 32bit start sequence (startSequence_32), 32bit crc (crc_32), and 8 bytes of data
    SerialPacket()
    {
        for (uint8_t i = 0; i < sizeof(this->full_array); i++)
            this->full_array[i] = i + 1;
    }

    /// \brief Calculate crc32 for startSequence and data, and store it in crc_32 member
    /// \returns 32bit crc
    uint32_t CalculateCRC()
    {
        this->crc_32 = crc32Buffer(this->full_array,(sizeof(this->full_array) - 4));
        return this->crc_32;
        // CRC32 crc;
        // for (size_t i = 0; i < (sizeof(this->full_array) - 4); i++)
        // {
        //     crc.update(this->full_array[i]);
        // }
        // this->crc_32 = crc.finalize();
        // return this->crc_32;
    }
};

#define SHORT_MESSAGE_DATA_LENGTH 4

///\brief Smaller version of SerialPacket.
/// 1 byte start seq, (SHORT_MESSAGE_DATA_LENGTH) 4 bytes data, 1 byte crc.
struct SerialMessage
{
    union
    {
        uint8_t full_array[1+SHORT_MESSAGE_DATA_LENGTH+1];
        NamedArrayElement<0,uint8_t> StartSequence_8;
        NamedArrayElement<1+SHORT_MESSAGE_DATA_LENGTH,uint8_t> crc_8;
        SpecialNamedElement<1,uint8_t,SHORT_MESSAGE_DATA_LENGTH,uint8_t> data;
        // SpecialNamedElement<1,uint8_t,(SHORT_MESSAGE_DATA_LENGTH/4),uint32_t> data_32;
    };
    uint8_t &operator[](int i){return this->full_array[i];}

    ///\brief Smaller version of SerialPacket.
    /// 1 byte start seq, (SHORT_MESSAGE_DATA_LENGTH) 4 bytes data, 1 byte crc.
    SerialMessage(){
        for(uint8_t i=0;i<(sizeof(this->full_array));i++)
            this->full_array[i]=i;
    }
    uint8_t CalculateCRC(){
        this->crc_8 = uint8_t(crc32Buffer(this->full_array,(sizeof(this->full_array) - 1)));
        return this->crc_8;
        // CRC32 crc;
        // for (size_t i = 0; i < (sizeof(this->full_array) - 1); i++)
        // {
        //     crc.update(this->full_array[i]);
        // }
        // this->crc_8 = uint8_t(crc.finalize());
        // return this->crc_8;
    }
};