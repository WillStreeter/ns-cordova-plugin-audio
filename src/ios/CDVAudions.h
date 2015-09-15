
#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioServices.h>
#import <AVFoundation/AVFoundation.h>

#import <Cordova/CDVPlugin.h>

enum CDVMediaError {
    MEDIA_ERR_ABORTED = 1,
    MEDIA_ERR_NETWORK = 2,
    MEDIA_ERR_DECODE = 3,
    MEDIA_ERR_NONE_SUPPORTED = 4
};
typedef NSUInteger CDVMediaError;

enum CDVMediaStates {
    MEDIA_NONE = 0,
    MEDIA_STARTING = 1,
    MEDIA_RUNNING = 2,
    MEDIA_PAUSED = 3,
    MEDIA_STOPPED = 4
};
typedef NSUInteger CDVMediaStates;

enum CDVMediaMsg {
    MEDIA_STATE = 1,
    MEDIA_DURATION = 2,
    MEDIA_POSITION = 3,
    MEDIA_ERROR = 9
};
typedef NSUInteger CDVMediaMsg;

@interface CDVAudioPlayer : AVAudioPlayer
{
    NSString* mediaId;
}
@property (nonatomic, copy) NSString* mediaId;
@end

@interface CDVAudioRecorder : AVAudioRecorder
{
    NSString* mediaId;
}
@property (nonatomic, copy) NSString* mediaId;
@end

@interface CDVAudioFile : NSObject
{
    NSString* resourcePath;
    NSURL* resourceURL;
    CDVAudioPlayer* player;
    CDVAudioRecorder* recorder;
    NSNumber* volume;
}

@property (nonatomic, strong) NSString* resourcePath;
@property (nonatomic, strong) NSURL* resourceURL;
@property (nonatomic, strong) CDVAudioPlayer* player;
@property (nonatomic, strong) NSNumber* volume;

@property (nonatomic, strong) CDVAudioRecorder* recorder;

@end

@interface CDVAudions : CDVPlugin <AVAudioPlayerDelegate, AVAudioRecorderDelegate>
{
    NSMutableDictionary* soundCache;
    AVAudioSession* avSession;
}
@property (nonatomic, strong) NSMutableDictionary* soundCache;
@property (nonatomic, strong) AVAudioSession* avSession;

- (void)startPlayingAudio:(CDVInvokedUrlCommand*)command;
- (void)pausePlayingAudio:(CDVInvokedUrlCommand*)command;
- (void)stopPlayingAudio:(CDVInvokedUrlCommand*)command;
- (void)seekToAudio:(CDVInvokedUrlCommand*)command;
- (void)release:(CDVInvokedUrlCommand*)command;
- (void)getCurrentPositionAudio:(CDVInvokedUrlCommand*)command;

- (BOOL)hasAudioSession;

// helper methods
- (NSURL*)urlForRecording:(NSString*)resourcePath;
- (NSURL*)urlForPlaying:(NSString*)resourcePath;

- (CDVAudioFile*)audioFileForResource:(NSString*)resourcePath withId:(NSString*)mediaId doValidation:(BOOL)bValidate forRecording:(BOOL)bRecord;
- (BOOL)prepareToPlay:(CDVAudioFile*)audioFile withId:(NSString*)mediaId;
- (NSString*)createMediaErrorWithCode:(CDVMediaError)code message:(NSString*)message;

- (void)startRecordingAudio:(CDVInvokedUrlCommand*)command;
- (void)stopRecordingAudio:(CDVInvokedUrlCommand*)command;

- (void)setVolume:(CDVInvokedUrlCommand*)command;

@end
