/*jslint devel: false, node: true, nomen: true, vars: true */

"use strict";
var _ = require("underscore");

function APRSPositionReport(construct) {
    var defaults = {
        raw: '',
        timeStamp: '',
        call: '',
        position: {},
        message: {},
        speed: 0,
        direction: 0,
        altitude: 0
    };

    _.extend(this, _.defaults(construct, defaults));
}

function APRSPacketParser() {
    // Retrieve the station's callsign from the raw packet
    var extractCall = function (packet) {
        return packet.split(">")[0];
    };

    //Retrieve the message section from the raw packet
    var extractMessage = function (packet) {
        if (packet) {
            var message = packet.split(":")[1];
            return message ? {
                text: message,
                type: message.charAt(0)
            } : {};
        }
    };

    //Create a timestamp from the time in the raw packet if one exists
    var extractTimestamp = function (message) {
        var ts = new Date();

        try {
            var text = message.text;
            if (message.type === '@') {
                 // There are 3 different time formats that can be used
                 // We are only dealing with Day/Hour/Minutes in either
                 // zulu or local time (not with month/day/hour/minute)
                if (text.charAt(7) === 'z') {
                    ts.setUTCDate(parseInt(text.substr(1, 2), 10));
                    ts.setUTCHours(parseInt(text.substr(3, 2), 10));
                    ts.setUTCMinutes(parseInt(text.substr(5, 2), 10));
                    ts.setUTCMilliseconds(0);
                } else if (text.charAt(6) === 'l') {
                    ts.setDate(parseInt(text.substr(1, 2), 10));
                    ts.setHours(parseInt(text.substr(3, 2), 10));
                    ts.setMinutes(parseInt(text.substr(5, 2), 10));
                    ts.setMilliseconds(0);
                }
            }
        } catch (ignore) {}
        return ts;
    };

    //Extract the latitude/longitude from the raw packet
    var extractPosition = function (message) {
        var latitude, longitude, parallel, meridian,
            text = message.text;

        try {

            var txtLat = text.split("/")[0];
            var txtLon = text.split("/")[1];
            var par = txtLat.charAt(txtLat.length - 1);
            var mer = txtLon.charAt(8);

            txtLat = txtLat.slice(txtLat.length - 8, txtLat.length);
            txtLon = txtLon.slice(0, 9);

            var latDegrees = parseFloat(txtLat.substr(0, 2));
            var latMinutes = parseFloat(txtLat.substr(2, 5));

            var lonDegrees = parseFloat(txtLon.substr(0, 3));
            var lonMinutes = parseFloat(txtLon.substr(3, 5));


            latitude = latDegrees + (latMinutes / 60);
            parallel = par;
            if (par === "S") {
                latitude = latitude * -1;
            }
            longitude = lonDegrees + (lonMinutes / 60);
            meridian = mer;
            if (mer === "W") {
                longitude = longitude * -1;
            }

        } catch (e) {
            latitude = 0;
            longitude = 0;
        }

        return {
            latitude: latitude,
            longitude: longitude,
            parallel: parallel,
            meridian: meridian
        };
    };

    //Extract the altitude from the raw packet if one exists
    var extractAltitude = function (message) {
        var altitude, text = message.text;
        try {
            var startAlt = text.indexOf("/A=");
            if (startAlt > 0) {
                var txtAlt = text.substr(startAlt + 3, 6);
                altitude = parseInt(txtAlt, 10);

            }

        } catch (ignore) {}
        return altitude;
    };

    //Parsing messages setup and retrieval
    var messages = {
        unknown: 'Unsupported packet format',
        packet_no: 'No packet given to parse',
        packet_short: 'Too short packet',
        packet_nobody: 'No body in packet',
        srccall_noax25: 'Source callsign is not a valid AX.25 call',
        srccall_badchars: 'Source callsign contains bad characters',
        dstpath_toomany: 'Too many destination path components to be AX.25',
        dstcall_none: 'No destination field in packet',
        dstcall_noax25: 'Destination callsign is not a valid AX.25 call',
        digicall_noax25: 'Digipeater callsign is not a valid AX.25 call',
        digicall_badchars: 'Digipeater callsign contains bad characters',
        timestamp_inv_loc: 'Invalid timestamp in location',
        timestamp_inv_obj: 'Invalid timestamp in object',
        timestamp_inv_sta: 'Invalid timestamp in status',
        timestamp_inv_gpgga: 'Invalid timestamp in GPGGA sentence',
        timestamp_inv_gpgll: 'Invalid timestamp in GPGLL sentence',
        packet_invalid: 'Invalid packet',
        nmea_inv_cval: 'Invalid coordinate value in NMEA sentence',
        nmea_large_ew: 'Too large value in NMEA sentence (east/west)',
        nmea_large_ns: 'Too large value in NMEA sentence (north/south)',
        nmea_inv_sign: 'Invalid lat/long sign in NMEA sentence',
        nmea_inv_cksum: 'Invalid checksum in NMEA sentence',
        gprmc_fewfields: 'Less than ten fields in GPRMC sentence ',
        gprmc_nofix: 'No GPS fix in GPRMC sentence',
        gprmc_inv_time: 'Invalid timestamp in GPRMC sentence',
        gprmc_inv_date: 'Invalid date in GPRMC sentence',
        gprmc_date_out: 'GPRMC date does not fit in an Unix timestamp',
        gpgga_fewfields: 'Less than 11 fields in GPGGA sentence',
        gpgga_nofix: 'No GPS fix in GPGGA sentence',
        gpgll_fewfields: 'Less than 5 fields in GPGLL sentence',
        gpgll_nofix: 'No GPS fix in GPGLL sentence',
        nmea_unsupp: 'Unsupported NMEA sentence type',
        obj_short: 'Too short object',
        obj_inv: 'Invalid object',
        obj_dec_err: 'Error in object location decoding',
        item_short: 'Too short item',
        item_inv: 'Invalid item',
        item_dec_err: 'Error in item location decoding',
        loc_short: 'Too short uncompressed location',
        loc_inv: 'Invalid uncompressed location',
        loc_large: 'Degree value too large',
        loc_amb_inv: 'Invalid position ambiguity',
        mice_short: 'Too short mic-e packet',
        mice_inv: 'Invalid characters in mic-e packet',
        mice_inv_info: 'Invalid characters in mic-e information field',
        mice_amb_large: 'Too much position ambiguity in mic-e packet',
        mice_amb_inv: 'Invalid position ambiguity in mic-e packet',
        mice_amb_odd: 'Odd position ambiguity in mic-e packet',
        comp_inv: 'Invalid compressed packet',
        msg_inv: 'Invalid message packet',
        wx_unsupp: 'Unsupported weather format',
        user_unsupp: 'Unsupported user format',
        dx_inv_src: 'Invalid DX spot source callsign',
        dx_inf_freq: 'Invalid DX spot frequency',
        dx_no_dx: 'No DX spot callsign found',
        tlm_inv: 'Invalid telemetry packet',
        tlm_large: 'Too large telemetry value',
        tlm_unsupp: 'Unsupported telemetry',
        exp_unsupp: 'Unsupported experimental',
        sym_inv_table: 'Invalid symbol table or overlay'
    };

    var getMessage = function (msgName) {
        return messages[msgName];
    };

    var parse = function (packet) {
        var message = extractMessage(packet);
        return new APRSPositionReport({
            raw: packet,
            call: extractCall(packet),
            message: extractMessage(packet),
            timestamp: extractTimestamp(message),
            position: extractPosition(message),
            altitude: extractAltitude(message)
        });
    };

    return {
        parse: parse,
        getMessage: getMessage
    };
}

module.exports = new APRSPacketParser();