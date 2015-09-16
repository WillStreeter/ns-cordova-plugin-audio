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

/*global NSmediaError, module, require*/

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils');

var mediaObjects = {};

/**
 * Creates new Audio node and with necessary event listeners attached
 * @param  {NSmedia} media NSmedia object
 * @return {Audio}       Audio element
 */
function createNode (media) {
    var node = new Audio();

    node.onloadstart = function () {
        NSmedia.onStatus(media.id, NSmedia.MEDIA_STATE, NSmedia.MEDIA_STARTING);
    };

    node.onplaying = function () {
        NSmedia.onStatus(media.id, NSmedia.MEDIA_STATE, NSmedia.MEDIA_RUNNING);
    };

    node.ondurationchange = function (e) {
        NSmedia.onStatus(media.id, NSmedia.MEDIA_DURATION, e.target.duration || -1);
    };

    node.onerror = function (e) {
        // Due to media.spec.15 It should return NSmediaError for bad filename
        var err = e.target.error.code === NSmediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ?
            { code: NSmediaError.MEDIA_ERR_ABORTED } :
            e.target.error;

        NSmedia.onStatus(media.id, NSmedia.MEDIA_ERROR, err);
    };

    node.onended = function () {
        NSmedia.onStatus(media.id, NSmedia.MEDIA_STATE, NSmedia.MEDIA_STOPPED);
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
var NSmedia = function(src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('SFFF', 'NSmedia', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;

    NSmedia.onStatus(this.id, NSmedia.MEDIA_STATE, NSmedia.MEDIA_STARTING);

    try {
        this.node = createNode(this);
    } catch (err) {
        NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, { code: NSmediaError.MEDIA_ERR_ABORTED });
    }
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

/**
 * Start or resume playing audio file.
 */
NSmedia.prototype.play = function() {

    // if NSmedia was released, then node will be null and we need to create it again
    if (!this.node) {
        try {
            this.node = createNode(this);
        } catch (err) {
            NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, { code: NSmediaError.MEDIA_ERR_ABORTED });
        }
    }

    this.node.play();
};

/**
 * Stop playing audio file.
 */
NSmedia.prototype.stop = function() {
    try {
        this.pause();
        this.seekTo(0);
        NSmedia.onStatus(this.id, NSmedia.MEDIA_STATE, NSmedia.MEDIA_STOPPED);
    } catch (err) {
        NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, err);
    }
};

/**
 * Seek or jump to a new time in the track..
 */
NSmedia.prototype.seekTo = function(milliseconds) {
    try {
        this.node.currentTime = milliseconds / 1000;
    } catch (err) {
        NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, err);
    }
};

/**
 * Pause playing audio file.
 */
NSmedia.prototype.pause = function() {
    try {
        this.node.pause();
        NSmedia.onStatus(this.id, NSmedia.MEDIA_STATE, NSmedia.MEDIA_PAUSED);
    } catch (err) {
        NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, err);
    }};

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
    try {
        var p = this.node.currentTime;
        NSmedia.onStatus(this.id, NSmedia.MEDIA_POSITION, p);
        success(p);
    } catch (err) {
        fail(err);
    }
};

/**
 * Start recording audio file.
 */
NSmedia.prototype.startRecord = function() {
    NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, "Not supported");
};

/**
 * Stop recording audio file.
 */
NSmedia.prototype.stopRecord = function() {
    NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, "Not supported");
};

/**
 * Release the resources.
 */
NSmedia.prototype.release = function() {
    try {
        delete this.node;
    } catch (err) {
        NSmedia.onStatus(this.id, NSmedia.MEDIA_ERROR, err);
    }};

/**
 * Adjust the volume.
 */
NSmedia.prototype.setVolume = function(volume) {
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
NSmedia.onStatus = function(id, msgType, value) {

    var media = mediaObjects[id];

    if(media) {
        switch(msgType) {
            case NSmedia.MEDIA_STATE :
                media.statusCallback && media.statusCallback(value);
                if(value === NSmedia.MEDIA_STOPPED) {
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
    } else {
         console.error && console.error("Received NSmedia.onStatus callback for unknown media :: " + id);
    }
};

module.exports = NSmedia;
