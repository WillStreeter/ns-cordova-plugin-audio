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
var NSmedia = function(src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('sFFF', 'NSmedia', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;
    exec(null, this.errorCallback, "NSmedia", "create", [this.id, this.src]);
};

// NSmedia messages
NSmedia.MEDIA_STATE = 1;
NSmedia.MEDIA_DURATION = 2;
NSmedia.MEDIA_POSITION = 3;
NSmedia.MEDIA_ERROR = 9;

// NSmedia states
NSmedia.MEDIA_NONE = 0;
NSmedia.MEDIA_STARTING = 1;
NSmedia.MEDIA_RUNNING = 2;
NSmedia.MEDIA_PAUSED = 3;
NSmedia.MEDIA_STOPPED = 4;
NSmedia.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped"];

// "static" function to return existing objs.
NSmedia.get = function(id) {
    return mediaObjects[id];
};

/**
 * Start or resume playing audio file.
 */
NSmedia.prototype.play = function(options) {
    exec(null, null, "NSmedia", "startPlayingAudio", [this.id, this.src, options]);
};

/**
 * Stop playing audio file.
 */
NSmedia.prototype.stop = function() {
    var me = this;
    exec(function() {
        me._position = 0;
    }, this.errorCallback, "NSmedia", "stopPlayingAudio", [this.id]);
};

/**
 * Seek or jump to a new time in the track..
 */
NSmedia.prototype.seekTo = function(milliseconds) {
    var me = this;
    exec(function(p) {
        me._position = p;
    }, this.errorCallback, "NSmedia", "seekToAudio", [this.id, milliseconds]);
};

/**
 * Pause playing audio file.
 */
NSmedia.prototype.pause = function() {
    exec(null, this.errorCallback, "NSmedia", "pausePlayingAudio", [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
NSmedia.prototype.getDuration = function() {
    return this._duration;
};

/**
 * Get position of audio.
 */
NSmedia.prototype.getCurrentPosition = function(success, fail) {
    var me = this;
    exec(function(p) {
        me._position = p;
        success(p);
    }, fail, "NSmedia", "getCurrentPositionAudio", [this.id]);
};

/**
 * Start recording audio file.
 */
NSmedia.prototype.startRecord = function() {
    exec(null, this.errorCallback, "NSmedia", "startRecordingAudio", [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
NSmedia.prototype.stopRecord = function() {
    exec(null, this.errorCallback, "NSmedia", "stopRecordingAudio", [this.id]);
};

/**
 * Release the resources.
 */
NSmedia.prototype.release = function() {
    exec(null, this.errorCallback, "NSmedia", "release", [this.id]);
};

/**
 * Adjust the volume.
 */
NSmedia.prototype.setVolume = function(volume) {
    exec(null, null, "NSmedia", "setVolume", [this.id, volume]);
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param msgType       The 'type' of update this is
 * @param value         Use of value is determined by the msgType
 */
NSmedia.onStatus = function(id, msgType, value) {

    var media = mediaObjects[id];

    if(media) {
        switch(msgType) {
            case NSmedia.MEDIA_STATE :
                media.statusCallback && media.statusCallback(value);
                if(value == NSmedia.MEDIA_STOPPED) {
                    media.successCallback && media.successCallback();
                }
                break;
            case NSmedia.MEDIA_DURATION :
                media._duration = value;
                break;
            case NSmedia.MEDIA_ERROR :
                media.errorCallback && media.errorCallback(value);
                break;
            case NSmedia.MEDIA_POSITION :
                media._position = Number(value);
                break;
            default :
                console.error && console.error("Unhandled NSmedia.onStatus :: " + msgType);
                break;
        }
    }
    else {
         console.error && console.error("Received NSmedia.onStatus callback for unknown media :: " + id);
    }

};

module.exports = NSmedia;

function onMessageFromNative(msg) {
    if (msg.action == 'status') {
        NSmedia.onStatus(msg.status.id, msg.status.msgType, msg.status.value);
    } else {
        throw new Error('Unknown media action' + msg.action);
    }
}

if (cordova.platformId === 'android' || cordova.platformId === 'amazon-fireos' || cordova.platformId === 'windowsphone') {

    var channel = require('cordova/channel');

    channel.createSticky('onNSmediaPluginReady');
    channel.waitForInitialization('onNSmediaPluginReady');

    channel.onCordovaReady.subscribe(function() {
        exec(onMessageFromNative, undefined, 'NSmedia', 'messageChannel', []);
        channel.initializationComplete('onNSmediaPluginReady');
    });
}
