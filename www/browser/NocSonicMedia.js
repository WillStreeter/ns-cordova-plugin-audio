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

/*global NocSonicMediaError, module, require*/

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils');

var mediaObjects = {};

/**
 * Creates new Audio node and with necessary event listeners attached
 * @param  {NocSonicMedia} media NocSonicMedia object
 * @return {Audio}       Audio element
 */
function createNode (media) {
    var node = new Audio();

    node.onloadstart = function () {
        NocSonicMedia.onStatus(media.id, NocSonicMedia.MEDIA_STATE, NocSonicMedia.MEDIA_STARTING);
    };

    node.onplaying = function () {
        NocSonicMedia.onStatus(media.id, NocSonicMedia.MEDIA_STATE, NocSonicMedia.MEDIA_RUNNING);
    };

    node.ondurationchange = function (e) {
        NocSonicMedia.onStatus(media.id, NocSonicMedia.MEDIA_DURATION, e.target.duration || -1);
    };

    node.onerror = function (e) {
        // Due to media.spec.15 It should return NocSonicMediaError for bad filename
        var err = e.target.error.code === NocSonicMediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ?
            { code: NocSonicMediaError.MEDIA_ERR_ABORTED } :
            e.target.error;

        NocSonicMedia.onStatus(media.id, NocSonicMedia.MEDIA_ERROR, err);
    };

    node.onended = function () {
        NocSonicMedia.onStatus(media.id, NocSonicMedia.MEDIA_STATE, NocSonicMedia.MEDIA_STOPPED);
    };

    if (media.src) {
        node.src = media.src;
    }

    return node;
}

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
    argscheck.checkArgs('SFFF', 'NocSonicMedia', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;

    NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_STATE, NocSonicMedia.MEDIA_STARTING);

    try {
        this.node = createNode(this);
    } catch (err) {
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, { code: NocSonicMediaError.MEDIA_ERR_ABORTED });
    }
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

/**
 * Start or resume playing audio file.
 */
NocSonicMedia.prototype.play = function() {

    // if NocSonicMedia was released, then node will be null and we need to create it again
    if (!this.node) {
        try {
            this.node = createNode(this);
        } catch (err) {
            NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, { code: NocSonicMediaError.MEDIA_ERR_ABORTED });
        }
    }

    this.node.play();
};

/**
 * Stop playing audio file.
 */
NocSonicMedia.prototype.stop = function() {
    try {
        this.pause();
        this.seekTo(0);
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_STATE, NocSonicMedia.MEDIA_STOPPED);
    } catch (err) {
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, err);
    }
};

/**
 * Seek or jump to a new time in the track..
 */
NocSonicMedia.prototype.seekTo = function(milliseconds) {
    try {
        this.node.currentTime = milliseconds / 1000;
    } catch (err) {
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, err);
    }
};

/**
 * Pause playing audio file.
 */
NocSonicMedia.prototype.pause = function() {
    try {
        this.node.pause();
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_STATE, NocSonicMedia.MEDIA_PAUSED);
    } catch (err) {
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, err);
    }};

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
    try {
        var p = this.node.currentTime;
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_POSITION, p);
        success(p);
    } catch (err) {
        fail(err);
    }
};

/**
 * Start recording audio file.
 */
NocSonicMedia.prototype.startRecord = function() {
    NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, "Not supported");
};

/**
 * Stop recording audio file.
 */
NocSonicMedia.prototype.stopRecord = function() {
    NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, "Not supported");
};

/**
 * Release the resources.
 */
NocSonicMedia.prototype.release = function() {
    try {
        delete this.node;
    } catch (err) {
        NocSonicMedia.onStatus(this.id, NocSonicMedia.MEDIA_ERROR, err);
    }};

/**
 * Adjust the volume.
 */
NocSonicMedia.prototype.setVolume = function(volume) {
    this.node.volume = volume;
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
                if(value === NocSonicMedia.MEDIA_STOPPED) {
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
    } else {
         console.error && console.error("Received NocSonicMedia.onStatus callback for unknown media :: " + id);
    }
};

module.exports = NocSonicMedia;
