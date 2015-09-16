/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

var mediaObjects = {};

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback()
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 */
var NocSonicMedia = function(src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('sFFF', 'NocSonicMedia', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;
    exec(null, this.errorCallback, "NocSonicMedia", "create", [this.id, this.src]);
};

// NocSonicMedia messages
NocSonicMedia.MEDIA_STATE = 1;
NocSonicMedia.MEDIA_DURATION = 2;
NocSonicMedia.MEDIA_POSITION = 3;
NocSonicMedia.MEDIA_ERROR = 9;

// NocSonicMedia states
NocSonicMedia.MEDIA_NONE = 0;
NocSonicMedia.MEDIA_STARTING = 1;
NocSonicMedia.MEDIA_RUNNING = 2;
NocSonicMedia.MEDIA_PAUSED = 3;
NocSonicMedia.MEDIA_STOPPED = 4;
NocSonicMedia.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped"];

// "static" function to return existing objs.
NocSonicMedia.get = function(id) {
    return mediaObjects[id];
};

/**
 * Start or resume playing audio file.
 */
NocSonicMedia.prototype.play = function(options) {
    exec(null, null, "NocSonicMedia", "startPlayingAudio", [this.id, this.src, options]);
};

/**
 * Stop playing audio file.
 */
NocSonicMedia.prototype.stop = function() {
    var me = this;
    exec(function() {
        me._position = 0;
    }, this.errorCallback, "NocSonicMedia", "stopPlayingAudio", [this.id]);
};

/**
 * Seek or jump to a new time in the track..
 */
NocSonicMedia.prototype.seekTo = function(milliseconds) {
    var me = this;
    exec(function(p) {
        me._position = p;
    }, this.errorCallback, "NocSonicMedia", "seekToAudio", [this.id, milliseconds]);
};

/**
 * Pause playing audio file.
 */
NocSonicMedia.prototype.pause = function() {
    exec(null, this.errorCallback, "NocSonicMedia", "pausePlayingAudio", [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
NocSonicMedia.prototype.getDuration = function() {
    return this._duration;
};

/**
 * Get position of audio.
 */
NocSonicMedia.prototype.getCurrentPosition = function(success, fail) {
    var me = this;
    exec(function(p) {
        me._position = p;
        success(p);
    }, fail, "NocSonicMedia", "getCurrentPositionAudio", [this.id]);
};

/**
 * Start recording audio file.
 */
NocSonicMedia.prototype.startRecord = function() {
    exec(null, this.errorCallback, "NocSonicMedia", "startRecordingAudio", [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
NocSonicMedia.prototype.stopRecord = function() {
    exec(null, this.errorCallback, "NocSonicMedia", "stopRecordingAudio", [this.id]);
};

/**
 * Release the resources.
 */
NocSonicMedia.prototype.release = function() {
    exec(null, this.errorCallback, "NocSonicMedia", "release", [this.id]);
};

/**
 * Adjust the volume.
 */
NocSonicMedia.prototype.setVolume = function(volume) {
    exec(null, null, "NocSonicMedia", "setVolume", [this.id, volume]);
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param msgType       The 'type' of update this is
 * @param value         Use of value is determined by the msgType
 */
NocSonicMedia.onStatus = function(id, msgType, value) {

    var media = mediaObjects[id];

    if(media) {
        switch(msgType) {
            case NocSonicMedia.MEDIA_STATE :
                media.statusCallback && media.statusCallback(value);
                if(value == NocSonicMedia.MEDIA_STOPPED) {
                    media.successCallback && media.successCallback();
                }
                break;
            case NocSonicMedia.MEDIA_DURATION :
                media._duration = value;
                break;
            case NocSonicMedia.MEDIA_ERROR :
                media.errorCallback && media.errorCallback(value);
                break;
            case NocSonicMedia.MEDIA_POSITION :
                media._position = Number(value);
                break;
            default :
                console.error && console.error("Unhandled NocSonicMedia.onStatus :: " + msgType);
                break;
        }
    }
    else {
         console.error && console.error("Received NocSonicMedia.onStatus callback for unknown media :: " + id);
    }

};

module.exports = NocSonicMedia;

function onMessageFromNative(msg) {
    if (msg.action == 'status') {
        NocSonicMedia.onStatus(msg.status.id, msg.status.msgType, msg.status.value);
    } else {
        throw new Error('Unknown media action' + msg.action);
    }
}

if (cordova.platformId === 'android' || cordova.platformId === 'amazon-fireos' || cordova.platformId === 'windowsphone') {

    var channel = require('cordova/channel');

    channel.createSticky('onNocSonicMediaPluginReady');
    channel.waitForInitialization('onNocSonicMediaPluginReady');

    channel.onCordovaReady.subscribe(function() {
        exec(onMessageFromNative, undefined, 'NocSonicMedia', 'messageChannel', []);
        channel.initializationComplete('onNocSonicMediaPluginReady');
    });
}
